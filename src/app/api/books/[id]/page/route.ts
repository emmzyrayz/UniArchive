// GET /api/books/[id]/page?page=N
// Signed Cloudinary image URL for one page of a book (owner, or a reviewer
// once it's submitted — see lib/bookAccess). The image
// reader and offline save go through here, so the client never builds
// Cloudinary URLs itself.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { findReadableBook } from "@/lib/bookAccess";
import { getCloudinaryPageImageUrl } from "@/lib/cloudinary";
import { handleRouteError } from "@/lib/api";

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

    if (book.storageProvider !== "cloudinary" || !book.cloudinaryPublicId) {
      return NextResponse.json(
        { message: "Page images aren't available for this book." },
        { status: 400 },
      );
    }
    if (book.pageCount && pageNum > book.pageCount) {
      return NextResponse.json({ message: "Invalid page number." }, { status: 400 });
    }

    const imageUrl = getCloudinaryPageImageUrl(book.cloudinaryPublicId, pageNum);
    return NextResponse.json(
      { imageUrl, pageNum },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/books/[id]/page");
  }
}
