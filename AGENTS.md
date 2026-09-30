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
via nodemailer (`src/lib/mailConfig.ts`, ZeptoMail-ready). PWA via
`@ducanh2912/next-pwa`. Env vars are documented in `.env.example`.

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
