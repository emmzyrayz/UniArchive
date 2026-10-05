// src/lib/broadcast/recipients.ts
// Turns a BroadcastAudience into users: the one resolver behind the
// recipient preview and the send, so the count an admin sees is the count
// that's sent. Always: verified, not suspended, and accepting this kind of
// bulk email (lib/emailPrefs.ts). Loads matching users in one query and
// filters "incomplete profile" in code; fine at UniArchive's size, revisit
// (cursor + batches) past tens of thousands of users.
import { Types } from "mongoose";
import { getUserModel, type IUser } from "@/lib/models/userModel";
import { getLoginEventModel } from "@/lib/models/loginEventModel";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { calculateProfileCompletion, type ProfileCompletionInput } from "@/lib/profileCompletion";
import { maskEmail } from "@/lib/adminUsers";
import type { EmailKind } from "@/lib/emailPrefs";
import type { BroadcastAudience } from "./audience";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecipientDoc = ProfileCompletionInput & {
  _id: Types.ObjectId;
  upid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: IUser["role"];
  universityName?: string;
  school?: string;
  createdAt: Date;
  emailPrefs?: IUser["emailPrefs"];
};

const RECIPIENT_FIELDS =
  "upid email firstName lastName fullName username role universityName school createdAt emailPrefs " +
  "isVerified phone profilePhoto bio dob universityId facultyId departmentId level";

export interface RecipientPreview {
  id: string;
  upid: string;
  name: string;
  email: string; // masked
  school?: string;
  level?: string;
}

/** Ids of users seen in the last `days` days (sign-ins or session activity). */
async function activeUserIds(days: number): Promise<Types.ObjectId[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const [LoginEvent, SessionCache] = await Promise.all([getLoginEventModel(), getSessionCacheModel()]);
  const [signedIn, sessions] = await Promise.all([
    LoginEvent.distinct("userId", { createdAt: { $gte: since } }),
    SessionCache.distinct("userId", { lastActivity: { $gte: since } }),
  ]);
  const ids = new Set<string>([...signedIn, ...sessions].map(String));
  return [...ids].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
}

type Filter = Record<string, unknown>;

export async function audienceFilter(audience: BroadcastAudience, kind: EmailKind): Promise<Filter> {
  const and: Filter[] = [
    { isVerified: true },
    { isSuspended: { $ne: true } },
    kind === "newsletter" ? { "emailPrefs.newsletter": true } : { "emailPrefs.announcements": { $ne: false } },
  ];
  if (audience.schools.length) {
    and.push({ $or: [{ universityName: { $in: audience.schools } }, { school: { $in: audience.schools } }] });
  }
  if (audience.departmentIds.length) {
    and.push({ departmentId: { $in: audience.departmentIds.map((id) => new Types.ObjectId(id)) } });
  }
  if (audience.levels.length) and.push({ level: { $in: audience.levels } });
  if (audience.roles.length) and.push({ role: { $in: audience.roles } });
  if (audience.contributorsOnly) and.push({ verifiedMaterialCount: { $gte: 1 } });
  if (audience.verifiedStudentsOnly) and.push({ schoolEmailVerifiedAt: { $exists: true } });
  if (audience.joinedFrom) and.push({ createdAt: { $gte: new Date(`${audience.joinedFrom}T00:00:00Z`) } });
  if (audience.joinedTo) {
    and.push({ createdAt: { $lt: new Date(Date.parse(`${audience.joinedTo}T00:00:00Z`) + DAY_MS) } });
  }
  if (audience.inactiveDays) and.push({ _id: { $nin: await activeUserIds(audience.inactiveDays) } });
  return { $and: and };
}

/** Every recipient, newest accounts first. */
export async function resolveRecipients(audience: BroadcastAudience, kind: EmailKind): Promise<RecipientDoc[]> {
  const User = await getUserModel();
  const docs = await User.find(await audienceFilter(audience, kind))
    .sort({ createdAt: -1, _id: -1 })
    .select(RECIPIENT_FIELDS)
    .lean<RecipientDoc[]>();
  return audience.incompleteProfileOnly
    ? docs.filter((d) => calculateProfileCompletion(d).percentage < 100)
    : docs;
}

export function toRecipientPreview(d: RecipientDoc): RecipientPreview {
  return {
    id: String(d._id),
    upid: d.upid,
    name: d.fullName,
    email: maskEmail(d.email),
    ...((d.universityName || d.school) && { school: d.universityName || d.school }),
    ...(d.level && { level: d.level }),
  };
}

export interface AudienceOptions {
  schools: { value: string; count: number }[];
  departments: { id: string; name: string; school?: string; count: number }[];
  levels: { value: string; count: number }[];
  roles: { value: string; count: number }[];
}

/** The values the audience picker offers: only what users actually have. */
export async function audienceOptions(): Promise<AudienceOptions> {
  const User = await getUserModel();
  const match = { $match: { isVerified: true, isSuspended: { $ne: true } } };
  const byCount = { $sort: { count: -1 as const, _id: 1 as const } };
  const [schools, departments, levels, roles] = await Promise.all([
    User.aggregate<{ _id: string; count: number }>([
      match,
      { $group: { _id: { $ifNull: ["$universityName", "$school"] }, count: { $sum: 1 } } },
      { $match: { _id: { $nin: [null, ""] } } },
      byCount,
    ]),
    User.aggregate<{ _id: Types.ObjectId; name?: string; school?: string; count: number }>([
      match,
      { $match: { departmentId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$departmentId",
          name: { $first: "$departmentName" },
          school: { $first: "$universityName" },
          count: { $sum: 1 },
        },
      },
      byCount,
    ]),
    User.aggregate<{ _id: string; count: number }>([
      match,
      { $match: { level: { $nin: [null, ""] } } },
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate<{ _id: string; count: number }>([match, { $group: { _id: "$role", count: { $sum: 1 } } }, byCount]),
  ]);
  return {
    schools: schools.map((s) => ({ value: s._id, count: s.count })),
    departments: departments.map((d) => ({
      id: String(d._id),
      name: d.name || "Unnamed department",
      ...(d.school && { school: d.school }),
      count: d.count,
    })),
    levels: levels.map((l) => ({ value: l._id, count: l.count })),
    roles: roles.map((r) => ({ value: r._id, count: r.count })),
  };
}
