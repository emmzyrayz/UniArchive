// src/index.ts
// UniArchive PDF worker. Polls the app for the next PDF job, processes it
// (page images, and compression for platform files) and reports back, one
// job at a time. Runs as a Render background worker (see render.yaml and
// README.md). If it stops mid-job, the app hands the job out again once the
// lease runs out, so a crash or redeploy never loses work.
import { claimJob, completeJob } from "./appClient.ts";
import { loadConfig } from "./config.ts";
import { processJob } from "./processJob.ts";
import { createStorage } from "./storage.ts";

const config = loadConfig();
const storage = createStorage(config);
const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`);

let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    log(`${signal}: stopping after the current job`);
    stopping = true;
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  log(`PDF worker started; polling ${config.appUrl} every ${config.pollMs / 1000}s`);
  // A single pass mode for tests and one-off runs
  const once = process.argv.includes("--once");

  while (!stopping) {
    let job;
    try {
      job = await claimJob(config);
    } catch (error) {
      log(`claim failed: ${(error as Error).message}`);
      if (once) process.exit(1);
      await sleep(config.pollMs);
      continue;
    }

    if (!job) {
      if (once) break;
      await sleep(config.pollMs);
      continue;
    }

    const started = Date.now();
    log(`job ${job.id}: claimed (attempt ${job.attempt})`);
    const result = await processJob(job, { config, storage, log });
    try {
      await completeJob(config, job.id, result);
      log(`job ${job.id}: ${result.ok ? "done" : `failed: ${result.error}`} in ${Math.round((Date.now() - started) / 1000)}s`);
    } catch (error) {
      // The lease runs out and the job is retried
      log(`job ${job.id}: couldn't report the result: ${(error as Error).message}`);
    }
  }
  log("PDF worker stopped");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
