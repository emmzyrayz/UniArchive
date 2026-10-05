// src/lib/publicProfile.ts
// Loads a user for their public profile. Suspended accounts are reported as
// not found, so a public page never reveals that an account was suspended.
import type { Types } from "mongoose";
import { getUserModel, type IUser } from "@/lib/models/userModel";
import type { PublicProfile } from "@/types/publicProfile";

// The only fields ever read for a public profile. isSuspended is read to
// hide the account, never returned.
const PUBLIC_FIELDS =
  "upid username fullName profilePhoto bio role universityName universityAbbr " +
  "facultyName departmentName level verifiedMaterialCount createdAt isSuspended deletion";

// UPIDs are initials plus digits, e.g. "nedunizik1234"
const UPID_PATTERN = /^[a-z0-9]{1,60}$/i;

type PublicUserDoc = Pick<
  IUser,
  | "upid"
  | "username"
  | "fullName"
  | "profilePhoto"
  | "bio"
  | "role"
  | "universityName"
  | "universityAbbr"
  | "facultyName"
  | "departmentName"
  | "level"
  | "verifiedMaterialCount"
  | "createdAt"
  | "isSuspended"
  | "deletion"
> & { _id: Types.ObjectId };

/** The user behind `upid`, or null if unknown, malformed, suspended or being deleted. */
export async function findPublicUser(upid: string): Promise<PublicUserDoc | null> {
  if (!UPID_PATTERN.test(upid)) return null;
  const User = await getUserModel();
  const user = await User.findOne({ upid }).select(PUBLIC_FIELDS).lean<PublicUserDoc>();
  // Suspended accounts and accounts waiting to be deleted look not found
  return user && !user.isSuspended && !user.deletion ? user : null;
}

export function toPublicProfile(user: PublicUserDoc): PublicProfile {
  return {
    upid: user.upid,
    username: user.username || undefined,
    fullName: user.fullName,
    profilePhoto: user.profilePhoto || undefined,
    bio: user.bio?.trim() || undefined,
    role: user.role,
    universityName: user.universityName,
    universityAbbr: user.universityAbbr,
    facultyName: user.facultyName,
    departmentName: user.departmentName,
    level: user.level,
    verifiedMaterialCount: user.verifiedMaterialCount ?? 0,
    createdAt: new Date(user.createdAt).toISOString(),
    isCollaboratorOrAbove: user.role !== "student",
  };
}
