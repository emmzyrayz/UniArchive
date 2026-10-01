// /api/mod/uploads/:id/claim — the verify workspace's lease on a file, so two
// reviewers never fill in the same PDF. Lasts CLAIM_MINUTES; the workspace
// renews it while open. Permission: "material.ingest" + canWorkOn.
//
// POST    take or renew the viewer's claim (409 when someone else holds it)
// DELETE  release the viewer's own claim (leaving the workspace)
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getBookModel } from "@/lib/models/bookModel";
import { loadPlatformFile, takeClaim } from "@/lib/platformUploads";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "material.ingest");
    const book = await loadPlatformFile((await context.params).id, session);
    if (book.platform.status !== "pending") {
      return NextResponse.json({ message: `This file is already ${book.platform.status}.` }, { status: 409 });
    }
    const until = await takeClaim(book._id, session);
    if (!until) {
      const Book = await getBookModel();
      const current = await Book.findById(book._id).select("platform.claimedByUpid").lean();
      return NextResponse.json(
        {
          message: `@${current?.platform?.claimedByUpid ?? "someone"} is working on this file right now.`,
          claimedByUpid: current?.platform?.claimedByUpid,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ claim: { byUpid: session.upid, until: until.toISOString(), mine: true } });
  } catch (error) {
    return handleRouteError(error, "POST /api/mod/uploads/[id]/claim");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "material.ingest");
    const book = await loadPlatformFile((await context.params).id, session);
    const Book = await getBookModel();
    await Book.updateOne(
      { _id: book._id, "platform.claimedBy": session.userId },
      { $unset: { "platform.claimedBy": "", "platform.claimedByUpid": "", "platform.claimedUntil": "" } },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/mod/uploads/[id]/claim");
  }
}
