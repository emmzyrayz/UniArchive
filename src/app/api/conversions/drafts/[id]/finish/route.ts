// POST /api/conversions/drafts/:id/finish
// Marks an active draft as done ("submitted") once its work has been
// published: the note was submitted, or the contributor is finished with
// the questions. The published records are the source of truth; this only
// takes the draft out of the in-progress list.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { getConversionDraftModel } from "@/lib/models/conversionDraftModel";
import { loadOwnDraft } from "@/lib/conversionDrafts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const draft = await loadOwnDraft((await context.params).id, session.userId);
    if (!draft) return fail(404, "Draft not found.");
    if (draft.status === "submitted") return NextResponse.json({ success: true });
    if (draft.status !== "active") return fail(409, `This draft is already ${draft.status}.`);
    const Draft = await getConversionDraftModel();
    await Draft.updateOne({ _id: draft._id, status: "active" }, { $set: { status: "submitted", submittedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/conversions/drafts/[id]/finish");
  }
}
