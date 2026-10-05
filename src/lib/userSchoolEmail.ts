// src/lib/userSchoolEmail.ts
// Adding or changing a school email from Settings (signed in), after signup.
// The school is the one on the user's profile: the signup school name, or
// the catalog university set on the profile page (checked against that
// university's own abbreviation and website when it isn't in schoolData).
// Verifying stores the address like signup does and awards the
// verified_student badge.
import { Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { getSchoolEmailChallengeModel } from "@/lib/models/schoolEmailChallengeModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { maskEmailAddress } from "@/lib/auth/tokens";
import { awardBadgesAfter } from "@/lib/badges";
import { checkSchoolEmail, schoolEmailError } from "@/lib/schoolEmail";
import { SchoolEmailError, startSchoolEmailChallenge, verifySchoolEmailChallenge } from "@/lib/schoolEmailChallenge";

interface ProfileSchool {
  name: string;
  fallback?: { abbreviation?: string; website?: string };
}

type UserSchoolFields = {
  _id: Types.ObjectId;
  school?: string;
  universityId?: Types.ObjectId;
  universityName?: string;
  schoolEmail?: string;
  schoolEmailVerifiedAt?: Date;
};

async function loadUser(userId: string): Promise<UserSchoolFields> {
  const User = await getUserModel();
  const user = await User.findById(userId)
    .select("school universityId universityName schoolEmail schoolEmailVerifiedAt")
    .lean<UserSchoolFields>();
  if (!user) throw new SchoolEmailError("Account not found.", 404);
  return user;
}

/** The school on the profile, or null if none is set yet. */
async function profileSchool(user: UserSchoolFields): Promise<ProfileSchool | null> {
  // The catalog university (profile page) is the current one when set
  if (user.universityId) {
    const University = await getUniversityModel();
    const uni = await University.findById(user.universityId)
      .select("name abbreviation website")
      .lean<{ name: string; abbreviation?: string; website?: string }>();
    if (uni) return { name: uni.name, fallback: { abbreviation: uni.abbreviation, website: uni.website } };
  }
  const name = user.universityName || user.school;
  return name ? { name } : null;
}

export interface SchoolEmailStatus {
  school: string | null;
  schoolEmail: string | null; // masked
  verifiedAt: string | null;
}

export async function schoolEmailStatus(userId: string): Promise<SchoolEmailStatus> {
  const user = await loadUser(userId);
  const school = await profileSchool(user);
  let masked: string | null = null;
  if (user.schoolEmail) {
    try {
      masked = maskEmailAddress(decryptSensitiveData(user.schoolEmail));
    } catch {
      masked = null;
    }
  }
  return {
    school: school?.name ?? null,
    schoolEmail: masked,
    verifiedAt: user.schoolEmailVerifiedAt ? user.schoolEmailVerifiedAt.toISOString() : null,
  };
}

/** Checks the address against the profile school and emails a code. */
export async function sendSettingsSchoolEmailCode(userId: string, value: string): Promise<{ token: string; school: string }> {
  const user = await loadUser(userId);
  const school = await profileSchool(user);
  if (!school) throw new SchoolEmailError("Set your school on your profile first.", 409);
  const check = checkSchoolEmail(value, school.name, school.fallback);
  if (!check.ok) {
    // Profile schools come from the catalog, so "unknown school" means we
    // have nothing to match against
    const message =
      check.reason === "unknown_school"
        ? `We can't check emails for ${school.name} yet. Contact support to add it.`
        : schoolEmailError(check, school.name);
    throw new SchoolEmailError(message, 400);
  }
  const token = await startSchoolEmailChallenge(check.email, school.name, userId);
  return { token, school: school.name };
}

/** Checks the code and stores the school email on the account. */
export async function verifySettingsSchoolEmail(userId: string, token: string, code: string): Promise<SchoolEmailStatus> {
  const challenge = await verifySchoolEmailChallenge(token, code, userId);
  const user = await loadUser(userId);
  const school = await profileSchool(user);
  // The profile's school may have changed since the code was sent
  if (!school || school.name !== challenge.school) {
    throw new SchoolEmailError("Your school changed since the code was sent. Send a new code.", 409);
  }

  // Use the challenge once
  const Challenge = await getSchoolEmailChallengeModel();
  const claimed = await Challenge.findOneAndUpdate(
    { _id: challenge._id, used: false, userId: user._id },
    { $set: { used: true } },
    { returnDocument: "after" },
  ).lean();
  if (!claimed) throw new SchoolEmailError("This code was already used. Send a new code.", 409);

  const User = await getUserModel();
  try {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          schoolEmail: challenge.email,
          schoolEmailHash: challenge.emailHash,
          schoolEmailVerifiedAt: challenge.verifiedAt ?? new Date(),
        },
      },
    );
  } catch (error) {
    // Linked to another account between sending and verifying
    if ((error as { code?: number }).code === 11000) {
      throw new SchoolEmailError("This school email is already linked to a UniArchive account.", 409);
    }
    throw error;
  }
  awardBadgesAfter(user._id, "school_email_verified");
  return schoolEmailStatus(userId);
}
