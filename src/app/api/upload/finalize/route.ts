// POST /api/upload/finalize
// Records a book after the browser has uploaded it straight to Cloudinary
// (see /api/upload/presign). The Cloudinary counterpart of POST /api/books.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getBookModel } from "@/lib/models/bookModel";
import { getCloudinaryPdf } from "@/lib/cloudinary";
import { CLOUDINARY_MAX_SIZE } from "@/lib/storageRouter";
import { isOwnCloudinaryId } from "@/lib/uploads";
import { toBookDto, type BookDoc } from "@/lib/dto/book";
import { resolveBookAcademic, type BookAcademicBody } from "@/lib/submissions";

interface FinalizeBody extends BookAcademicBody {
  publicId: string;
  title: string;
  description: string;
  tags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "upload");
    enforceRateLimit(request, `finalize:${session.userId}`, 20);

    const body = await readJson<FinalizeBody>(request);
    const publicId = asTrimmedString(body?.publicId, 400);
    const title = asTrimmedString(body?.title, 300);
    const description = asTrimmedString(body?.description, 2000);
    const tags = Array.isArray(body?.tags)
      ? body.tags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 6)
      : [];

    if (!title || !publicId) {
      return NextResponse.json(
        { message: "title and publicId are required." },
        { status: 400 },
      );
    }

    // The ID must be one issued to this user by /api/upload/presign, so a
    // user can't claim (and later delete) someone else's file.
    if (!isOwnCloudinaryId(publicId, session.userId)) {
      return NextResponse.json({ message: "Invalid publicId." }, { status: 400 });
    }

    // Trust Cloudinary, not the client, for size, type and page count.
    let pdf;
    try {
      pdf = await getCloudinaryPdf(publicId);
    } catch (error) {
      console.error("upload/finalize: Cloudinary lookup failed:", error);
      return NextResponse.json(
        { message: "Storage is unavailable. Please try again." },
        { status: 502 },
      );
    }
    if (!pdf) {
      return NextResponse.json(
        { message: "Upload not found. Upload the file first." },
        { status: 400 },
      );
    }
    if (pdf.format !== "pdf" || pdf.bytes > CLOUDINARY_MAX_SIZE) {
      return NextResponse.json(
        { message: "Uploaded file is not an accepted PDF." },
        { status: 400 },
      );
    }

    const academic = await resolveBookAcademic(body);

    const Book = await getBookModel();
    const doc = await Book.create({
      ...academic,
      title,
      description: description || undefined,
      tags,
      storageKey: publicId,
      storageProvider: "cloudinary",
      cloudinaryPublicId: publicId,
      fileUrl: pdf.secureUrl,
      fileSize: pdf.bytes,
      mimeType: "application/pdf",
      pageCount: pdf.pageCount,
      uploaderId: session.userId,
      ownerUpid: session.upid,
      status: "pending",
      visibility: "private",
    });

    return NextResponse.json(
      { book: toBookDto(doc.toObject() as BookDoc) },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { message: "This upload has already been saved." },
        { status: 409 },
      );
    }
    return handleRouteError(error, "upload/finalize");
  }
}
