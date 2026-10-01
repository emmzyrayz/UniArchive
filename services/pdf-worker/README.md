# UniArchive PDF worker

> **Status: intentionally disabled for now.** Running it needs a paid Render
> background worker (~$7/month), which isn't available yet. Until then,
> low-end devices that can't run the PDF reader get a friendly message for
> Backblaze PDFs (open it on a PC or laptop; a download button only for
> their own files) instead of page images. New uploads keep being queued
> and are processed once the worker runs. To re-enable it, follow
> [Deploying on Render](#deploying-on-render) below.

A background worker that processes PDFs stored on Backblaze B2:

- **Page images** for every Backblaze PDF: each page rendered to a
  1000px-wide WebP at `pages/<bookId>/<n>.webp`. Devices that can't run
  pdf.js read these through the app's image reader (and can save them
  offline).
- **Compression** for platform files only (staff uploads and gifts):
  Ghostscript's `/ebook` preset (images at 150 dpi). The result replaces the
  PDF in place only if it has the same page count and is at least 10%
  smaller. Students' own files are never altered.

## How it talks to the app

It polls `POST {APP_URL}/api/internal/pdf-jobs/claim` for the oldest job,
holds a 30-minute lease on it, does the work and reports to
`POST {APP_URL}/api/internal/pdf-jobs/<id>/complete`. Both requests are
signed with HMAC-SHA256 over `<timestamp>.<body>` using `PDF_WORKER_SECRET`
(see the app's `src/lib/pdfJobs.ts`). If the worker dies mid-job, the lease
runs out and the job is handed out again (3 attempts, then it's marked
failed). Nothing is lost while the worker is down: jobs wait in the queue.

## Deploying on Render

1. In Render: **New > Blueprint**, pick this repo, and use
   `services/pdf-worker/render.yaml` (or create a **Background Worker** by
   hand: Docker, root directory `services/pdf-worker`, plan Starter).
2. Set the secret environment variables in the Render dashboard:
   - `PDF_WORKER_SECRET`: a random string of at least 32 characters
     (`openssl rand -hex 32`)
   - `BACKBLAZE_KEY_ID`, `BACKBLAZE_APPLICATION_KEY`, `BACKBLAZE_BUCKET_NAME`,
     `BACKBLAZE_ENDPOINT`, `BACKBLAZE_REGION`: the same values as the app
3. Set **the same** `PDF_WORKER_SECRET` in the app's Vercel environment and
   redeploy the app. Until it's set there, the internal routes answer 503 and
   jobs just queue up.

`APP_URL` defaults to `https://www.uniarchive.com.ng` in `render.yaml`.

## Settings

| Variable | Default | |
|---|---|---|
| `POLL_MS` | 15000 | Wait between claims when the queue is empty |
| `PAGE_WIDTH` | 1000 | Page image width in pixels |
| `WEBP_QUALITY` | 70 | Page image quality |
| `PAGE_BATCH` | 20 | Pages rendered per pdftoppm run (bounds temp disk) |
| `MIN_SAVING` | 0.1 | Keep compression only if at least this much smaller |
| `GS_COMMAND`, `PDFINFO_COMMAND`, `PDFTOPPM_COMMAND` | gs, pdfinfo, pdftoppm | A command, or a JSON array when a path has spaces |
| `WORK_DIR` | /tmp | Scratch space for downloads and renders |

## Running locally

Needs Node 24+, Ghostscript and poppler-utils (`pdfinfo`, `pdftoppm`).

```sh
cd services/pdf-worker
npm install
APP_URL=http://localhost:3000 PDF_WORKER_SECRET=... BACKBLAZE_...=... npm start
# or one pass over the queue, then exit:
node src/index.ts --once
```
