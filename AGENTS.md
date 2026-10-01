<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UniArchive

Study-material archive for Nigerian university students: past questions,
lecture notes and books, organised by university → faculty → department.
Production: https://www.uniarchive.com.ng (canonical origin, see `src/lib/seo.ts`).
Repo: https://github.com/emmzyrayz/UniArchive, deploys from `main` on Vercel.

## Workflow rules

- **Test every fix thoroughly before calling it done.** At minimum:
  `npx tsc --noEmit -p .`, `pnpm lint` (no new warnings), and `pnpm build`.
  Then exercise the change against a running app (`pnpm start -p 3100` after
  a build, or `pnpm dev`): hit the affected pages and API routes, including
  the error paths, and check the server log. Say plainly what could not be
  tested (e.g. a real Google sign-in) instead of implying it was.
- **Then commit and push to `main`.** Conventional-commit style messages
  (`feat:`, `fix:`, `chore(seo):` ...), one logical change per commit.
- Never write test data to the database in `.env.local` (it is the real
  one). Test DB-touching logic by reading code paths and hitting endpoints
  signed out, or ask first.
- Local Google sign-in under `pnpm start` needs
  `AUTH_TRUST_HOST=true NEXTAUTH_URL=http://localhost:3100` (the `.env.local`
  `NEXTAUTH_URL` points at Vercel, and Auth.js only auto-trusts the host there).

## Stack

Next.js 16 (App Router, `src/proxy.ts` replaces middleware), React 19 with the
React Compiler, Tailwind 4, TypeScript, pnpm. MongoDB via Mongoose
(`src/lib/models`), Upstash Redis for rate limits and the tokenVersion cache,
Cloudinary (≤10 MB PDFs, images) and Backblaze B2 (larger PDFs), SMTP email
via nodemailer (`src/lib/mailConfig.ts`). PWA via `@ducanh2912/next-pwa`. Env
vars are documented in `.env.example`.

## Email

- All transactional email goes through **ZeptoMail SMTP**
  (`smtp.zeptomail.com:587`, STARTTLS, user `emailapikey`, password = the
  Mail Agent's SMTP token) from `UniArchive <no-reply@uniarchive.com.ng>`.
  Reply-To is `support@uniarchive.com.ng`.
- `support@uniarchive.com.ng` has no mailbox: ImprovMX (free plan, 25 alias
  limit) forwards it to `uniarchive.team@gmail.com`. Contact-form messages
  are sent there (Reply-To = the person who wrote in); `CONTACT_EMAIL`
  overrides, so leave it unset in production.
- DNS is on Vercel (`ns1/ns2.vercel-dns.com`). MX points at ImprovMX, and
  the root SPF is `v=spf1 include:spf.improvmx.com ~all`. ZeptoMail uses its
  own return path (`bounce-zem` CNAME → `cluster89.zeptomail.com`, which
  publishes ZeptoMail's SPF) plus a DKIM TXT record whose selector comes
  from the ZeptoMail dashboard. There must only ever be one SPF TXT record
  on the root.
- The legacy Gmail sender (`EMAIL_USER`/`EMAIL_PASS`) is only used while
  `SMTP_*` is unset; delete it everywhere once ZeptoMail is live.
- Check settings with `pnpm email:test uniarchive.team@gmail.com`. To test
  sending code without real mail, point `SMTP_HOST` at a local fake SMTP
  server (`smtp-server` in a scratch folder) and run with
  `NODE_ENV=production`; outside production a failed send is only logged.

## Auth (src/lib/auth, src/app/api/auth)

- Email/password: DB session (`sessionId` cookie, hashed in `SessionCache`)
  plus a 15-minute `session_jwt` the proxy checks. `tokenVersion` on the user
  revokes all sessions (suspension, role change).
- New-device verification: unknown browsers get an emailed code; trusted
  devices keep a 30-day cookie (`deviceRecognition.ts`).
- Google sign-in: Auth.js (next-auth v5 beta) with **no DB adapter** only
  does the OAuth handshake; `/api/auth/social-callback` decides what happens
  (`googleAccount.ts`). `user.googleId` is Google's stable `sub`, pinned in
  the `jwt` callback of `socialAuth.ts`. Without that pin Auth.js hands out a
  random id per sign-in (fixed 2026-09-30; accounts linked before then hold a
  random id and go through a one-time relink).
- Linking Google to an existing account needs the emailed code
  (`/auth/link-account`). Replacing an already-linked Google account
  ("relink") also needs the password when the account has one. Signed-in
  users can connect or reconnect Google from `/settings?tab=privacy`
  (`intent=connect`).
- Google is the only social provider. GitHub and Microsoft were removed on
  purpose (few students use them).
- Sessions and login history: every sign-in goes through `startSession`
  (method + whether an email code was used), which stores device, device
  type, IP and location (from Vercel's `x-vercel-ip-*` headers, see
  `loginContext.ts`) on the session and writes a `LoginEvent` (kept 90 days).
  `/api/auth/sessions` lists them and signs out one device, all other devices
  or everywhere (`scope=all` also bumps tokenVersion and forgets trusted
  devices). Settings > Privacy shows them.
- Field encryption: emails and phones are AES-encrypted, looked up by
  `emailHash` / `phoneHash` (`src/lib/encryption.ts`).

## Staff areas (/mod and /admin)

- Moderators (`MOD_ROLES`: auditor, course_rep, lecturer, ed_admin) use
  **/mod** only. Platform admins (`ADMIN_ROLES`: com_admin, webmaster, dev)
  use **/admin** and can also use /mod. Both lists live in `src/types/roles.ts`;
  the proxy and `userContext.canAccessRoute` read them through
  `src/lib/routeAccess.ts`. A moderator on an old /admin link is redirected
  to the /mod copy (`modPathFor`).
- Pages that exist in both areas are written once in `src/app/_staff/` (a
  private folder) and mounted by one-line page files in `app/admin/*` and
  `app/mod/*`. Each still checks its own permission (`requireStaffPage`).
  User management (`/admin/users`) is admin-only.
- Shared client components get the area from `StaffAreaProvider`
  (`components/admin/staffArea.tsx`, set by each layout) and build links with
  `useStaffArea().base`; never hard-code `/admin` in them.
- APIs stay under `/api/admin/*` and check fine-grained permissions.

## Platform materials (staff uploads, credited to UniArchive)

- A platform file is a `Book` with a `platform` sub-document (status
  pending/published/discarded, uploader, claim lease, saved draft). Every
  query for a user's own books must add `LIBRARY_BOOKS` (bookModel.ts), and
  every per-user material count must add `COMMUNITY_MATERIALS`
  (materialModel.ts), so platform items never show in a library, badge,
  stat or profile.
- Flow: `/mod|admin/materials/upload` (BulkUploader: a Web Worker in
  `src/workers/pdfPrep.worker.ts` hashes the original, losslessly compresses
  and counts pages; files go straight to Backblaze under `platform/<uid>/`)
  -> `/materials/queue` -> `/materials/verify/[id]` (VerifyWorkspace:
  computer + fullscreen only via `useDesktopFullscreen`, PDF right via
  `PdfPane`, form left via the shared `components/submit/materialFields`).
- APIs: `/api/mod/uploads` (+ `presign`, `[id]`, `[id]/claim`, `[id]/draft`,
  `[id]/publish`). Publishing creates a verified `MaterialSubmission` and its
  `Material` with `source: "platform"` through `lib/materialPublish.ts`
  (shared with tier-1 verification) and gives no contributor credit. The
  uploader may publish their own file; community submissions still can't be
  self-verified. Permissions: `material.ingest` (all staff),
  `material.review_gifts` (admins, for student gifts: Phase 4).
- Outlines (`lib/outline.ts`): `Material.outline` is a flat list of entries
  (title, level 1-3, page, printed pageLabel). Its kind comes from the
  subcategory, never the client: textbooks / e-books / course materials get
  a table of contents (every entry needs a page); lecture notes / syllabi /
  tutorials get a course outline (pages optional). `parseOutline` is the
  one validator (API and editor). Edited in the verify workspace and at
  `/materials/[id]/outline` (OutlineEditor, which can import the PDF's own
  bookmarks via `lib/pdfOutline.ts`); shown in the reader's Contents tab
  (returned by GET /api/books/[id]) and on `/materials/[id]` (deep links
  `/read/<book>?page=N`). Outline titles are searchable through the
  `material_text_v2` index: on an existing database run
  `pnpm db:text-index --apply` once (it drops the old `material_text`;
  MongoDB allows one text index per collection).
- Remaining plan (PDF gifting, Render PDF worker):
  `~/.claude/plans/pasted-content-id-9064-tested-the-linked-hopper.md`.

## Gotchas

- react-pdf 11 defaults to Suspense mode: a load error also throws to the
  nearest error boundary and takes the whole page down. Pass
  `suspense={false}` (see `PdfPane`) and handle `onLoadError`.
- `NEXT_PUBLIC_APP_URL` is inlined at build time, and the reader's layout
  fetches its own API through it: a local production server must run on
  that port (3000 with the current `.env.local`) or `/read` fails.
- `pnpm dev` (Turbopack) fails on every page with "The PNG is not in RGBA
  format" from `src/app/favicon.ico`; `pnpm build`/`start` (webpack) work.
  Test against a production build until the icon is regenerated.

## Features in place

UniLibrary (public browsing, trending sort, reactions, threaded comments,
reports), PDF reader with highlights, bookmarks and reading progress, uploads
and submissions with admin review, typed content (past-question Q&A, lecture
note editor, `/materials/[id]`), role progression and applications, badges,
public profiles (`/profile/[upid]`), full admin panel (`/admin`), SEO
(metadata, sitemap, robots, OG images, JSON-LD), privacy and terms pages.

## Known gaps

- `/settings`: profile editing, notification toggles, "Download my data"
  and account deletion are UI only (not wired).
- No automated test suite yet; verification is typecheck, lint, build and
  manual endpoint checks (see Workflow rules). For logic that touches the
  database, run it against a throwaway `mongodb-memory-server` installed in
  a scratch folder (not a project dependency), never the `.env.local` DB.
  For Backblaze, run `s3rver` with a self-signed cert (the storage client
  always uses https) and `NODE_TLS_REJECT_UNAUTHORIZED=0` for Node; Chrome
  can't reach it, so browser uploads/PDF loads against it can't be tested.
