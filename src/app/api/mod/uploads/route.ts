// /api/mod/uploads — the staff upload queue. Permission: "material.ingest".
//
// POST { storageKey, fileName, checksum, originalSize, pageCount? }
//   Records a platform PDF after the browser has uploaded it to Backblaze
//   (see ./presign). Size and type come from the bucket, not the client.
//
// GET ?scope=mine|all|gifts&status=pending|published|discarded&page=
//   A page of the queue, oldest first for pending files (newest first
//   otherwise), plus pending counts for each tab the viewer can see.
//   mine: the viewer's own uploads; all: every staff upload (admins);
//   gifts: PDFs students gifted (admins with "material.review_gifts").
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { storageClient } from "@/lib/storage";
import { newPdfJob } from "@/lib/pdfJobs";
import { getBookModel, PLATFORM_STATUSES, type PlatformStatus } from "@/lib/models/bookModel";
import { upsertUnverifiedFromPlatformBook } from "@/lib/materialPublish";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import {
  PLATFORM_MAX_FILE_SIZE,
  isOwnPlatformKey,
  isSha256,
  queueFilter,
  toPlatformFileDto,
  type PlatformBookDoc,
  type QueueScope,
} from "@/lib/platformUploads";

const PAGE_SIZE = 20;

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "material.ingest");
    await enforceRateLimit(request, "admin", `platform-finalize:${session.userId}`);

    const body = await readJson<{
      storageKey: string;
      fileName: string;
      checksum: string;
      originalSize: number;
      pageCount: number;
    }>(request);
    const storageKey = asTrimmedString(body?.storageKey, 500);
    const fileName = asTrimmedString(body?.fileName, 255);
    const checksum = body?.checksum;
    const originalSize =
      typeof body?.originalSize === "number" && Number.isInteger(body.originalSize) && body.originalSize > 0
        ? body.originalSize
        : null;
    const pageCount =
      typeof body?.pageCount === "number" && Number.isInteger(body.pageCount) && body.pageCount > 0
        ? body.pageCount
        : undefined;

    if (!fileName || !isSha256(checksum) || !originalSize) {
      return NextResponse.json(
        { message: "fileName, checksum and originalSize are required." },
        { status: 400 },
      );
    }
    // Only a key issued to this user by ./presign: no claiming other objects
    if (!isOwnPlatformKey(storageKey, session.userId)) {
      return NextResponse.json({ message: "Invalid storageKey." }, { status: 400 });
    }

    const head = await storageClient.fileExists(storageKey);
    if (head.error) {
      console.error("platform finalize: storage lookup failed:", head.error);
      return NextResponse.json({ message: "Storage is unavailable. Please try again." }, { status: 502 });
    }
    if (!head.exists || !head.fileInfo) {
      return NextResponse.json({ message: "Upload not found. Upload the file first." }, { status: 400 });
    }
    const { size, contentType } = head.fileInfo;
    if (contentType !== "application/pdf" || size <= 0 || size > PLATFORM_MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Uploaded file is not an accepted PDF." }, { status: 400 });
    }

    const Book = await getBookModel();
    // Checked again here: two tabs could have signed the same file at once
    const duplicate = await Book.exists({
      checksum,
      platform: { $exists: true },
      "platform.status": { $ne: "discarded" },
    });
    if (duplicate) {
      await storageClient.deleteFile(storageKey).catch(() => undefined);
      return NextResponse.json({ message: "This PDF is already in the queue." }, { status: 409 });
    }

    const title = fileName.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim().slice(0, 300) || "Untitled PDF";
    const doc = await Book.create({
      title,
      fileUrl: storageClient.getPublicUrl(storageKey),
      storageKey,
      storageProvider: "backblaze",
      fileSize: size,
      pageCount,
      mimeType: "application/pdf",
      checksum,
      uploaderId: session.userId,
      ownerUpid: session.upid,
      status: "pending",
      visibility: "private",
      // Compression and page images by the PDF worker
      pdfJob: newPdfJob(true),
      platform: {
        source: "mod_upload",
        status: "pending",
        uploadedBy: session.userId,
        uploadedByUpid: session.upid,
        originalFileName: fileName,
        originalSize: Math.max(originalSize, size),
      },
    });

    // Listed in the UniLibrary at once as an unidentified PDF
    await upsertUnverifiedFromPlatformBook(doc.toObject() as PlatformBookDoc);

    return NextResponse.json(
      { file: toPlatformFileDto(doc.toObject() as PlatformBookDoc, session.userId) },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ message: "This upload has already been saved." }, { status: 409 });
    }
    return handleRouteError(error, "POST /api/mod/uploads");
  }
}

const SCOPES: QueueScope[] = ["mine", "all", "gifts"];

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(request, "material.ingest");
    const params = request.nextUrl.searchParams;
    const scope = (params.get("scope") ?? "mine") as QueueScope;
    const status = (params.get("status") ?? "pending") as PlatformStatus;
    if (!SCOPES.includes(scope) || !(PLATFORM_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ message: "Unknown scope or status." }, { status: 400 });
    }
    const filter = queueFilter(session, scope, status);
    if (!filter) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);

    const Book = await getBookModel();
    const [docs, total, ...pendingCounts] = await Promise.all([
      Book.find(filter)
        .sort({ createdAt: status === "pending" ? 1 : -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean<PlatformBookDoc[]>(),
      Book.countDocuments(filter),
      ...SCOPES.map((s) => {
        const f = queueFilter(session, s, "pending");
        return f ? Book.countDocuments(f) : Promise.resolve(null);
      }),
    ]);

    // Readers' suggestions on each file's unverified listing
    const listed = await (await getMaterialModel())
      .find({ bookId: { $in: docs.map((d) => d._id) }, status: "unverified" })
      .select("_id bookId")
      .lean();
    const suggestionCounts = await (await getMaterialSuggestionModel()).aggregate<{ _id: unknown; count: number }>([
      { $match: { materialId: { $in: listed.map((m) => m._id) }, status: "pending" } },
      { $group: { _id: "$materialId", count: { $sum: 1 } } },
    ]);
    const countByMaterial = new Map(suggestionCounts.map((c) => [String(c._id), c.count]));
    const countByBook = new Map(listed.map((m) => [String(m.bookId), countByMaterial.get(String(m._id)) ?? 0]));

    const now = new Date();
    return NextResponse.json(
      {
        files: docs.map((d) => {
          const dto = toPlatformFileDto(d, session.userId, now);
          const count = countByBook.get(String(d._id));
          return count ? { ...dto, suggestionCount: count } : dto;
        }),
        total,
        page,
        pageSize: PAGE_SIZE,
        // null for tabs this viewer can't open
        pending: Object.fromEntries(SCOPES.map((s, i) => [s, pendingCounts[i]])),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/mod/uploads");
  }
}
