// scripts/backfillUnverifiedMaterials.ts
// One-off for "unverified PDFs in the UniLibrary" (lib/materialPublish.ts):
//  1. Replaces the materials index on submissionId (plain unique) with the
//     partial unique one, so unidentified platform PDFs (no submission) can
//     be listed. Until this runs, only one of them can be listed at a time.
//  2. Marks existing materials "verified" (they all are; the field is new).
//  3. Lists, as unverified, the PDFs already waiting: submissions that are
//     submitted or in review, and pending platform uploads and gifts.
//
//   pnpm db:unverified-materials            (dry run: counts only)
//   pnpm db:unverified-materials --apply
//
// Safe to run again. Reads MONGODB_URI from .env.local (a shell variable wins).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const OLD_INDEX = "submissionId_1";
const NEW_INDEX = "submissionId_partial";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const mongoose = (await import("mongoose")).default;
  const { getMaterialModel } = await import("../src/lib/models/materialModel");
  const { getMaterialSubmissionModel } = await import("../src/lib/models/materialSubmissionModel");
  const { getBookModel } = await import("../src/lib/models/bookModel");
  const { upsertUnverifiedFromSubmission, upsertUnverifiedFromPlatformBook } = await import("../src/lib/materialPublish");

  const [Material, Submission, Book] = await Promise.all([getMaterialModel(), getMaterialSubmissionModel(), getBookModel()]);

  // 1. Index
  const names = (await Material.collection.indexes()).map((i) => i.name);
  if (names.includes(NEW_INDEX) && !names.includes(OLD_INDEX)) console.log(`✓ ${NEW_INDEX} is in place.`);
  else if (!apply) console.log(`Would drop ${names.includes(OLD_INDEX) ? OLD_INDEX : "(no old index)"} and build ${NEW_INDEX}.`);
  else {
    if (names.includes(OLD_INDEX)) {
      await Material.collection.dropIndex(OLD_INDEX);
      console.log(`✓ Dropped ${OLD_INDEX}`);
    }
    await Material.createIndexes();
    console.log(`✓ Built ${NEW_INDEX} (and any other missing indexes)`);
  }

  // 2. Status on existing materials
  const noStatus = await Material.countDocuments({ status: { $exists: false } });
  if (!apply) console.log(`Would mark ${noStatus} existing material(s) verified.`);
  else if (noStatus) {
    const r = await Material.updateMany({ status: { $exists: false } }, { $set: { status: "verified" } }, { timestamps: false });
    console.log(`✓ Marked ${r.modifiedCount} material(s) verified`);
  }

  // 3. PDFs already waiting
  const listed = new Set((await Material.find({}).select("bookId").lean()).map((m) => String(m.bookId)));
  const submissions = (await Submission.find({ status: { $in: ["submitted", "in_review"] } }).lean()).filter(
    (s) => !listed.has(String(s.bookId)),
  );
  const platformBooks = (
    await Book.find({ "platform.status": "pending" })
      .select("title description storageProvider storageKey cloudinaryPublicId fileSize pageCount platform")
      .lean()
  ).filter((b) => !listed.has(String(b._id)));
  if (!apply) {
    console.log(`Would list ${submissions.length} submission(s) and ${platformBooks.length} platform file(s) as unverified.`);
  } else {
    let done = 0;
    for (const s of submissions) {
      const book = await Book.findById(s.bookId).select("storageProvider storageKey cloudinaryPublicId fileSize pageCount").lean();
      if (book) {
        await upsertUnverifiedFromSubmission(s, book);
        done++;
      }
    }
    for (const b of platformBooks) {
      await upsertUnverifiedFromPlatformBook(b as Parameters<typeof upsertUnverifiedFromPlatformBook>[0]);
      done++;
    }
    const now = await Material.countDocuments({ status: "unverified" });
    console.log(`✓ Listed ${done} PDF(s); ${now} unverified in the UniLibrary now`);
  }
  if (!apply) console.log("Dry run. Run again with --apply to do it.");
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error("✗ Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
