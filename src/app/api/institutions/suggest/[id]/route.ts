// DELETE /api/institutions/suggest/[id]
// Withdraws the caller's own suggestion within 24 hours of submitting it,
// while it's still awaiting review.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getUserModel } from "@/lib/models/userModel";
import {
  ACTIVE_SUGGESTION_STATUSES,
  getSchoolSuggestionModel,
} from "@/lib/models/schoolSuggestionModel";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: "Suggestion not found." }, { status: 404 });
    }

    const Suggestion = await getSchoolSuggestionModel();
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return NextResponse.json({ message: "Suggestion not found." }, { status: 404 });
    }
    if (suggestion.submittedBy.toString() !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    if (!ACTIVE_SUGGESTION_STATUSES.includes(suggestion.status)) {
      return NextResponse.json(
        { message: "This suggestion can no longer be withdrawn." },
        { status: 400 },
      );
    }
    if (new Date() > suggestion.canWithdrawUntil) {
      return NextResponse.json(
        { message: "The 24-hour withdrawal window has passed." },
        { status: 400 },
      );
    }

    // Only flip it if it's still active, so a concurrent admin decision wins
    const updated = await Suggestion.updateOne(
      { _id: suggestion._id, status: { $in: ACTIVE_SUGGESTION_STATUSES } },
      { $set: { status: "withdrawn" } },
    );
    if (updated.modifiedCount === 0) {
      return NextResponse.json(
        { message: "This suggestion can no longer be withdrawn." },
        { status: 400 },
      );
    }

    if (suggestion.linkedToSuggestionId) {
      await Suggestion.updateOne(
        { _id: suggestion.linkedToSuggestionId, adminPriority: { $gt: 1 } },
        { $inc: { adminPriority: -1 } },
      );
    }

    // Clear the pointer only if it still refers to this suggestion
    const User = await getUserModel();
    await User.updateOne(
      { _id: session.userId, pendingSuggestionId: suggestion._id },
      { $unset: { pendingSuggestionId: "" } },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "institutions/suggest/[id]");
  }
}
