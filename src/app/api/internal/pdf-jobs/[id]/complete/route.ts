// POST /api/internal/pdf-jobs/[id]/complete   (signed by the PDF worker)
// Body, on success:
//   { ok: true, pageCount, pageImages: { count, width }, compressedSize? }
// (compressedSize only when the worker replaced the PDF with a smaller one)
// or, on failure: { ok: false, error }
//
// Records the result on the Book (and the sizes / page count on its
// published Material, if any). A failure goes back in the queue until the
// job runs out of attempts. Only a job that's currently being processed can
// be completed, so a late report from an abandoned lease is ignored.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { handleRouteError } from "@/lib/api";
import { getBookModel } from "@/lib/models/bookModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import { PDF_JOB_MAX_ATTEMPTS, pageImagePrefix, verifyWorkerRequest } from "@/lib/pdfJobs";
import { storageClient } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

const MAX_PAGES = 100_000;
const posInt = (v: unknown, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v > 0 && v <= max ? v : null;

export async function POST(request: NextRequest, context: Context) {
  try {
    const auth = await verifyWorkerRequest(request);
    if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
    const { id } = await context.params;
    if (!isValidObjectId(id)) return NextResponse.json({ message: "Job not found." }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(auth.body) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ message: "Invalid JSON." }, { status: 400 });
    }

    const Book = await getBookModel();
    const book = await Book.findOne({ _id: id, "pdfJob.status": "processing" })
      .select("fileSize pageCount pdfJob platform storageKey")
      .lean();
    if (!book?.pdfJob) return NextResponse.json({ message: "No job in progress for this book." }, { status: 409 });
    const now = new Date();

    if (body.ok !== true) {
      const error = (typeof body.error === "string" ? body.error : "Unknown error").slice(0, 500);
      const retry = book.pdfJob.attempts < PDF_JOB_MAX_ATTEMPTS;
      await Book.updateOne(
        { _id: id, "pdfJob.status": "processing" },
        {
          $set: {
            "pdfJob.status": retry ? "queued" : "failed",
            "pdfJob.error": error,
            ...(retry ? {} : { "pdfJob.finishedAt": now }),
          },
          $unset: { "pdfJob.leaseUntil": "" },
        },
      );
      return NextResponse.json({ status: retry ? "queued" : "failed" });
    }

    const pageCount = posInt(body.pageCount, MAX_PAGES);
    const images = body.pageImages as { count?: unknown; width?: unknown } | undefined;
    const imageCount = posInt(images?.count, MAX_PAGES);
    const imageWidth = posInt(images?.width, 10_000);
    if (!pageCount || !imageCount || !imageWidth || imageCount !== pageCount) {
      return NextResponse.json({ message: "pageCount and pageImages { count, width } are required." }, { status: 400 });
    }
    // Discarded while the worker was busy: what it just wrote is orphaned
    if (book.platform?.status === "discarded") {
      await storageClient.deleteFile(book.storageKey).catch(() => undefined);
      await storageClient.deleteFilesByPrefix(pageImagePrefix(id)).catch(() => undefined);
      await Book.updateOne({ _id: id }, { $set: { "pdfJob.status": "failed", "pdfJob.error": "Discarded" }, $unset: { "pdfJob.leaseUntil": "" } });
      return NextResponse.json({ status: "discarded" });
    }

    // Compression is only ever accepted for platform files, and only smaller
    const compressedSize = posInt(body.compressedSize, 2 * 1024 ** 3);
    const replaced = !!compressedSize && book.pdfJob.compress && !!book.platform && compressedSize < book.fileSize;

    const set: Record<string, unknown> = {
      "pdfJob.status": "done",
      "pdfJob.finishedAt": now,
      pageImages: { count: imageCount, width: imageWidth, createdAt: now },
      pageCount,
    };
    if (replaced) {
      set.fileSize = compressedSize;
      set["pdfJob.originalSize"] = book.fileSize;
      set["pdfJob.compressedSize"] = compressedSize;
    }
    await Book.updateOne(
      { _id: id, "pdfJob.status": "processing" },
      { $set: set, $unset: { "pdfJob.leaseUntil": "", "pdfJob.error": "" } },
    );

    // A published copy shows the real size and page count
    await (await getMaterialModel()).updateMany(
      { bookId: id },
      { $set: { pageCount, ...(replaced ? { fileSize: compressedSize } : {}) } },
    );

    return NextResponse.json({ status: "done", compressed: replaced });
  } catch (error) {
    return handleRouteError(error, "POST /api/internal/pdf-jobs/[id]/complete");
  }
}
