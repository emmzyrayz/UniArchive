// POST /api/mod/uploads/:id/publish
// Body: the submission fields (title, description, category, subcategory,
// universityId, facultyId, departmentId, courseCode, courseName, level,
// semester, academicYear, tags, language), plus an optional pageCount from
// the workspace's PDF viewer, used only when the upload had none (files over
// 50 MB skip the browser's page count), and an optional outline
// ({ entries: [...] }, see lib/outline.ts) for textbooks and lecture notes.
//
// Publishes a pending platform file to the UniLibrary in one step: a
// MaterialSubmission created already verified (source "platform") and its
// Material, credited to UniArchive. The publisher may be the person who
// uploaded it: platform files have no submitter to protect, so the "can't
// verify your own submission" rule doesn't apply. No contributor counts,
// badges, ledger entries or emails.
//
// Permission: "material.ingest" + canWorkOn (gifts need
// "material.review_gifts"). Refused while someone else holds the claim.
// Responds with the material id and the next pending file in the same queue.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission, type SessionUser } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getBookModel } from "@/lib/models/bookModel";
import {
  getMaterialSubmissionModel,
  type IMaterialSubmission,
} from "@/lib/models/materialSubmissionModel";
import { reviewNote } from "@/lib/adminSubmissions";
import { parseSubmissionBody, resolveAcademicRefs, type SubmissionBody } from "@/lib/submissions";
import { createMaterialRecord } from "@/lib/materialPublish";
import { parseOutline } from "@/lib/outline";
import {
  claimedByOther,
  loadPlatformFile,
  queueFilter,
  type PlatformBookDoc,
} from "@/lib/platformUploads";
import { isAdminRole } from "@/types/roles";

type Context = { params: Promise<{ id: string }> };

const fail = (status: number, message: string) => NextResponse.json({ message }, { status });

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "material.ingest");
    await enforceRateLimit(request, "admin", `platform-publish:${session.userId}`);
    const book = await loadPlatformFile((await context.params).id, session);
    if (book.platform.status !== "pending") {
      return fail(409, `This file is already ${book.platform.status}.`);
    }
    if (claimedByOther(book.platform, session.userId)) {
      return fail(409, `@${book.platform.claimedByUpid} is working on this file right now.`);
    }

    const body = await readJson<SubmissionBody & { pageCount: number; outline: unknown }>(request);
    const viewerPageCount =
      typeof body?.pageCount === "number" && Number.isInteger(body.pageCount) && body.pageCount > 0
        ? Math.min(body.pageCount, 100_000)
        : undefined;
    const pageCount = book.pageCount ?? viewerPageCount;
    const input = parseSubmissionBody(body ? { ...body, action: "submit" } : null);
    if (!input.institution.universityId) {
      return fail(400, "Choose the university this material is for.");
    }
    const refs = await resolveAcademicRefs(input.institution);
    const outline = parseOutline(body?.outline, input.subcategory, pageCount);
    if (!outline.ok) return fail(400, outline.message);

    // Claim the publish first, so a concurrent publish or discard can't also win
    const now = new Date();
    const Book = await getBookModel();
    const claimed = await Book.findOneAndUpdate(
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
          "platform.status": "published",
          "platform.publishedBy": session.userId,
          "platform.publishedAt": now,
        },
        $unset: { "platform.claimedBy": "", "platform.claimedByUpid": "", "platform.claimedUntil": "" },
      },
      { projection: { _id: 1 } },
    ).lean();
    if (!claimed) return fail(409, "This file changed. Reload and try again.");

    const Submission = await getMaterialSubmissionModel();
    let submissionId: unknown = null;
    try {
      const submission = await Submission.create({
        bookId: book._id,
        // Recorded for the trail; platform materials never credit anyone
        submittedBy: book.platform.uploadedBy,
        submittedByUpid: book.platform.uploadedByUpid,
        source: "platform",
        title: input.title || book.title.slice(0, 200),
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        ...refs,
        courseCode: input.courseCode,
        courseName: input.courseName,
        // Already checked against the allowed values by parseSubmissionBody
        level: input.level as IMaterialSubmission["level"],
        semester: input.semester as IMaterialSubmission["semester"],
        academicYear: input.academicYear,
        tags: input.tags,
        language: input.language,
        status: "verified",
        submittedAt: now,
        reviewedBy: session.userId,
        reviewedAt: now,
        verifiedBy: session.userId,
        verifiedAt: now,
        reviewNotes: [reviewNote(session, "Published from the platform upload queue.")],
      });
      submissionId = submission._id;

      const material = await createMaterialRecord(submission.toObject(), { ...book, pageCount }, session, {
        source: "platform",
        verifiedAt: now,
        outline: outline.value ?? undefined,
      });

      await Book.updateOne(
        { _id: book._id },
        {
          $set: {
            hasSubmission: true,
            submissionId: submission._id,
            ...(pageCount && !book.pageCount ? { pageCount } : {}),
            "platform.materialId": material._id,
          },
          $unset: { "platform.draft": "", "platform.draftSavedAt": "" },
        },
      );

      return NextResponse.json({
        materialId: String(material._id),
        nextId: await nextPendingId(session, book),
        message: "Published to the UniLibrary",
      });
    } catch (error) {
      // Put the file back in the queue so it can be published again
      if (submissionId) await Submission.deleteOne({ _id: submissionId }).catch(() => undefined);
      await Book.updateOne(
        { _id: book._id, "platform.status": "published" },
        {
          $set: { "platform.status": "pending" },
          $unset: { "platform.publishedBy": "", "platform.publishedAt": "" },
        },
      ).catch((revertError) => console.error("publish: failed to revert platform file:", revertError));
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/mod/uploads/[id]/publish");
  }
}

/** The oldest pending file in the same queue that nobody else is working on. */
async function nextPendingId(session: SessionUser, current: PlatformBookDoc): Promise<string | null> {
  const scope =
    current.platform.source === "gift" ? "gifts" : isAdminRole(session.role) ? "all" : "mine";
  const filter = queueFilter(session, scope, "pending");
  if (!filter) return null;
  const now = new Date();
  const Book = await getBookModel();
  const next = await Book.findOne({
    ...filter,
    _id: { $ne: current._id },
    $or: [
      { "platform.claimedBy": { $exists: false } },
      { "platform.claimedBy": session.userId },
      { "platform.claimedUntil": { $lte: now } },
    ],
  })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();
  return next ? String(next._id) : null;
}
