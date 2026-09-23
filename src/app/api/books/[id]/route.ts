// GET    /api/books/[id]  - one book (owner only)
// DELETE /api/books/[id]  - delete the file from storage, then the record
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getBookModel } from "@/lib/models/bookModel";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { storageClient } from "@/lib/storage";
import { toBookDto, type BookDoc } from "@/lib/dto/book";

type Context = { params: Promise<{ id: string }> };

// Non-owners get the same 404 as a missing book, so ids can't be probed.
const notFound = () =>
  NextResponse.json({ message: "Book not found." }, { status: 404 });

async function findOwnedBook(request: NextRequest, context: Context) {
  const session = await requireAuth(request);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return null;

  const Book = await getBookModel();
  const book = await Book.findOne({ _id: id, uploaderId: session.userId }).lean<BookDoc>();
  return book ? { Book, book } : null;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const found = await findOwnedBook(request, context);
    if (!found) return notFound();
    return NextResponse.json({ book: toBookDto(found.book) });
  } catch (error) {
    return handleRouteError(error, "GET /api/books/[id]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const found = await findOwnedBook(request, context);
    if (!found) return notFound();
    const { Book, book } = found;

    const removed = await storageClient.deleteFile(book.storageKey);
    if (!removed.success) {
      console.error("DELETE /api/books/[id]: storage delete failed:", removed.error);
      return NextResponse.json(
        { message: "Could not delete the file. Please try again." },
        { status: 502 },
      );
    }

    await Book.deleteOne({ _id: book._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/books/[id]");
  }
}
