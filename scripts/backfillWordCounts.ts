// scripts/backfillWordCounts.ts
// One-off: fills in wordCount on typed questions and notes published before
// it was stored (the dashboard's Conversions tab sums it). New and edited
// records get it when they're saved (lib/layer2.ts).
//
//   pnpm db:word-counts            (dry run: reads only, builds no indexes)
//   pnpm db:word-counts --apply
//
// Reads MONGODB_URI from .env.local (a shell variable wins).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const BATCH = 500;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const mongoose = (await import("mongoose")).default;
  // A dry run must not write anything: no automatic index builds or
  // collection creation when the models load
  if (!apply) mongoose.set({ autoIndex: false, autoCreate: false });
  const { getTypedQuestionModel } = await import("../src/lib/models/typedQuestionModel");
  const { getContentDocumentModel } = await import("../src/lib/models/contentDocumentModel");
  const { questionWordCount, noteWordCount } = await import("../src/lib/layer2");

  const missing = { wordCount: { $exists: false } };

  const Question = await getTypedQuestionModel();
  const Doc = await getContentDocumentModel();
  const counts = {
    questions: await Question.countDocuments(missing),
    notes: await Doc.countDocuments(missing),
  };
  console.log(`Missing wordCount: ${counts.questions} questions, ${counts.notes} notes.`);

  if (!apply) {
    // Time reading and counting one batch of each, to estimate a real run
    const t0 = Date.now();
    const qs = await Question.find(missing).select("questionText options").limit(BATCH).lean();
    qs.forEach((q) => questionWordCount(q));
    const t1 = Date.now();
    const ds = await Doc.find(missing).select("title contentBlocks").limit(BATCH).lean();
    ds.forEach((d) => noteWordCount(d));
    const t2 = Date.now();
    // A sampled batch is (up to) a full batch, so its time is per batch
    const readMs = Math.ceil(counts.questions / BATCH) * (t1 - t0) + Math.ceil(counts.notes / BATCH) * (t2 - t1);
    console.log(
      `Sample: ${qs.length} questions read and counted in ${t1 - t0}ms, ${ds.length} notes in ${t2 - t1}ms.`,
    );
    console.log(
      `Estimated --apply time: ~${Math.max(1, Math.round((readMs * 2) / 1000))}s, plus connecting ` +
        `(${Math.ceil(counts.questions / BATCH) + Math.ceil(counts.notes / BATCH)} batches of up to ${BATCH}; ` +
        "reads timed, writes assumed to take as long again).",
    );
    console.log("Dry run: nothing changed. Run again with --apply to fill them in.");
  } else {
    let done = 0;
    for (;;) {
      const batch = await Question.find(missing).select("questionText options").limit(BATCH).lean();
      if (batch.length === 0) break;
      await Question.bulkWrite(
        batch.map((q) => ({
          updateOne: { filter: { _id: q._id }, update: { $set: { wordCount: questionWordCount(q) } }, timestamps: false },
        })),
      );
      done += batch.length;
    }
    console.log(`✓ Questions updated: ${done}`);

    done = 0;
    for (;;) {
      const batch = await Doc.find(missing).select("title contentBlocks").limit(BATCH).lean();
      if (batch.length === 0) break;
      await Doc.bulkWrite(
        batch.map((d) => ({
          updateOne: { filter: { _id: d._id }, update: { $set: { wordCount: noteWordCount(d) } }, timestamps: false },
        })),
      );
      done += batch.length;
    }
    console.log(`✓ Notes updated: ${done}`);
  }
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error("✗ Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
