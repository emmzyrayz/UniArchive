// scripts/rebuildMaterialTextIndex.ts
// One-off: replaces the materials text index ("material_text") with the one
// that also searches outline titles ("material_text_v2", see
// src/lib/models/materialModel.ts). MongoDB allows one text index per
// collection, so the old one has to go before the new one can be built.
// Until this runs, search keeps working on the old index (without outline
// titles).
//
//   pnpm db:text-index            (dry run)
//   pnpm db:text-index --apply
//
// Reads MONGODB_URI from .env.local (a shell variable wins).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const OLD = "material_text";
const NEW = "material_text_v2";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const { getMaterialModel } = await import("../src/lib/models/materialModel");
  const mongoose = (await import("mongoose")).default;

  const Material = await getMaterialModel();
  const indexes = await Material.collection.indexes();
  const names = indexes.map((i) => i.name);
  console.log("Current indexes:", names.join(", "));

  if (names.includes(NEW) && !names.includes(OLD)) {
    console.log(`✓ ${NEW} is already in place. Nothing to do.`);
  } else if (!apply) {
    console.log(`Dry run: would drop ${names.includes(OLD) ? OLD : "(no old index)"} and build ${NEW}.`);
    console.log("Run again with --apply to do it.");
  } else {
    if (names.includes(OLD)) {
      await Material.collection.dropIndex(OLD);
      console.log(`✓ Dropped ${OLD}`);
    }
    await Material.createIndexes();
    const after = (await Material.collection.indexes()).map((i) => i.name);
    console.log(after.includes(NEW) ? `✓ Built ${NEW}` : `✗ ${NEW} is missing after createIndexes`);
  }
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error("✗ Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
