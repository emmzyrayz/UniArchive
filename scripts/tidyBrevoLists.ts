// scripts/tidyBrevoLists.ts
// Deletes old per-broadcast contact lists from Brevo's "UniArchive
// broadcasts" folder (lib/broadcast/tidyLists.ts; the same job runs weekly
// as a Vercel Cron).
//
//   pnpm brevo:tidy-lists            (dry run: lists what would go)
//   pnpm brevo:tidy-lists --apply
//
// Reads MONGODB_URI and BREVO_API_KEY from .env.local (shell variables win).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const mongoose = (await import("mongoose")).default;
  const { brevoConfigured } = await import("../src/lib/brevo");
  const { tidyBroadcastLists, KEEP_DAYS } = await import("../src/lib/broadcast/tidyLists");
  if (!brevoConfigured()) throw new Error("BREVO_API_KEY is not set.");

  // Large backlogs: keep going in batches until nothing is left
  let total = 0;
  for (;;) {
    const result = await tidyBroadcastLists({ apply, limit: 200 });
    for (const l of result.deleted) console.log(`${apply ? "deleted" : "would delete"}  #${l.id}  ${l.name}  (${l.reason})`);
    for (const l of result.failed) console.log(`FAILED  #${l.id}  ${l.name}: ${l.error}`);
    total += result.deleted.length;
    if (result.failed.length) process.exitCode = 1;
    if (!apply || !result.more || result.deleted.length === 0) {
      console.log(
        `\n${result.checked} lists in the folder; ${apply ? `deleted ${total}` : `${result.deleted.length} would be deleted`}, ` +
          `${result.kept} kept (scheduled, sending, under ${KEEP_DAYS} days old, or not ours)` +
          (result.failed.length ? `, ${result.failed.length} failed` : "") +
          (!apply && result.more ? ", and more past the first 200" : ""),
      );
      if (!apply && result.deleted.length) console.log("Run again with --apply to delete them.");
      break;
    }
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
