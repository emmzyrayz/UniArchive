// GET /api/auth/me
// Returns the signed-in user with their profile completion, or 401.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { decryptSensitiveData } from "@/lib/encryption";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { MASKED_PHONE } from "@/lib/constants/profile";
import { loadPendingSuggestionForCompletion } from "@/lib/schoolSuggestions";

/** Decrypts a field for its owner; null if it's missing or unreadable. */
function tryDecrypt(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decryptSensitiveData(value);
  } catch (error) {
    console.error("me: failed to decrypt a user field", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const User = await getUserModel();
    const user = await User.findById(session.userId)
      .select(
        "upid uuid role fullName firstName lastName username email school faculty " +
          "department level semester isVerified profilePhoto bio dob phone createdAt " +
          "universityId universityName universityAbbr facultyId facultyName " +
          "departmentId departmentName verifiedMaterialCount submissionCount " +
          "roleUpgradedAt pendingSuggestionId",
      )
      .lean();
    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 },
      );
    }

    const pendingSuggestion = await loadPendingSuggestionForCompletion(
      user.pendingSuggestionId,
    );
    const completion = calculateProfileCompletion(user, pendingSuggestion);

    return NextResponse.json(
      {
        user: {
          id: String(user._id),
          upid: user.upid,
          uuid: user.uuid,
          role: user.role,
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          // Only ever returned to its owner
          email: tryDecrypt(user.email) ?? "",
          profilePhoto: user.profilePhoto,
          bio: user.bio,
          dob: user.dob,
          // The number itself is never sent, not even to its owner
          phoneMasked: user.phone ? MASKED_PHONE : null,
          isVerified: user.isVerified,
          // Legacy plain-string institution fields, still read by userContext
          school: user.school,
          faculty: user.faculty ?? "",
          department: user.department ?? "",
          level: user.level ?? "",
          semester: user.semester,
          // Normalized institution references
          universityId: user.universityId?.toString(),
          universityName: user.universityName,
          universityAbbr: user.universityAbbr,
          facultyId: user.facultyId?.toString(),
          facultyName: user.facultyName,
          departmentId: user.departmentId?.toString(),
          departmentName: user.departmentName,
          // Contribution tracking
          verifiedMaterialCount: user.verifiedMaterialCount ?? 0,
          submissionCount: user.submissionCount ?? 0,
          roleUpgradedAt: user.roleUpgradedAt,
          // Set only while the suggestion still awaits review
          pendingSuggestionId: pendingSuggestion
            ? user.pendingSuggestionId?.toString()
            : undefined,
          joinedAt: user.createdAt,
          profileCompletion: completion,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "me");
  }
}
