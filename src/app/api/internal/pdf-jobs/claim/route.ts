// POST /api/internal/pdf-jobs/claim   (signed by the PDF worker; body "{}")
// Hands the worker the oldest queued Backblaze PDF, or one whose previous
// lease ran out, and leases it for PDF_JOB_LEASE_MS. Jobs that have used up
// their attempts are marked failed instead. Responds { job: null } when
// there's nothing to do. See lib/pdfJobs.ts.
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/lib/api";
import { getBookModel } from "@/lib/models/bookModel";
import { PDF_JOB_LEASE_MS, PDF_JOB_MAX_ATTEMPTS, verifyWorkerRequest } from "@/lib/pdfJobs";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyWorkerRequest(request);
    if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

    const now = new Date();
    const Book = await getBookModel();

    // Abandoned after the last attempt: give up rather than loop forever
    await Book.updateMany(
      {
        "pdfJob.status": "processing",
        "pdfJob.leaseUntil": { $lt: now },
        "pdfJob.attempts": { $gte: PDF_JOB_MAX_ATTEMPTS },
      },
      {
        $set: {
          "pdfJob.status": "failed",
          "pdfJob.finishedAt": now,
          "pdfJob.error": "The worker stopped responding on every attempt.",
        },
        $unset: { "pdfJob.leaseUntil": "" },
      },
    );

    const book = await Book.findOneAndUpdate(
      {
        storageProvider: "backblaze",
        "pdfJob.attempts": { $lt: PDF_JOB_MAX_ATTEMPTS },
        $or: [
          { "pdfJob.status": "queued" },
          { "pdfJob.status": "processing", "pdfJob.leaseUntil": { $lt: now } },
        ],
      },
      {
        $set: {
          "pdfJob.status": "processing",
          "pdfJob.leaseUntil": new Date(now.getTime() + PDF_JOB_LEASE_MS),
        },
        $inc: { "pdfJob.attempts": 1 },
      },
      {
        sort: { "pdfJob.queuedAt": 1 },
        returnDocument: "after",
        projection: { storageKey: 1, pageCount: 1, fileSize: 1, pdfJob: 1, platform: 1 },
      },
    ).lean();

    if (!book) return NextResponse.json({ job: null });
    return NextResponse.json({
      job: {
        id: String(book._id),
        storageKey: book.storageKey,
        fileSize: book.fileSize,
        pageCount: book.pageCount ?? null,
        // Only platform files are ever compressed; students' own files stay as uploaded
        compress: !!book.pdfJob?.compress && !!book.platform,
        attempt: book.pdfJob?.attempts ?? 1,
        leaseMs: PDF_JOB_LEASE_MS,
      },
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/internal/pdf-jobs/claim");
  }
}
