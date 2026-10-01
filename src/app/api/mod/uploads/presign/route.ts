// POST /api/mod/uploads/presign   { fileName, fileSize, checksum }
// Signs a direct browser upload of one platform PDF to Backblaze (always B2,
// whatever the size). The browser then PUTs the file and calls
// POST /api/mod/uploads. `checksum` is the SHA-256 of the file being uploaded;
// a file that's already in the queue or published is refused as a duplicate.
// Permission: "material.ingest".
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { storageClient } from "@/lib/storage";
import { getBookModel } from "@/lib/models/bookModel";
import {
  PLATFORM_MAX_FILE_SIZE,
  PLATFORM_PRESIGN_SECONDS,
  isSha256,
  platformKeyPrefix,
} from "@/lib/platformUploads";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "material.ingest");
    // Bulk uploads sign one URL per file, so use the roomier staff limiter
    await enforceRateLimit(request, "admin", `platform-presign:${session.userId}`);

    const body = await readJson<{ fileName: string; fileSize: number; checksum: string }>(request);
    const fileName = asTrimmedString(body?.fileName, 255);
    const fileSize = typeof body?.fileSize === "number" ? body.fileSize : NaN;
    const checksum = body?.checksum;

    if (!fileName || !/\.pdf$/i.test(fileName)) {
      return NextResponse.json({ message: "Only PDF files can be uploaded." }, { status: 400 });
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > PLATFORM_MAX_FILE_SIZE) {
      return NextResponse.json({ message: "File must be between 1 byte and 500 MB." }, { status: 400 });
    }
    if (!isSha256(checksum)) {
      return NextResponse.json({ message: "checksum must be a SHA-256 hex string." }, { status: 400 });
    }

    const Book = await getBookModel();
    const duplicate = await Book.findOne({
      checksum,
      platform: { $exists: true },
      "platform.status": { $ne: "discarded" },
    })
      .select("title platform.status")
      .lean();
    if (duplicate) {
      return NextResponse.json(
        {
          message: `This PDF is already ${duplicate.platform?.status === "published" ? "published" : "in the queue"} as "${duplicate.title}".`,
          duplicateOf: { id: String(duplicate._id), title: duplicate.title, status: duplicate.platform?.status },
        },
        { status: 409 },
      );
    }

    const storageKey = platformKeyPrefix(session.userId) + storageClient.generateUniqueFileName(fileName);
    const signed = await storageClient.generatePresignedUploadUrl(
      storageKey,
      "application/pdf",
      fileSize,
      PLATFORM_PRESIGN_SECONDS,
    );
    if (!signed.success || !signed.uploadUrl) {
      console.error("platform presign: failed to sign upload URL:", signed.error);
      return NextResponse.json({ message: "Storage is unavailable. Please try again." }, { status: 502 });
    }
    return NextResponse.json({
      uploadUrl: signed.uploadUrl,
      storageKey,
      expiresIn: PLATFORM_PRESIGN_SECONDS,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/mod/uploads/presign");
  }
}
