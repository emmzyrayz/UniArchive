// src/lib/adminUsers.ts
// The admin view of a user. The rules for who may change whom are in
// src/lib/constants/roles.ts.
import type { IUser } from "@/lib/models/userModel";
import { decryptSensitiveData } from "@/lib/encryption";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import type { AdminUserDto } from "@/types/admin";

export const ADMIN_USER_FIELDS =
  "upid fullName username role email universityName departmentName verifiedMaterialCount " +
  "submissionCount violationCount isVerified isSuspended suspensionReason createdAt " +
  "phone profilePhoto bio dob universityId facultyId departmentId level";

export type AdminUserDoc = Pick<
  IUser,
  | "upid"
  | "fullName"
  | "username"
  | "role"
  | "email"
  | "universityName"
  | "departmentName"
  | "verifiedMaterialCount"
  | "submissionCount"
  | "violationCount"
  | "isVerified"
  | "isSuspended"
  | "suspensionReason"
  | "createdAt"
  | "phone"
  | "profilePhoto"
  | "bio"
  | "dob"
  | "universityId"
  | "facultyId"
  | "departmentId"
  | "level"
> & { _id: unknown };

/** "user@gmail.com" -> "use***@gmail.com"; "" when it can't be read. */
export function maskEmail(ciphertext: string): string {
  try {
    const email = decryptSensitiveData(ciphertext);
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    return `${local.slice(0, Math.min(3, Math.max(1, local.length - 1)))}***@${domain}`;
  } catch {
    return "";
  }
}

export function toAdminUserDto(doc: AdminUserDoc): AdminUserDto {
  return {
    id: String(doc._id),
    upid: doc.upid,
    fullName: doc.fullName,
    username: doc.username,
    role: doc.role,
    email: maskEmail(doc.email),
    universityName: doc.universityName,
    departmentName: doc.departmentName,
    verifiedMaterialCount: doc.verifiedMaterialCount ?? 0,
    submissionCount: doc.submissionCount ?? 0,
    violationCount: doc.violationCount ?? 0,
    isVerified: !!doc.isVerified,
    isSuspended: !!doc.isSuspended,
    suspensionReason: doc.suspensionReason,
    createdAt: new Date(doc.createdAt).toISOString(),
    // Without a pending school suggestion's partial credit; close enough here
    profileCompletion: calculateProfileCompletion(doc).percentage,
  };
}
