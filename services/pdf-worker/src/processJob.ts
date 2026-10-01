// src/processJob.ts
// One job: download the PDF, compress it if it's a platform file (keeping
// the result only if it's valid and clearly smaller), then render every page
// to WebP in B2 at pages/<bookId>/<n>.webp for devices that can't run
// pdf.js. Pages are rendered in batches so the temp disk stays small.
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Job, JobResult } from "./appClient.ts";
import type { Config } from "./config.ts";
import type { Storage } from "./storage.ts";
import { compressPdf, pageCount, renderPages } from "./tools.ts";

export const pageImageKey = (bookId: string, page: number) => `pages/${bookId}/${page}.webp`;

export interface ProcessDeps {
  config: Config;
  storage: Storage;
  log: (message: string) => void;
}

export async function processJob(job: Job, { config, storage, log }: ProcessDeps): Promise<JobResult> {
  const dir = await mkdtemp(path.join(config.workDir, `pdfjob-${job.id}-`));
  try {
    const original = path.join(dir, "original.pdf");
    const size = await storage.download(job.storageKey, original);
    const pages = await pageCount(config.pdfinfo, original);
    log(`job ${job.id}: ${pages} pages, ${(size / 1024 / 1024).toFixed(1)} MB${job.compress ? ", compressing" : ""}`);

    let compressedSize: number | undefined;
    if (job.compress) {
      const smaller = path.join(dir, "compressed.pdf");
      try {
        await compressPdf(config.gs, original, smaller);
        const out = (await stat(smaller)).size;
        const outPages = await pageCount(config.pdfinfo, smaller);
        if (outPages !== pages) {
          log(`job ${job.id}: compressed copy has ${outPages} pages, not ${pages}; keeping the original`);
        } else if (out > size * (1 - config.minSaving)) {
          log(`job ${job.id}: compression saved under ${config.minSaving * 100}%; keeping the original`);
        } else {
          // Same key: the material, signed URLs and offline copies keep working
          await storage.uploadFile(job.storageKey, smaller, "application/pdf");
          compressedSize = out;
          log(`job ${job.id}: compressed ${size} -> ${out} bytes (${Math.round((1 - out / size) * 100)}% smaller)`);
        }
      } catch (error) {
        // Compression is a bonus; page images still matter
        log(`job ${job.id}: compression failed, keeping the original: ${(error as Error).message}`);
      }
    }

    // Render from the original: the best quality source for the images
    for (let first = 1; first <= pages; first += config.pageBatch) {
      const last = Math.min(pages, first + config.pageBatch - 1);
      const prefix = path.join(dir, "p");
      await renderPages(config.pdftoppm, original, prefix, first, last, config.pageWidth);
      const pngs = (await readdir(dir)).filter((f) => /^p-\d+\.png$/.test(f));
      for (const file of pngs) {
        const page = Number(/^p-(\d+)\.png$/.exec(file)![1]);
        const png = path.join(dir, file);
        const webp = await sharp(await readFile(png)).webp({ quality: config.webpQuality }).toBuffer();
        await storage.uploadBuffer(pageImageKey(job.id, page), webp, "image/webp");
        await rm(png);
      }
      log(`job ${job.id}: pages ${first}-${last} done`);
    }

    return {
      ok: true,
      pageCount: pages,
      pageImages: { count: pages, width: config.pageWidth },
      ...(compressedSize ? { compressedSize } : {}),
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message.slice(0, 500) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
