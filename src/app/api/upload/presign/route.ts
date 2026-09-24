// POST /api/upload/presign
// Signs a direct browser upload so the PDF never passes through a Next.js
// function. Files up to 10 MB go to Cloudinary (signed multipart POST, then
// /api/upload/finalize); larger ones get a signed B2 PUT URL (then
// POST /api/books). The object key is chosen here, under the caller's prefix.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { storageClient } from "@/lib/storage";
import { createSignedPdfUpload } from "@/lib/cloudinary";
import { getStorageProvider } from "@/lib/storageRouter";
import {
  BOOK_ALLOWED_MIME_TYPES,
  BOOK_MAX_FILE_SIZE,
  PRESIGN_EXPIRES_SECONDS,
  bookKeyPrefix,
  cloudinaryBookPrefix,
} from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "upload");
    enforceRateLimit(request, `presign:${session.userId}`, 20);

    const body = await readJson<{
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>(request);
    const fileName = asTrimmedString(body?.fileName, 255);
    const fileSize = typeof body?.fileSize === "number" ? body.fileSize : NaN;
    const mimeType = asTrimmedString(body?.mimeType, 100);

    if (!fileName) {
      return NextResponse.json({ message: "fileName is required." }, { status: 400 });
    }
    if (!(BOOK_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return NextResponse.json(
        { message: "Only PDF files are supported right now." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > BOOK_MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "File must be between 1 byte and 500 MB." },
        { status: 400 },
      );
    }

    const uniqueName = storageClient.generateUniqueFileName(fileName);

    if (getStorageProvider(fileSize) === "cloudinary") {
      // Cloudinary adds the extension itself, so the public ID has none
      const publicId =
        cloudinaryBookPrefix(session.userId) +
        uniqueName.replace(/\.[^.]*$/, "").replace(/\./g, "_");
      const signed = createSignedPdfUpload(publicId);
      return NextResponse.json({
        provider: "cloudinary",
        uploadUrl: signed.uploadUrl,
        fields: signed.fields,
        publicId: signed.publicId,
      });
    }

    const storageKey = bookKeyPrefix(session.userId) + uniqueName;

    const result = await storageClient.generatePresignedUploadUrl(
      storageKey,
      mimeType,
      fileSize,
      PRESIGN_EXPIRES_SECONDS,
    );
    if (!result.success || !result.uploadUrl) {
      console.error("presign: failed to sign upload URL:", result.error);
      return NextResponse.json(
        { message: "Storage is unavailable. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      provider: "backblaze",
      uploadUrl: result.uploadUrl,
      storageKey,
      expiresIn: PRESIGN_EXPIRES_SECONDS,
    });
  } catch (error) {
    return handleRouteError(error, "presign");
  }
}
