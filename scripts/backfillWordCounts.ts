// scripts/backfillWordCounts.ts
// One-off: fills in wordCount on typed questions and notes published before
// it was stored (the dashboard's Conversions tab sums it). New and edited
// records get it when they're saved (lib/layer2.ts).
//
//   pnpm db:word-counts            (dry run)
//   pnpm db:word-counts --apply
//
// Reads MONGODB_URI from .env.local (a shell variable wins).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const BATCH = 500;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const mongoose = (await import("mongoose")).default;
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
