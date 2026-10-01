// src/lib/conversionStats.ts
// A contributor's conversion stats for the dashboard's Conversions tab,
// computed from what they've published (typed questions and notes), not
// from drafts.
//
// Cached in Redis (lib/redis.ts) for five minutes per user and dropped when
// they submit something. The cache fails open: if Redis is slow or down,
// the stats are computed from MongoDB as if it weren't there.
import { Types } from "mongoose";
import { redis } from "@/lib/redis";
import { getTypedQuestionModel } from "@/lib/models/typedQuestionModel";
import { getContentDocumentModel } from "@/lib/models/contentDocumentModel";
import { getMaterialModel } from "@/lib/models/materialModel";

const CACHE_SECONDS = 5 * 60;
const REDIS_TIMEOUT_MS = 800;
const WEEKS = 12;
const cacheKey = (userId: string) => `conv-stats:v1:${userId}`;

export interface ConversionStats {
  questions: { total: number; verified: number; pending: number; disputed: number };
  /** Answers people have posted to the questions this user typed out */
  answers: number;
  notes: { total: number; endorsed: number; views: number };
  words: number;
  materialsHelped: number;
  /** Share of their questions and notes that staff have verified; null with none */
  verificationRate: number | null;
  /** Oldest first: one entry per week (starting Monday, UTC) */
  weekly: { weekStart: string; questions: number; notes: number }[];
  recent: {
    kind: "question" | "note";
    id: string;
    label: string;
    materialId: string;
    materialTitle: string;
    createdAt: string;
  }[];
  generatedAt: string;
}

const UNAVAILABLE: unique symbol = Symbol("redis unavailable");

/** The promise's value, or UNAVAILABLE if it rejects or takes too long. */
function bounded<T>(promise: Promise<T>): Promise<T | typeof UNAVAILABLE> {
  return Promise.race([
    promise.catch((): typeof UNAVAILABLE => UNAVAILABLE),
    new Promise<typeof UNAVAILABLE>((resolve) => setTimeout(() => resolve(UNAVAILABLE), REDIS_TIMEOUT_MS)),
  ]);
}

/** Drop a user's cached stats (after they publish or change something). Never throws. */
export async function invalidateConversionStats(userId: string): Promise<void> {
  await bounded(redis.del(cacheKey(userId)));
}

function mondayUTC(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

async function compute(userId: string): Promise<ConversionStats> {
  const uid = new Types.ObjectId(userId);
  const Question = await getTypedQuestionModel();
  const Doc = await getContentDocumentModel();
  const now = new Date();
  const firstWeek = mondayUTC(new Date(now.getTime() - (WEEKS - 1) * 7 * 24 * 60 * 60 * 1000));
  const weekOf = { $dateTrunc: { date: "$createdAt", unit: "week", startOfWeek: "monday", timezone: "UTC" } };
  const noteMatch = { createdBy: uid, isActive: true };

  const [qTotals, nTotals, qWeeks, nWeeks, qRecent, nRecent] = await Promise.all([
    Question.aggregate<{
      total: number; verified: number; disputed: number; answers: number; words: number; materials: Types.ObjectId[];
    }>([
      { $match: { submittedBy: uid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ["$status", "verified"] }, 1, 0] } },
          disputed: { $sum: { $cond: [{ $eq: ["$status", "disputed"] }, 1, 0] } },
          answers: { $sum: { $ifNull: ["$answerCount", 0] } },
          words: { $sum: { $ifNull: ["$wordCount", 0] } },
          materials: { $addToSet: "$materialId" },
        },
      },
    ]),
    Doc.aggregate<{ total: number; verified: number; endorsed: number; views: number; words: number; materials: Types.ObjectId[] }>([
      { $match: noteMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: [{ $ifNull: ["$verificationTier", false] }, 1, 0] } },
          endorsed: { $sum: { $cond: [{ $eq: ["$verificationTier", "tier2"] }, 1, 0] } },
          views: { $sum: { $ifNull: ["$viewCount", 0] } },
          words: { $sum: { $ifNull: ["$wordCount", 0] } },
          materials: { $addToSet: "$materialId" },
        },
      },
    ]),
    Question.aggregate<{ _id: Date; n: number }>([
      { $match: { submittedBy: uid, createdAt: { $gte: firstWeek } } },
      { $group: { _id: weekOf, n: { $sum: 1 } } },
    ]),
    Doc.aggregate<{ _id: Date; n: number }>([
      { $match: { ...noteMatch, createdAt: { $gte: firstWeek } } },
      { $group: { _id: weekOf, n: { $sum: 1 } } },
    ]),
    Question.find({ submittedBy: uid })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("materialId questionNumber questionPart createdAt")
      .lean<{ _id: Types.ObjectId; materialId: Types.ObjectId; questionNumber: number; questionPart?: string; createdAt: Date }[]>(),
    Doc.find(noteMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("materialId title createdAt")
      .lean<{ _id: Types.ObjectId; materialId: Types.ObjectId; title: string; createdAt: Date }[]>(),
  ]);

  const q = qTotals[0] ?? { total: 0, verified: 0, disputed: 0, answers: 0, words: 0, materials: [] };
  const n = nTotals[0] ?? { total: 0, verified: 0, endorsed: 0, views: 0, words: 0, materials: [] };
  const materials = new Set([...q.materials, ...n.materials].map(String));

  const perWeek = (rows: { _id: Date; n: number }[]) => new Map(rows.map((r) => [new Date(r._id).getTime(), r.n]));
  const qByWeek = perWeek(qWeeks);
  const nByWeek = perWeek(nWeeks);
  const weekly = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(firstWeek.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    return { weekStart: start.toISOString(), questions: qByWeek.get(start.getTime()) ?? 0, notes: nByWeek.get(start.getTime()) ?? 0 };
  });

  const recentRaw = [
    ...qRecent.map((x) => ({
      kind: "question" as const,
      id: String(x._id),
      label: `Q${x.questionNumber}${x.questionPart ?? ""}`,
      materialId: String(x.materialId),
      createdAt: x.createdAt,
    })),
    ...nRecent.map((x) => ({ kind: "note" as const, id: String(x._id), label: x.title, materialId: String(x.materialId), createdAt: x.createdAt })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const titles = new Map(
    (
      await (await getMaterialModel())
        .find({ _id: { $in: recentRaw.map((r) => r.materialId) } })
        .select("title courseCode")
        .lean<{ _id: Types.ObjectId; title: string; courseCode?: string }[]>()
    ).map((m) => [String(m._id), m.courseCode ? `${m.courseCode} · ${m.title}` : m.title]),
  );

  const published = q.total + n.total;
  return {
    questions: { total: q.total, verified: q.verified, disputed: q.disputed, pending: q.total - q.verified - q.disputed },
    answers: q.answers,
    notes: { total: n.total, endorsed: n.endorsed, views: n.views },
    words: q.words + n.words,
    materialsHelped: materials.size,
    verificationRate: published ? (q.verified + n.verified) / published : null,
    weekly,
    recent: recentRaw.map((r) => ({
      ...r,
      materialTitle: titles.get(r.materialId) ?? "Unavailable material",
      createdAt: new Date(r.createdAt).toISOString(),
    })),
    generatedAt: now.toISOString(),
  };
}

/** The user's stats: from the cache when fresh, otherwise computed (and cached). */
export async function getConversionStats(userId: string): Promise<{ stats: ConversionStats; cached: boolean }> {
  const hit = await bounded(redis.get<ConversionStats>(cacheKey(userId)));
  if (hit !== UNAVAILABLE && hit && typeof hit === "object" && "questions" in hit) return { stats: hit, cached: true };
  const stats = await compute(userId);
  // Redis just failed: don't wait on it a second time
  if (hit !== UNAVAILABLE) await bounded(redis.set(cacheKey(userId), stats, { ex: CACHE_SECONDS }));
  return { stats, cached: false };
}
