// scripts/economyRecompute.ts
// Rebuilds the credit wallets from the ledger (lib/economy/wallet.ts). The
// ledger is the record; wallets are a cache kept in step by each entry's
// transaction, so this should find nothing. Run it if they ever disagree.
//
//   pnpm economy:recompute            (dry run: lists wallets that differ)
//   pnpm economy:recompute --apply
//
// Reads MONGODB_URI from .env.local (shell variables win).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const mongoose = (await import("mongoose")).default;
  const { recomputeWallets } = await import("../src/lib/economy/wallet");
  const diffs = await recomputeWallets(apply);
  for (const d of diffs) console.log(`${d.account} ${d.currency}: wallet ${d.wallet}, ledger ${d.ledger}`);
  console.log(
    diffs.length === 0
      ? "Every wallet matches the ledger."
      : apply
        ? `Fixed ${diffs.length} wallet(s).`
        : `${diffs.length} wallet(s) differ. Run again with --apply to fix them.`,
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
