// src/lib/nearness.ts
// "Nearest to this person first", shared by "Materials that need typing"
// and Scout tasks: Material filters in tiers from the profile, filled in
// order: same department and level, same department, same faculty, same
// school, then anywhere.
import { Types } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { levelLabel } from "@/components/unilibrary/materialLabels";

export type NearnessProfile = {
  universityId?: Types.ObjectId;
  universityName?: string;
  school?: string;
  facultyId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  level?: string;
};

export interface NearnessTier {
  reason: string;
  filter: Record<string, unknown>;
}

/** "200L" (profile) and "200" (materials) mean the same level. */
export function levelValues(level?: string): string[] {
  if (!level) return [];
  const bare = level.replace(/L$/i, "");
  return [...new Set([level, bare, `${bare}L`])];
}

export async function loadNearnessProfile(userId: string | Types.ObjectId): Promise<NearnessProfile> {
  const User = await getUserModel();
  return (
    (await User.findById(userId)
      .select("universityId universityName school facultyId departmentId level")
      .lean<NearnessProfile>()) ?? {}
  );
}

/** Whether the profile says anything about where the person studies. */
export const isPersonalised = (p: NearnessProfile) =>
  !!(p.departmentId || p.facultyId || p.universityId || p.universityName || p.school);

/** Material filters, nearest first; the last tier ("Popular") matches everything. */
export function nearnessTiers(profile: NearnessProfile): NearnessTier[] {
  const levels = levelValues(profile.level);
  const schoolName = profile.universityName || profile.school;
  const tiers: NearnessTier[] = [];
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
  return tiers;
}
