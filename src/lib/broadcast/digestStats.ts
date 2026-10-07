// src/lib/broadcast/digestStats.ts
// The numbers for a "Monthly digest" broadcast: what happened on UniArchive
// in one calendar month (Lagos time). The editor's "Fill in the numbers"
// writes them into the template's fields, where the admin can still edit
// them, so the template itself stays a plain renderer.
import { Types } from "mongoose";
import { VERIFIED_MATERIALS, getMaterialModel } from "@/lib/models/materialModel";
import { getTypedQuestionModel } from "@/lib/models/typedQuestionModel";
import { getContentDocumentModel } from "@/lib/models/contentDocumentModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { getUserModel } from "@/lib/models/userModel";
import type { MaterialRef } from "@/lib/broadcast/templates";

export interface DigestStats {
  /** "October 2026" */
  monthLabel: string;
  /** Lines for the template's "stats" field, the biggest news first; zero lines left out */
  stats: string[];
  /** The month's most-read newly verified materials, for "Standout materials" */
  materials: MaterialRef[];
  /** The raw counts, for the admin */
  counts: Record<string, number>;
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const STANDOUT = 4;

/** [start, end) of a "YYYY-MM" month in Lagos (UTC+1, no daylight saving), or null. */
export function monthRange(month: string): { start: Date; end: Date; label: string } | null {
  const m = MONTH.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const index = Number(m[2]) - 1;
  const start = new Date(Date.UTC(year, index, 1) - 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, index + 1, 1) - 60 * 60 * 1000);
  const label = new Date(Date.UTC(year, index, 15)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, label };
}

const n = (value: number) => value.toLocaleString("en-US");
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export async function digestStats(month: string): Promise<DigestStats | null> {
  const range = monthRange(month);
  if (!range) return null;
  const inMonth = { $gte: range.start, $lt: range.end };

  const [Material, Question, Note, Suggestion, User] = await Promise.all([
    getMaterialModel(),
    getTypedQuestionModel(),
    getContentDocumentModel(),
    getMaterialSuggestionModel(),
    getUserModel(),
  ]);
  const [verified, shared, questions, notes, identified, members, schools, librarySize, standout] = await Promise.all([
    Material.countDocuments({ isActive: true, ...VERIFIED_MATERIALS, tier1VerifiedAt: inMonth }),
    Material.countDocuments({ isActive: true, createdAt: inMonth }),
    Question.countDocuments({ createdAt: inMonth }),
    Note.countDocuments({ isActive: true, createdAt: inMonth }),
    Suggestion.distinct("materialId", { status: "accepted", decidedAt: inMonth }),
    User.countDocuments({ isVerified: true, createdAt: inMonth }),
    Material.distinct("universityId", { isActive: true, createdAt: inMonth, universityId: { $exists: true } }),
    Material.countDocuments({ isActive: true, ...VERIFIED_MATERIALS, tier1VerifiedAt: { $lt: range.end } }),
    Material.find({ isActive: true, ...VERIFIED_MATERIALS, tier1VerifiedAt: inMonth })
      .sort({ viewCount: -1, tier1VerifiedAt: -1 })
      .limit(STANDOUT)
      .select("title courseCode universityAbbr universityName")
      .lean<{ _id: Types.ObjectId; title: string; courseCode?: string; universityAbbr?: string; universityName?: string }[]>(),
  ]);

  const counts = {
    verified,
    shared,
    typedQuestions: questions,
    typedNotes: notes,
    pdfsIdentified: identified.length,
    newMembers: members,
    schools: schools.length,
    librarySize,
  };
  const lines: [number, string][] = [
    [verified, `${plural(verified, "new verified material", "new verified materials")} in the UniLibrary`],
    [shared, plural(shared, "PDF shared by students and staff", "PDFs shared by students and staff")],
    [questions, plural(questions, "past question typed out", "past questions typed out")],
    [notes, plural(notes, "set of typed notes", "sets of typed notes")],
    [identified.length, plural(identified.length, "PDF identified by readers", "PDFs identified by readers")],
    [members, plural(members, "new member", "new members")],
    [schools.length, plural(schools.length, "school with new materials", "schools with new materials")],
    [librarySize, "verified materials in the library so far"],
  ];
  return {
    monthLabel: range.label,
    stats: lines.filter(([count]) => count > 0).map(([count, text]) => `${n(count)} ${text}`),
    materials: standout.map((m) => {
      const school = m.universityAbbr || m.universityName;
      return { id: String(m._id), title: m.title, ...(m.courseCode && { courseCode: m.courseCode }), ...(school && { school }) };
    }),
    counts,
  };
}
