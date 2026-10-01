// src/tools.ts
// The command-line tools the worker drives: Ghostscript (compression) and
// poppler's pdfinfo / pdftoppm (page count, page rendering). Commands are
// configurable (GS_COMMAND, ...) so tests can point them elsewhere.
import { spawn } from "node:child_process";

const OUTPUT_LIMIT = 4000;

export function run(command: string[], args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const [bin, ...prefix] = command;
    const child = spawn(bin, [...prefix, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out = (out + d.toString()).slice(-OUTPUT_LIMIT)));
    child.stderr.on("data", (d: Buffer) => (err = (err + d.toString()).slice(-OUTPUT_LIMIT)));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${bin} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`${bin} exited with ${code}: ${(err || out).trim().slice(-400)}`));
    });
  });
}

/** Page count from pdfinfo ("Pages:          123"). */
export async function pageCount(pdfinfo: string[], file: string): Promise<number> {
  const out = await run(pdfinfo, [file], 60_000);
  const match = /^Pages:\s+(\d+)/m.exec(out);
  const n = match ? Number(match[1]) : NaN;
  if (!Number.isInteger(n) || n < 1) throw new Error("pdfinfo reported no pages");
  return n;
}

/**
 * Re-writes a PDF with Ghostscript's "ebook" preset: images downsampled to
 * 150 dpi, fonts subset, duplicate images merged. Lossy for scans, which is
 * the point; text stays sharp. -dSAFER keeps a hostile PDF from touching the
 * file system.
 */
export async function compressPdf(gs: string[], input: string, output: string): Promise<void> {
  await run(
    gs,
    [
      "-q",
      "-dSAFER",
      "-dNOPAUSE",
      "-dBATCH",
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.5",
      "-dPDFSETTINGS=/ebook",
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      `-sOutputFile=${output}`,
      input,
    ],
    20 * 60_000,
  );
}

/** Renders pages first..last to PNG files <prefix>-<n>.png, `width` pixels wide. */
export async function renderPages(
  pdftoppm: string[],
  input: string,
  prefix: string,
  first: number,
  last: number,
  width: number,
): Promise<void> {
  await run(
    pdftoppm,
    ["-f", String(first), "-l", String(last), "-scale-to-x", String(width), "-scale-to-y", "-1", "-png", input, prefix],
    10 * 60_000,
  );
}
