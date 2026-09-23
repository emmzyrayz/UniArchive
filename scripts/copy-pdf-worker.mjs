// scripts/copy-pdf-worker.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pkgPath = require.resolve("pdfjs-dist/package.json");
const pdfjsRoot = path.dirname(pkgPath);
const buildDir = path.join(pdfjsRoot, "build");

const workerFile = fs
  .readdirSync(buildDir)
  .find((f) => f.startsWith("pdf.worker.min"));

if (!workerFile) {
  throw new Error("Could not find pdf.worker.min.* in pdfjs-dist/build");
}

const src = path.join(buildDir, workerFile);
const destDir = path.join(__dirname, "..", "public");
const dest = path.join(destDir, workerFile);

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

console.log(`Copied ${workerFile} to public/`);