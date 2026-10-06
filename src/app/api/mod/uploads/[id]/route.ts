// /api/mod/uploads/:id — one platform file. Permission: "material.ingest",
// and the viewer must be allowed to work on this file (canWorkOn).
//
// GET     the file, a signed read URL for the verify workspace, its saved
//         draft form state and, for gifts, the student's note and details.
// DELETE  discards a pending file: deletes the PDF from Backblaze and keeps
//         the record (status "discarded") as a trail. Refused while someone
//         else holds the claim.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { storageClient } from "@/lib/storage";
import { pageImagePrefix } from "@/lib/pdfJobs";
import { getBookModel } from "@/lib/models/bookModel";
import { removeUnverifiedMaterial } from "@/lib/materialPublish";
import {
  PLATFORM_READ_URL_SECONDS,
  claimedByOther,
  loadPlatformFile,
  toGiftDetailsDto,
  toPlatformFileDto,
} from "@/lib/platformUploads";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "material.ingest");
    const book = await loadPlatformFile((await context.params).id, session);

    let fileUrl: string | null = null;
    if (book.platform.status !== "discarded") {
      const signed = await storageClient.generatePresignedDownloadUrl(
        book.storageKey,
        PLATFORM_READ_URL_SECONDS,
      );
      if (!signed.success || !signed.downloadUrl) {
        console.error("platform file: failed to sign read URL:", signed.error);
        return NextResponse.json({ message: "Storage is unavailable. Please try again." }, { status: 502 });
      }
      fileUrl = signed.downloadUrl;
    }

    return NextResponse.json(
      {
        file: toPlatformFileDto(book, session.userId),
        fileUrl,
        draft: book.platform.draft ?? null,
        gift: toGiftDetailsDto(book),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/mod/uploads/[id]");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "material.ingest");
    await enforceRateLimit(request, "admin", `platform-discard:${session.userId}`);
    const book = await loadPlatformFile((await context.params).id, session);
    if (book.platform.status !== "pending") {
      return NextResponse.json({ message: `This file is already ${book.platform.status}.` }, { status: 409 });
    }
    if (claimedByOther(book.platform, session.userId)) {
      return NextResponse.json(
        { message: `@${book.platform.claimedByUpid} is working on this file right now.` },
        { status: 409 },
      );
    }

    // Conditional on still pending and not claimed by someone else
    const now = new Date();
    const Book = await getBookModel();
    const discarded = await Book.findOneAndUpdate(
      {
        _id: book._id,
        "platform.status": "pending",
        $or: [
          { "platform.claimedBy": { $exists: false } },
          { "platform.claimedBy": session.userId },
          { "platform.claimedUntil": { $lte: now } },
        ],
      },
      {
        $set: {
          "platform.status": "discarded",
          "platform.discardedBy": session.userId,
          "platform.discardedAt": now,
        },
        $unset: { "platform.claimedBy": "", "platform.claimedByUpid": "", "platform.claimedUntil": "" },
      },
      { projection: { _id: 1 } },
    ).lean();
    if (!discarded) {
      return NextResponse.json({ message: "This file changed. Reload and try again." }, { status: 409 });
    }

    // It leaves the UniLibrary, where it was listed as unidentified
    await removeUnverifiedMaterial(book._id);

    // Stop any pending worker job, and remove its page images
    await Book.updateOne({ _id: book._id, "pdfJob.status": "queued" }, { $set: { "pdfJob.status": "failed", "pdfJob.error": "Discarded" } });
    if (book.pageImages) {
      await storageClient.deleteFilesByPrefix(pageImagePrefix(String(book._id))).catch(() => undefined);
    }
    const removed = await storageClient.deleteFile(book.storageKey);
    if (!removed.success) {
      // The record says discarded either way; the orphaned object is logged
      console.error("platform discard: failed to delete object", book.storageKey, removed.error);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/mod/uploads/[id]");
  }
}
