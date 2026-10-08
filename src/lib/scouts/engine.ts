// src/lib/scouts/engine.ts
// Archive Scouts: picking the next task for someone, taking their answer,
// settling a subject when enough Scouts agree, paying the ones who agreed
// (through the credits economy), and taking it back if staff overturn it.
//
// - identify reuses Help identify: the answer is a MaterialSuggestion and
//   staff decide (settleSuggestions pays it).
// - readable / check_typed are voted: AGREE matching answers settle the
//   subject (lib/scouts/consensus.ts). Settling is claimed with a
//   conditional update on the subject, so two last answers arriving at
//   once settle it once.
import { Types } from "mongoose";
import { PUBLIC_MATERIALS, getMaterialModel, type IMaterial } from "@/lib/models/materialModel";
import { getTypedQuestionModel, type ITypedQuestion } from "@/lib/models/typedQuestionModel";
import { getMaterialSuggestionModel } from "@/lib/models/materialSuggestionModel";
import { getScoutAnswerModel, type IScoutAnswer } from "@/lib/models/scoutAnswerModel";
import { getUserModel } from "@/lib/models/userModel";
import { loadNearnessProfile, nearnessTiers } from "@/lib/nearness";
import { levelLabel, materialKindLabel } from "@/components/unilibrary/materialLabels";
import { earn } from "@/lib/economy/earn";
import { EconomyError, reverse } from "@/lib/economy/ledger";
import { notifyAfter } from "@/lib/notifications";
import { accuracyOf, decideConsensus, type Accuracy } from "./consensus";
import { issueTaskToken } from "./token";
import {
  ANSWERS,
  NEEDS_NOTE,
  NOTE_MAX,
  SCOUT_TASK_IDS,
  type ScoutTask,
  type VotedTask,
} from "./taskTypes";

const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

// ---------------------------------------------------------------- picking

export interface MaterialBrief {
  materialId: string;
  bookId: string;
  title: string;
  kind: string;
  courseCode?: string;
  school?: string;
  level?: string;
  pageCount?: number;
  /** Why it was picked: "Your department", "Popular" ... */
  reason: string;
}

export interface QuestionBrief {
  questionId: string;
  number: string; // "3b"
  text: string;
  type: string;
  marks?: number;
  options?: { label: string; text: string }[];
}

export type ScoutTaskCard =
  | { task: "identify"; material: MaterialBrief }
  | { task: "readable"; token: string; material: MaterialBrief }
  | { task: "check_typed"; token: string; material: MaterialBrief; question: QuestionBrief };

type MaterialRow = Pick<
  IMaterial,
  "_id" | "bookId" | "title" | "category" | "subcategory" | "courseCode" | "universityAbbr" | "universityName" | "level"
> & { pageCount?: number };

const MATERIAL_FIELDS = "bookId title category subcategory courseCode universityAbbr universityName level pageCount";

function brief(row: MaterialRow, reason: string): MaterialBrief {
  return {
    materialId: String(row._id),
    bookId: String(row.bookId),
    title: row.title,
    kind: materialKindLabel(row.category, row.subcategory),
    ...(row.courseCode && { courseCode: row.courseCode }),
    ...((row.universityAbbr || row.universityName) && { school: row.universityAbbr || row.universityName }),
    ...(row.level && { level: levelLabel(row.level) }),
    ...(row.pageCount && { pageCount: row.pageCount }),
    reason,
  };
}

const idsOf = (ids: string[]) => ids.filter((id) => Types.ObjectId.isValid(id)).map(oid);

type Filter = Record<string, unknown>;

/** Open subjects of a material task for this person: the filter, and ids they've done. */
async function openMaterials(task: "identify" | "readable", userId: Types.ObjectId): Promise<{ filter: Filter; done: Types.ObjectId[] }> {
  if (task === "identify") {
    const done = (await (await getMaterialSuggestionModel()).distinct("materialId", { userId })) as Types.ObjectId[];
    return { filter: { ...PUBLIC_MATERIALS, status: "unverified", submittedBy: { $ne: userId } }, done };
  }
  const done = (await (await getScoutAnswerModel()).distinct("subjectId", { userId, task: "readable" })) as Types.ObjectId[];
  return { filter: { ...PUBLIC_MATERIALS, "scoutCheck.settledAt": { $exists: false }, submittedBy: { $ne: userId } }, done };
}

async function openQuestions(userId: Types.ObjectId): Promise<{ filter: Filter; done: Types.ObjectId[] }> {
  const done = (await (await getScoutAnswerModel()).distinct("subjectId", { userId, task: "check_typed" })) as Types.ObjectId[];
  return { filter: { status: "pending", "scoutCheck.settledAt": { $exists: false }, submittedBy: { $ne: userId } }, done };
}

/** Whether this person can do Scout tasks (signed in, not suspended or leaving). */
async function assertCanScout(userId: Types.ObjectId) {
  const user = await (await getUserModel())
    .findById(userId)
    .select("isSuspended deletion")
    .lean<{ isSuspended?: boolean; deletion?: unknown }>();
  if (!user) throw new EconomyError("not_found", "Account not found.");
  if (user.isSuspended) throw new EconomyError("invalid", "Suspended accounts can't do Scout tasks.", 403);
  if (user.deletion) throw new EconomyError("invalid", "This account is being deleted; sign in again to cancel that first.", 403);
}

/**
 * The next task of `task` for this person, nearest first, skipping
 * `skip` (subject ids they passed on). Null when there's nothing left.
 */
export async function nextTask(userIdRaw: string, task: ScoutTask, skip: string[] = []): Promise<ScoutTaskCard | null> {
  const userId = oid(userIdRaw);
  await assertCanScout(userId);
  const Material = await getMaterialModel();
  const tiers = nearnessTiers(await loadNearnessProfile(userId));
  const skipped = idsOf(skip);

  if (task === "identify" || task === "readable") {
    const { filter, done } = await openMaterials(task, userId);
    const exclude = [...done, ...skipped];
    for (const tier of tiers) {
      const row = await Material.findOne({ ...filter, ...tier.filter, _id: { $nin: exclude } } as Filter)
        .sort(task === "readable" ? { "scoutCheck.votes": -1, viewCount: -1, _id: 1 } : { viewCount: -1, createdAt: -1, _id: 1 })
        .select(MATERIAL_FIELDS)
        .lean<MaterialRow>();
      if (!row) continue;
      const material = brief(row, tier.reason);
      return task === "identify"
        ? { task, material }
        : { task, material, token: issueTaskToken(userIdRaw, "readable", String(row._id)) };
    }
    return null;
  }

  // check_typed: the nearest material with an open question, then its first open question
  const TypedQuestion = await getTypedQuestionModel();
  const open = await openQuestions(userId);
  const qFilter: Filter = { ...open.filter, _id: { $nin: [...open.done, ...skipped] } };
  const materialIds = await TypedQuestion.distinct("materialId", qFilter);
  if (materialIds.length === 0) return null;
  for (const tier of tiers) {
    const row = await Material.findOne({ ...PUBLIC_MATERIALS, ...tier.filter, _id: { $in: materialIds } } as Filter)
      .sort({ viewCount: -1, _id: 1 })
      .select(MATERIAL_FIELDS)
      .lean<MaterialRow>();
    if (!row) continue;
    const q = await TypedQuestion.findOne({ ...qFilter, materialId: row._id })
      .sort({ "scoutCheck.votes": -1, questionNumber: 1, questionPart: 1 })
      .select("questionNumber questionPart questionText questionType marks options")
      .lean<ITypedQuestion>();
    if (!q) continue;
    return {
      task,
      material: brief(row, tier.reason),
      token: issueTaskToken(userIdRaw, "check_typed", String(q._id)),
      question: {
        questionId: String(q._id),
        number: `${q.questionNumber}${q.questionPart ?? ""}`,
        text: q.questionText,
        type: q.questionType,
        ...(q.marks !== undefined && { marks: q.marks }),
        // The correct option stays hidden: checkers compare text, not answers
        ...(q.options?.length && { options: q.options.map((o) => ({ label: o.label, text: o.text })) }),
      },
    };
  }
  return null;
}

// ---------------------------------------------------------------- accuracy

export async function accuracyFor(userId: string | Types.ObjectId, task: VotedTask): Promise<Accuracy> {
  const ScoutAnswer = await getScoutAnswerModel();
  const rows = await ScoutAnswer.aggregate<{ _id: string; n: number }>([
    { $match: { userId: oid(userId), task, status: { $in: ["confirmed", "disagreed", "overturned"] } } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const n = (s: string) => rows.find((r) => r._id === s)?.n ?? 0;
  return accuracyOf(n("confirmed"), n("disagreed") + n("overturned"));
}

// ---------------------------------------------------------------- answering

export interface AnswerInput {
  task: VotedTask;
  subjectId: string;
  answer: string;
  note?: string;
  multiplier?: number;
}

export interface AnswerResult {
  answerId: string;
  counted: boolean;
  settled: null | { result: string; youAgreed: boolean; paid: boolean } | { stuck: true };
}

/** Saves a voted answer (the token was already checked) and settles the subject if it's decided. */
export async function submitAnswer(userIdRaw: string, input: AnswerInput): Promise<AnswerResult> {
  const userId = oid(userIdRaw);
  await assertCanScout(userId);
  if (!ANSWERS[input.task].includes(input.answer)) throw new EconomyError("invalid", "That isn't one of the answers.");
  const note = typeof input.note === "string" ? input.note.trim().slice(0, NOTE_MAX) : "";
  if (NEEDS_NOTE.has(input.answer) && note.length < 3) throw new EconomyError("invalid", "Say briefly what's wrong.");

  // The subject must still be open, and not their own
  const subjectId = oid(input.subjectId);
  let materialId: Types.ObjectId;
  if (input.task === "readable") {
    const m = await (await getMaterialModel())
      .findOne({ _id: subjectId, ...PUBLIC_MATERIALS })
      .select("submittedBy scoutCheck")
      .lean<Pick<IMaterial, "_id" | "submittedBy" | "scoutCheck">>();
    if (!m) throw new EconomyError("not_found", "That PDF isn't available any more.");
    if (String(m.submittedBy) === userIdRaw) throw new EconomyError("invalid", "You can't check your own upload.", 403);
    if (m.scoutCheck?.settledAt) throw new EconomyError("limit", "Other Scouts already settled this one.");
    materialId = m._id;
  } else {
    const q = await (await getTypedQuestionModel())
      .findById(subjectId)
      .select("materialId submittedBy status scoutCheck")
      .lean<Pick<ITypedQuestion, "materialId" | "submittedBy" | "status" | "scoutCheck">>();
    if (!q) throw new EconomyError("not_found", "That question isn't available any more.");
    if (String(q.submittedBy) === userIdRaw) throw new EconomyError("invalid", "You can't check your own typing.", 403);
    if (q.status !== "pending" || q.scoutCheck?.settledAt) throw new EconomyError("limit", "Other Scouts already settled this one.");
    materialId = q.materialId;
  }

  const counted = !(await accuracyFor(userId, input.task)).paused;
  const ScoutAnswer = await getScoutAnswerModel();
  let saved: IScoutAnswer;
  try {
    saved = (
      await ScoutAnswer.create({
        userId,
        task: input.task,
        subjectId,
        materialId,
        answer: input.answer,
        ...(note && NEEDS_NOTE.has(input.answer) ? { note } : {}),
        counted,
        multiplier: input.multiplier ?? 1,
      })
    ).toObject() as IScoutAnswer;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new EconomyError("limit", "You already answered this one.");
    throw error;
  }

  // Votes so far: picking prefers subjects close to settling
  if (counted) {
    const Subject = input.task === "readable" ? await getMaterialModel() : await getTypedQuestionModel();
    await (Subject as unknown as { updateOne: (f: object, u: object) => Promise<unknown> }).updateOne(
      { _id: subjectId },
      { $inc: { "scoutCheck.votes": 1 } },
    );
  }

  await settleSubject(input.task, subjectId);
  const after = await ScoutAnswer.findById(saved._id).select("status").lean<Pick<IScoutAnswer, "status">>();
  let settled: AnswerResult["settled"] = null;
  if (after?.status === "stuck") settled = { stuck: true };
  else if (after?.status === "confirmed" || after?.status === "disagreed") {
    const result = await settledValue(input.task, subjectId);
    settled = { result: result ?? "", youAgreed: after.status === "confirmed", paid: after.status === "confirmed" && counted };
  }
  return { answerId: String(saved._id), counted, settled };
}

async function settledValue(task: VotedTask, subjectId: Types.ObjectId): Promise<string | undefined> {
  if (task === "readable") {
    const m = await (await getMaterialModel()).findById(subjectId).select("scoutCheck").lean<Pick<IMaterial, "scoutCheck">>();
    return m?.scoutCheck?.readability;
  }
  const q = await (await getTypedQuestionModel()).findById(subjectId).select("scoutCheck").lean<Pick<ITypedQuestion, "scoutCheck">>();
  return q?.scoutCheck?.result;
}

// ---------------------------------------------------------------- settling

/**
 * Decides the subject if enough counted answers agree (or too many came in
 * without agreeing), applies the result and pays the Scouts who agreed.
 * Safe to call any number of times: only the first decision applies.
 */
export async function settleSubject(task: VotedTask, subjectId: Types.ObjectId): Promise<void> {
  const ScoutAnswer = await getScoutAnswerModel();
  const answers = await ScoutAnswer.find({ task, subjectId, status: "pending", counted: true })
    .sort({ createdAt: 1 })
    .select("answer")
    .lean<Pick<IScoutAnswer, "answer">[]>();
  const outcome = decideConsensus(answers.map((a) => a.answer));
  if (outcome.kind === "open") return;

  const now = new Date();
  const claimed = await claimSubject(task, subjectId, outcome, now);
  if (!claimed) return;

  if (outcome.kind === "stuck") {
    await ScoutAnswer.updateMany({ task, subjectId, status: "pending" }, { $set: { status: "stuck", settledAt: now } });
    return;
  }
  await ScoutAnswer.updateMany(
    { task, subjectId, status: "pending", answer: outcome.value },
    { $set: { status: "confirmed", settledAt: now } },
  );
  await ScoutAnswer.updateMany({ task, subjectId, status: "pending" }, { $set: { status: "disagreed", settledAt: now } });

  const agreed = await ScoutAnswer.find({ task, subjectId, status: "confirmed", counted: true }).lean<IScoutAnswer[]>();
  for (const a of agreed) {
    await earn(a.userId, `scouts.${task}`, `scouts.${task}:${a._id}`, {
      multiplier: a.multiplier,
      meta: { subjectId: String(subjectId), materialId: String(a.materialId) },
    }).catch((error) => console.error(`[scouts] paying ${a._id} failed:`, error));
  }
  if (task === "check_typed") await afterTypedCheck(subjectId, outcome.value, agreed);
}

/** Records the decision on the subject; false if someone settled it first. */
async function claimSubject(
  task: VotedTask,
  subjectId: Types.ObjectId,
  outcome: { kind: "settled"; value: string } | { kind: "stuck" },
  now: Date,
): Promise<boolean> {
  const open = { _id: subjectId, "scoutCheck.settledAt": { $exists: false } };
  if (task === "readable") {
    const Material = await getMaterialModel();
    const material = await Material.findById(subjectId).select("status").lean<Pick<IMaterial, "status">>();
    const set: Record<string, unknown> = { "scoutCheck.settledAt": now };
    if (outcome.kind === "stuck") set["scoutCheck.stuck"] = true;
    else {
      set["scoutCheck.readability"] = outcome.value;
      if (outcome.value === "unreadable" || outcome.value === "not_study") {
        // Unverified: out of the listing like 3 reports; verified: staff look
        if (material?.status === "unverified") set.hiddenByReports = true;
        else set["scoutCheck.flagged"] = true;
      }
    }
    return (await Material.updateOne(open, { $set: set })).modifiedCount === 1;
  }

  const TypedQuestion = await getTypedQuestionModel();
  const set: Record<string, unknown> = { "scoutCheck.settledAt": now };
  if (outcome.kind === "stuck") set["scoutCheck.stuck"] = true;
  else {
    set["scoutCheck.result"] = outcome.value;
    if (outcome.value === "correct") {
      set.status = "verified";
      set.verifiedAt = now;
    } else {
      set.status = "disputed";
    }
  }
  return (await TypedQuestion.updateOne({ ...open, status: "pending" }, { $set: set })).modifiedCount === 1;
}

/** A typed question was checked: pay or tell its typist. */
async function afterTypedCheck(questionId: Types.ObjectId, result: string, agreed: IScoutAnswer[]) {
  const TypedQuestion = await getTypedQuestionModel();
  const q = await TypedQuestion.findById(questionId)
    .select("materialId submittedBy questionNumber questionPart")
    .lean<Pick<ITypedQuestion, "materialId" | "submittedBy" | "questionNumber" | "questionPart">>();
  if (!q) return;
  const number = `${q.questionNumber}${q.questionPart ?? ""}`;
  const link = `/materials/${String(q.materialId)}?tab=questions`;
  if (result === "correct") {
    await earn(q.submittedBy, "scouts.typed_verified", `scouts.typed_verified:${questionId}`, {
      meta: { questionId: String(questionId) },
    }).catch((error) => console.error(`[scouts] paying typist for ${questionId} failed:`, error));
    notifyAfter(q.submittedBy, {
      type: "typed_verified",
      title: `Question ${number} you typed was verified`,
      body: "Scouts checked it against the paper and it matches. Credits are in your wallet.",
      link,
      dedupeKey: `typed-check:${questionId}`,
    });
    return;
  }
  const notes = [...new Set(agreed.map((a) => a.note).filter((n): n is string => !!n))].slice(0, 5);
  await TypedQuestion.updateOne({ _id: questionId }, { $set: { "scoutCheck.notes": notes } });
  notifyAfter(q.submittedBy, {
    type: "typed_disputed",
    title: `Question ${number} you typed needs a fix`,
    body: notes.length ? `Scouts said: ${notes.join(" · ")}` : "Scouts say it doesn't match the paper.",
    link,
    dedupeKey: `typed-check:${questionId}`,
  });
}

// ---------------------------------------------------------------- overturning

/**
 * Staff reversed a Scout result (restored a PDF Scouts called unreadable,
 * or corrected a typed check): the credits paid for it are taken back and
 * those answers marked overturned. Returns how many answers were affected.
 */
export async function overturnSubject(
  task: VotedTask,
  subjectId: string | Types.ObjectId,
  opts: { note: string; actorId?: string },
): Promise<number> {
  const ScoutAnswer = await getScoutAnswerModel();
  const id = oid(subjectId);
  const confirmed = await ScoutAnswer.find({ task, subjectId: id, status: "confirmed" }).select("_id").lean();
  for (const a of confirmed) {
    await reverse(`scouts.${task}:${a._id}`, { note: opts.note, actorId: opts.actorId });
  }
  if (task === "check_typed") await reverse(`scouts.typed_verified:${id}`, { note: opts.note, actorId: opts.actorId });
  await ScoutAnswer.updateMany({ task, subjectId: id, status: "confirmed" }, { $set: { status: "overturned" } });
  return confirmed.length;
}

// ---------------------------------------------------------------- the hub

export interface ScoutTaskSummary {
  task: ScoutTask;
  waiting: number;
  accuracy: Accuracy | null;
  answered: number;
  pending: number;
}

const WAITING_CAP = 99;

/** For /scouts: per task, how many are waiting for this person and how they're doing. */
export async function scoutSummary(userIdRaw: string): Promise<ScoutTaskSummary[]> {
  const userId = oid(userIdRaw);
  const Material = await getMaterialModel();
  const TypedQuestion = await getTypedQuestionModel();
  const ScoutAnswer = await getScoutAnswerModel();
  const Suggestion = await getMaterialSuggestionModel();

  const out: ScoutTaskSummary[] = [];
  for (const task of SCOUT_TASK_IDS) {
    let waiting: number;
    if (task === "check_typed") {
      const { filter, done } = await openQuestions(userId);
      const q: Filter = { ...filter, _id: { $nin: done } };
      const publicIds = await Material.distinct("_id", { ...PUBLIC_MATERIALS, _id: { $in: await TypedQuestion.distinct("materialId", q) } } as Filter);
      waiting = await TypedQuestion.countDocuments({ ...q, materialId: { $in: publicIds } }, { limit: WAITING_CAP + 1 });
    } else {
      const { filter, done } = await openMaterials(task, userId);
      waiting = await Material.countDocuments({ ...filter, _id: { $nin: done } } as Filter, { limit: WAITING_CAP + 1 });
    }
    if (task === "identify") {
      const [answered, pending] = await Promise.all([
        Suggestion.countDocuments({ userId }),
        Suggestion.countDocuments({ userId, status: "pending" }),
      ]);
      out.push({ task, waiting, accuracy: null, answered, pending });
    } else {
      const [accuracy, answered, pending] = await Promise.all([
        accuracyFor(userId, task),
        ScoutAnswer.countDocuments({ userId, task }),
        ScoutAnswer.countDocuments({ userId, task, status: "pending" }),
      ]);
      out.push({ task, waiting, accuracy, answered, pending });
    }
  }
  return out;
}

export { WAITING_CAP };
