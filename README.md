# UniArchive: roadmap

A study-material archive for Nigerian university students: past questions,
lecture notes and textbooks, organised by university → faculty → department,
readable in the browser (even on low-end phones and offline) and typed out
by contributors so they're searchable.

- Production: https://www.uniarchive.com.ng (deploys from `main` on Vercel)
- Personal project. This file tracks **where the project is going**;
  architecture, conventions and how things work live in
  [AGENTS.md](AGENTS.md).

Last updated: 2026-10-04.

---

## Shipped

**Foundation (rebuilt September 2026)**
- Accounts: email/password with new-device email codes, Google sign-in
  (linking and relinking with emailed codes), session and login history,
  sign out of one device, other devices or everywhere.
- Personal library: uploads (Cloudinary ≤10 MB, Backblaze B2 for larger
  PDFs), PDF reader with highlights, bookmarks, reading progress and offline
  reading.
- UniLibrary: public browsing and search, trending, reactions, threaded
  comments, reports; submissions with staff review and two verification
  tiers.
- Community: role progression and applications, badges, public profiles.
- Staff areas: `/mod` for moderators, `/admin` for platform admins.
- Email through ZeptoMail (`no-reply@`), support inbox via ImprovMX
  (`support@` → team Gmail).
- SEO: metadata, sitemap, robots, OG images, JSON-LD.
- School email verification at signup (October 2026): optional step, the
  address must belong to the picked school, a code proves it, and it earns
  a Verified Student badge.

**Platform materials (September–October 2026)**
1. Staff bulk upload (in-browser hashing, lossless compression, page counts)
   and a review queue.
2. Verify workspace: PDF beside the details form, published as UniArchive's.
3. Tables of contents and course outlines (imported from PDF bookmarks,
   searchable, deep links into the reader).
4. Students can gift a PDF to UniArchive.
5. PDF worker for page images and compression (built, but off: see below).
6. Conversion workspace: type out past questions and notes beside the PDF,
   with autosave that survives reloads, crashes, dropped connections and
   multiple tabs or devices; dashboard Conversions tab with each
   contributor's stats.

## Built, switched off

- **PDF worker** (`services/pdf-worker`): page images so low-end devices can
  read Backblaze PDFs, plus compression for platform files. It needs a paid
  Render background worker (~$7/month). Until then those devices get a
  friendly "open it on a PC or laptop" message. Jobs still queue up and will
  be processed once it's on. To enable it, follow "Deploying on Render" in
  `services/pdf-worker/README.md`.

## Backlog

Unordered; pick by what matters most at the time.

- **"Materials that need typing"** on the dashboard's Conversions tab: past
  questions and notes with no typed content yet, near the user's courses
  (TODO in `src/components/dashboard/ConversionsTab.tsx`).
- **Add a school email after signup**: from Settings, for Google sign-ups
  and existing accounts (signup is the only place today).
- **Settings that are UI only**: profile editing, notification toggles,
  "Download my data" and account deletion.
- **Indexable material pages**: server-render `/materials/[id]`, drop its
  noindex and list materials in the sitemap (TODO in `src/app/sitemap.ts`).
- **Remove the legacy Gmail sender** (`EMAIL_USER` / `EMAIL_PASS`) now that
  ZeptoMail is live, from the code and the Vercel env.
- **Regenerate `favicon.ico` as RGBA** so `pnpm dev` (Turbopack) works again;
  until then, test against production builds.
- **Automated tests**: there's no test suite yet; changes are checked with
  typecheck, lint, build, and manual and scripted runs against throwaway
  databases.

## Running it locally

```bash
pnpm install
cp .env.example .env.local   # fill in the values
pnpm build && pnpm start -p 3000
```

`.env.local` points at the real database: never write test data to it.
Testing notes, gotchas and every subsystem are documented in
[AGENTS.md](AGENTS.md).
