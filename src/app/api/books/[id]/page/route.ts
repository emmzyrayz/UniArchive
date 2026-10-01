// GET /api/books/[id]/page?page=N
// Signed image URL for one page of a book (owner, or a reviewer once it's
// submitted — see lib/bookAccess): rendered by Cloudinary for Cloudinary
// books, or the WebP the PDF worker made for Backblaze books
// (pages/<bookId>/<n>.webp). The image reader and offline save go through
// here, so the client never builds storage URLs itself.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { findReadableBook } from "@/lib/bookAccess";
import { getCloudinaryPageImageUrl } from "@/lib/cloudinary";
import { handleRouteError } from "@/lib/api";
import { storageClient } from "@/lib/storage";
import { pageImageKey } from "@/lib/pdfJobs";

// The response is cached for an hour, so the URL must outlive that
const PAGE_URL_TTL_SECONDS = 2 * 60 * 60;

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;

    const pageNum = Number.parseInt(
      request.nextUrl.searchParams.get("page") ?? "1",
      10,
    );
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return NextResponse.json({ message: "Invalid page number." }, { status: 400 });
    }

    // Anyone who can't read it gets the same 404 as a missing book, so ids
    // can't be probed.
    const book = (await findReadableBook(id, session))?.book;
    if (!book) {
      return NextResponse.json({ message: "Book not found." }, { status: 404 });
    }

    const onCloudinary = book.storageProvider === "cloudinary" && !!book.cloudinaryPublicId;
    if (!onCloudinary && !book.pageImages) {
      return NextResponse.json(
        { message: "Page images aren't available for this book." },
        { status: 400 },
      );
    }
    const lastPage = onCloudinary ? book.pageCount : book.pageImages!.count;
    if (lastPage && pageNum > lastPage) {
      return NextResponse.json({ message: "Invalid page number." }, { status: 400 });
    }

    let imageUrl: string;
    if (onCloudinary) {
      imageUrl = getCloudinaryPageImageUrl(book.cloudinaryPublicId!, pageNum);
    } else {
      const signed = await storageClient.generatePresignedDownloadUrl(
        pageImageKey(String(book._id), pageNum),
        PAGE_URL_TTL_SECONDS,
      );
      if (!signed.success || !signed.downloadUrl) {
        console.error("GET /api/books/[id]/page: failed to sign page image:", signed.error);
        return NextResponse.json({ message: "Storage is unavailable. Please try again." }, { status: 502 });
      }
      imageUrl = signed.downloadUrl;
    }
    return NextResponse.json(
      { imageUrl, pageNum },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/books/[id]/page");
  }
}
