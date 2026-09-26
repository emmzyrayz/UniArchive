// PATCH /api/admin/submissions/[id]/verify
// Body: { tier: 1 | 2, note?: string }
//
// Tier 1 ("submission.verify_tier1"): submitted | in_review -> verified.
//   Creates the Material record from the submission and its Book, bumps the
//   submitter's verifiedMaterialCount and emails them.
// Tier 2 ("submission.verify_tier2"): endorses an already verified material.
//   Never on the caller's own submission.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, type SessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getBookModel } from "@/lib/models/bookModel";
import { getUserModel } from "@/lib/models/userModel";
import {
  getMaterialSubmissionModel,
  type IMaterialSubmission,
} from "@/lib/models/materialSubmissionModel";
import {
  getMaterialModel,
  type MaterialCategory,
  type MaterialSubcategory,
} from "@/lib/models/materialModel";
import {
  DECIDABLE_STATUSES,
  adminSubmissionResponse,
  loadReviewableSubmission,
  loadSubmitterContact,
  parseText,
  reviewNote,
} from "@/lib/adminSubmissions";
import { sendSubmissionVerifiedEmail } from "@/utils/email";

type Context = { params: Promise<{ id: string }> };

// Phase D's public listing; the email links here
const MATERIAL_URL = "/unilibrary";

const fail = (status: number, message: string) =>
  NextResponse.json({ message }, { status });

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    enforceRateLimit(request, `admin-submissions:${session.userId}`, 60);
    const { id } = await context.params;

    const body = await readJson<{ tier: number; note: string }>(request);
    const tier = body?.tier ?? 1;
    if (tier !== 1 && tier !== 2) return fail(400, "tier must be 1 or 2.");
    const note = parseText(body?.note, "note");

    if (!can(session.role, tier === 1 ? "submission.verify_tier1" : "submission.verify_tier2")) {
      return fail(403, "Forbidden");
    }

    const submission = await loadReviewableSubmission(id);
    return tier === 1
      ? await verifyTier1(session, submission, note)
      : await verifyTier2(session, submission, note);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/submissions/[id]/verify");
  }
}

async function verifyTier1(
  session: SessionUser,
  submission: IMaterialSubmission,
  note: string | undefined,
) {
  if (!DECIDABLE_STATUSES.includes(submission.status)) {
    return fail(409, `This submission is already ${submission.status.replace("_", " ")}.`);
  }
  if (submission.submittedBy.toString() === session.userId) {
    return fail(403, "You cannot verify your own submission.");
  }

  const Book = await getBookModel();
  const book = await Book.findById(submission.bookId)
    .select("storageProvider storageKey cloudinaryPublicId fileSize pageCount")
    .lean();
  if (!book) return fail(409, "The original document no longer exists, so it can't be verified.");

  // Claim the decision first so a concurrent verify/reject can't also win
  const now = new Date();
  const Submission = await getMaterialSubmissionModel();
  const verified = await Submission.findOneAndUpdate(
    { _id: submission._id, status: { $in: DECIDABLE_STATUSES } },
    {
      $set: {
        status: "verified",
        verifiedBy: session.userId,
        verifiedAt: now,
        reviewedBy: session.userId,
        reviewedAt: now,
      },
      $unset: { rejectionReason: "" },
      ...(note ? { $push: { reviewNotes: reviewNote(session, note) } } : {}),
    },
    { returnDocument: "after" },
  ).lean();
  if (!verified) return fail(409, "This submission changed status. Reload and try again.");

  const Material = await getMaterialModel();
  const isCloudinary = book.storageProvider === "cloudinary" && !!book.cloudinaryPublicId;
  let material;
  try {
    const created = await Material.create({
      submissionId: verified._id,
      bookId: verified.bookId,
      submittedBy: verified.submittedBy,
      submittedByUpid: verified.submittedByUpid,

      title: verified.title,
      description: verified.description,
      category: verified.category as MaterialCategory,
      subcategory: verified.subcategory as MaterialSubcategory | undefined,
      tags: verified.tags,
      language: verified.language,

      universityId: verified.universityId,
      universityName: verified.universityName,
      universityAbbr: verified.universityAbbr,
      facultyId: verified.facultyId,
      facultyName: verified.facultyName,
      departmentId: verified.departmentId,
      departmentName: verified.departmentName,
      courseCode: verified.courseCode,
      courseName: verified.courseName,
      level: verified.level,
      semester: verified.semester,
      academicYear: verified.academicYear,

      storageProvider: isCloudinary ? "cloudinary" : "backblaze",
      storageKey: isCloudinary ? book.cloudinaryPublicId! : book.storageKey,
      fileSize: book.fileSize,
      pageCount: book.pageCount,

      verificationTier: "tier1",
      tier1VerifiedBy: session.userId,
      tier1VerifiedByUpid: session.upid,
      tier1VerifiedAt: now,
      tier1Note: note,
    });
    material = created.toObject();
  } catch (error) {
    // Put the submission back where it was so it can be decided again
    await Submission.updateOne(
      { _id: submission._id, status: "verified" },
      {
        $set: {
          status: submission.status,
          ...(submission.reviewedBy ? { reviewedBy: submission.reviewedBy } : {}),
        },
        $unset: {
          verifiedBy: "",
          verifiedAt: "",
          reviewedAt: "",
          ...(submission.reviewedBy ? {} : { reviewedBy: "" }),
        },
      },
    ).catch((revertError) => {
      console.error("verify: failed to revert submission after Material error:", revertError);
    });
    throw error;
  }

  const User = await getUserModel();
  await User.updateOne({ _id: verified.submittedBy }, { $inc: { verifiedMaterialCount: 1 } });

  const contact = await loadSubmitterContact(verified.submittedBy);
  if (contact) {
    await sendSubmissionVerifiedEmail({
      toEmail: contact.email,
      toName: contact.name,
      materialTitle: verified.title,
      tier: 1,
      note,
      materialUrl: MATERIAL_URL,
    }).catch((error) => console.error("verify: tier 1 email failed:", error));
  }

  return NextResponse.json({
    material,
    submission: await adminSubmissionResponse(verified),
    message: "Material verified",
  });
}

async function verifyTier2(
  session: SessionUser,
  submission: IMaterialSubmission,
  note: string | undefined,
) {
  if (submission.status !== "verified") {
    return fail(409, "Only verified materials can be endorsed. Verify it at tier 1 first.");
  }
  if (submission.submittedBy.toString() === session.userId) {
    return fail(403, "You can't endorse your own submission.");
  }

  const Material = await getMaterialModel();
  const material = await Material.findOneAndUpdate(
    { submissionId: submission._id, verificationTier: "tier1" },
    {
      $set: {
        verificationTier: "tier2",
        tier2VerifiedBy: session.userId,
        tier2VerifiedByUpid: session.upid,
        tier2VerifiedAt: new Date(),
        ...(note ? { tier2Note: note } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!material) {
    const existing = await Material.exists({ submissionId: submission._id });
    return existing
      ? fail(409, "This material has already been endorsed.")
      : fail(404, "No material record exists for this submission.");
  }

  let updated = submission;
  if (note) {
    const Submission = await getMaterialSubmissionModel();
    updated =
      (await Submission.findByIdAndUpdate(
        submission._id,
        { $push: { reviewNotes: reviewNote(session, `Tier 2 endorsement: ${note}`) } },
        { returnDocument: "after" },
      ).lean()) ?? submission;
  }

  const contact = await loadSubmitterContact(submission.submittedBy);
  if (contact) {
    await sendSubmissionVerifiedEmail({
      toEmail: contact.email,
      toName: contact.name,
      materialTitle: material.title,
      tier: 2,
      note,
      materialUrl: MATERIAL_URL,
    }).catch((error) => console.error("verify: tier 2 email failed:", error));
  }

  return NextResponse.json({
    material,
    submission: await adminSubmissionResponse(updated),
    message: "Material endorsed",
  });
}
