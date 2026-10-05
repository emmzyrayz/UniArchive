// src/lib/needsTyping.ts
// "Materials that need typing" on the dashboard's Conversions tab: UniLibrary
// materials with no typed content yet that this user could type out, nearest
// to them first. Same rules as the conversion workspace
// (lib/conversionDrafts.ts): past questions (EXAMS) for anyone signed in,
// notes (LEARNING_AIDS, BOOKS) for collaborator and above.
//
// Nearness comes from the profile, in tiers filled in order: same department
// and level, same department, same faculty, same school, then anywhere.
// Within a tier, the most-viewed (most wanted) come first.
import { Types } from "mongoose";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getUserModel } from "@/lib/models/userModel";
import { getConversionDraftModel } from "@/lib/models/conversionDraftModel";
import { NOTE_CATEGORIES, QUESTION_CATEGORIES } from "@/lib/constants/layer2";
import { canWriteNotes } from "@/lib/layer2";
import { levelLabel, materialKindLabel } from "@/components/unilibrary/materialLabels";
import type { MaterialCategory, MaterialSubcategory } from "@/lib/constants/materialCategories";
import type { SessionUser } from "@/lib/auth/session";
import type { NeedsTypingResult } from "@/types/needsTyping";

export { NEEDS_TYPING_MAX } from "@/types/needsTyping";

type MaterialRow = {
  _id: Types.ObjectId;
  title: string;
  category: MaterialCategory;
  subcategory?: MaterialSubcategory;
  courseCode?: string;
  universityAbbr?: string;
  universityName?: string;
  level?: string;
  pageCount?: number;
  viewCount?: number;
};

type ProfileRow = {
  universityId?: Types.ObjectId;
  universityName?: string;
  school?: string;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  level?: string;
};

/** "200L" (profile) and "200" (materials) mean the same level. */
function levelValues(level?: string): string[] {
  if (!level) return [];
  const bare = level.replace(/L$/i, "");
  return [...new Set([level, bare, `${bare}L`])];
}

export async function materialsNeedingTyping(session: SessionUser, limit: number): Promise<NeedsTypingResult> {
  const userId = new Types.ObjectId(session.userId);
  const [User, Material, Draft] = await Promise.all([getUserModel(), getMaterialModel(), getConversionDraftModel()]);
  const profile = (await User.findById(userId)
    .select("universityId universityName school facultyId departmentId level")
    .lean<ProfileRow>()) ?? {};

  const categories = [...QUESTION_CATEGORIES, ...(canWriteNotes(session.role) ? NOTE_CATEGORIES : [])];
  // Already in this user's "In progress"
  const mine = await Draft.distinct("materialId", { userId, status: "active" });
  const base = { isActive: true, hasTypedContent: false, category: { $in: categories }, _id: { $nin: mine } };

  const levels = levelValues(profile.level);
  const schoolName = profile.universityName || profile.school;
  const tiers: { reason: string; filter: Record<string, unknown> }[] = [];
  if (profile.departmentId && levels.length) {
    tiers.push({
      reason: `Your department · ${levelLabel(profile.level!.replace(/L$/i, ""))}`,
      filter: { departmentId: profile.departmentId, level: { $in: levels } },
    });
  }
  if (profile.departmentId) tiers.push({ reason: "Your department", filter: { departmentId: profile.departmentId } });
  if (profile.facultyId) tiers.push({ reason: "Your faculty", filter: { facultyId: profile.facultyId } });
  if (profile.universityId || schoolName) {
    tiers.push({
      reason: "Your school",
      filter: {
        $or: [
          ...(profile.universityId ? [{ universityId: profile.universityId }] : []),
          ...(schoolName ? [{ universityName: schoolName }] : []),
        ],
      },
    });
  }
  tiers.push({ reason: "Popular", filter: {} });

  const picked: { row: MaterialRow; reason: string }[] = [];
  const seen = new Set<string>();
  for (const tier of tiers) {
    if (picked.length >= limit) break;
    const rows = await Material.find({ ...base, ...tier.filter, _id: { $nin: [...mine, ...[...seen].map((id) => new Types.ObjectId(id))] } })
      .sort({ viewCount: -1, createdAt: -1, _id: 1 })
      .limit(limit - picked.length)
      .select("title category subcategory courseCode universityAbbr universityName level pageCount viewCount")
      .lean<MaterialRow[]>();
    for (const row of rows) {
      seen.add(String(row._id));
      picked.push({ row, reason: tier.reason });
    }
  }

  // How many other people have each one open in the workspace
  const typing = picked.length
    ? await Draft.aggregate<{ _id: Types.ObjectId; users: number }>([
        { $match: { materialId: { $in: picked.map((p) => p.row._id) }, status: "active", userId: { $ne: userId } } },
        { $group: { _id: "$materialId", people: { $addToSet: "$userId" } } },
        { $project: { users: { $size: "$people" } } },
      ])
    : [];
  const typingBy = new Map(typing.map((t) => [String(t._id), t.users]));

  return {
    personalised: !!(profile.departmentId || profile.facultyId || profile.universityId || schoolName),
    items: picked.map(({ row, reason }) => ({
      id: String(row._id),
      title: row.title,
      ...(row.courseCode && { courseCode: row.courseCode }),
      ...((row.universityAbbr || row.universityName) && { school: row.universityAbbr || row.universityName }),
      ...(row.level && { level: levelLabel(row.level) }),
      kind: materialKindLabel(row.category, row.subcategory),
      conversion: QUESTION_CATEGORIES.includes(row.category) ? "questions" : "notes",
      ...(row.pageCount && { pageCount: row.pageCount }),
      viewCount: row.viewCount ?? 0,
      reason,
      othersTyping: typingBy.get(String(row._id)) ?? 0,
    })),
  };
}
