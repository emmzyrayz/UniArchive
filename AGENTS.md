<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UniArchive

Study-material archive for Nigerian university students: past questions,
lecture notes and books, organised by university → faculty → department.
Production: https://uniarchive.com.ng (canonical origin since 2026-10-05; www redirects
to it; see `src/lib/seo.ts`).
Repo: https://github.com/emmzyrayz/UniArchive, deploys from `main` on Vercel.

## Workflow rules

- **Test every fix thoroughly before calling it done.** At minimum:
  `npx tsc --noEmit -p .`, `pnpm lint` (no new warnings), `pnpm test`, and
  `pnpm build`. Add or update tests for logic you change (see Tests).
  Then exercise the change against a running app (`pnpm start -p 3100` after
  a build, or `pnpm dev`): hit the affected pages and API routes, including
  the error paths, and check the server log. Say plainly what could not be
  tested (e.g. a real Google sign-in) instead of implying it was.
- **Keep the docs current** in the same commit: AGENTS.md for how things
  work, README.md for the product overview ("What UniArchive is", read by
  people and other AI tools) and the roadmap. When a roadmap item ships or
  changes, update both README "Roadmap" (detailed: v1 shipped, what's left
  of v1, v2, later) and the public `/about` roadmap (`src/types/roadmap.ts`,
  plain language, statuses done / in-progress / planned).
- **Then commit and push to `main`.** Conventional-commit style messages
  (`feat:`, `fix:`, `chore(seo):` ...), one logical change per commit.
- Never write test data to the database in `.env.local` (it is the real
  one). Test DB-touching logic by reading code paths and hitting endpoints
  signed out, or ask first.
- **Dev mode** (`lib/auth/devAuth.ts`): with `DEV_USER_UPID=<your upid>` in
  `.env.local`, `pnpm dev` on localhost treats every request as that
  account (`getCurrentSessionUser`, `getServerSessionUser` and the proxy
  skip sign-in; roles and permissions still apply), with a 🛠 DEV MODE
  badge at the top (`DevModeBadge`, `GET /api/auth/dev-mode`). Off unless
  NODE_ENV is "development" (inlined as "production" by `next build`),
  never on Vercel, never for requests from another device's network URL.
  `.env.local` points at the real database, so dev-mode changes are real.
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
- `SMTP_*` is required: there is no fallback sender (the old Gmail one,
  `EMAIL_USER`/`EMAIL_PASS`, was removed). Without it the server warns at
  startup and email isn't delivered.
- ZeptoMail is transactional only (its terms forbid bulk mail). Broadcasts
  and newsletters go through Brevo instead (`BREVO_API_KEY`).
- Every email uses the frame in `lib/emailLayout.ts` (pure, so the admin
  preview matches what's sent).
- `/admin/mail` (permission `mail.send_user`: com_admin, webmaster, dev; no
  /mod copy): an admin writes plain text to one user (`MailAdmin`; the
  greeting, sign-off and reply footer are added by `renderStaffMessage`)
  and `POST /api/admin/mail` sends it through ZeptoMail. Each attempt is a
  `SentMail` (masked address, the message, status, provider message id or
  error; deleted after a year). The client sends an `Idempotency-Key`, so
  a retry never sends twice; a failed send is logged and needs a new key.
  Rate limit 30/hour per admin. `/admin/users` links each user to it
  (`?to=<upid>`).
- Bulk-email consent (`lib/emailPrefs.ts`, `user.emailPrefs`):
  `announcements` (on unless turned off) and `newsletter` (off until opted
  in); absent = those defaults. Changed in Settings > Notifications
  (`/api/user/email-preferences`) or, signed out, from the personal link
  every broadcast must carry: `/email-preferences?u=<upid>&t=<token>`
  (`emailPrefsUrl`; token = HMAC of the user id with a key derived from
  `JWT_SECRET`; `POST /api/email-preferences`). Transactional mail ignores
  these.
- Brevo (`lib/brevo.ts`, `BREVO_API_KEY`, `BREVO_API_URL` to point tests at
  a fake): `POST /api/webhooks/brevo?token=<BREVO_WEBHOOK_SECRET>` (or a
  Bearer header) turns both kinds off on "unsubscribe"/"spam" and sets
  `emailPrefs.brevoBlocked` (Brevo blocks the address for every campaign).
  Opting back in lifts the block (`PUT /contacts/{email}`
  `emailBlacklisted: false`). Contacts aren't kept in sync continuously:
  the broadcast send imports the audience with fresh attributes.
- Broadcasts (`/admin/mail/broadcasts`, permission `mail.broadcast`:
  com_admin and dev only), modelled on the diuscadi project's registry:
  - `lib/broadcast/templates.ts` (client-safe): each template declares its
    fields (the editor form is generated from them), its kind of email
    (announcements / newsletter / author's choice) and a renderer. The same
    code renders the preview, the test copy and the sent email. Every value
    is escaped, links must be https (http only for localhost), no raw HTML.
    The HTML carries Brevo merge tags (`{{ contact.FIRSTNAME|default:"there" }}`,
    `{{ contact.PREFS_URL }}`, `{{ unsubscribe }}`), filled by
    `personalize()` for previews and tests. To add a template: one entry in
    `BROADCAST_TEMPLATES` and one case in `renderBody`. A template may set
    `audience` (the criteria a new draft starts with: "Profile nudge"
    starts at incomplete profiles).
  - "Monthly digest" (newsletter): the editor's "Fill in the numbers"
    (`DigestNumbers`, a month picker) calls
    `GET /api/admin/broadcasts/digest-stats?month=YYYY-MM`
    (`lib/broadcast/digestStats.ts`, Lagos calendar month): newly verified
    materials, PDFs shared, typed questions and notes, PDFs identified,
    new verified members, schools with new materials and the library size
    (zero lines left out), plus the month's 4 most-viewed newly verified
    materials. It only fills the fields; the admin edits them before
    sending. Stat lines starting with a number render as big numbers
    (`statGrid`).
  - `lib/broadcast/audience.ts`: criteria stack (school, department, level,
    role, contributors, verified students, incomplete profile, inactive
    7-90 days from `LoginEvent` + session activity, joined between); none =
    everyone. `lib/broadcast/recipients.ts` is the one resolver for the
    count preview and the send: always verified, unsuspended and accepting
    that kind. The picker only offers values users actually have.
  - `Broadcast` stores the template id and field values (not HTML), so a
    draft reopens as left; only drafts can be edited or deleted. Picked
    UniLibrary materials are re-read from the database on every save.
  - "Send me a test" sends the saved draft to the signed-in admin through
    ZeptoMail (one copy to staff is transactional).
  - Sending (`lib/broadcast/send.ts`, `POST .../[id]/send` with the
    recipient count the admin confirmed; 409 + new total if it changed):
    claims the draft (draft -> sending, so a double click can't send twice),
    creates our contact attributes in Brevo if missing (UPID, SCHOOL, LEVEL,
    ROLE, PREFS_URL), a list per broadcast in the "UniArchive broadcasts"
    folder, imports the audience into it with fresh attributes (5,000 per
    import, waits up to 40s each), then creates the campaign from
    `BREVO_SENDER_EMAIL` (default updates@) with Reply-To support@, and
    sends it now or leaves it scheduled with Brevo (10 min to 90 days
    ahead). A failure before Brevo was asked to send puts it back to draft
    with the error; at or after that point it's "failed" and only
    "Duplicate" makes a new draft (it may have gone out). Cancel uses
    `PUT /emailCampaigns/{id}/status {status: "cancel"}` (Brevo won't
    delete a scheduled campaign). Stats come from `globalStats` (cached 5
    min; also flips scheduled -> sent). 10 sends a day per admin.
  - Old lists are tidied (`lib/broadcast/tidyLists.ts`): weekly Vercel
    Cron `/api/cron/tidy-brevo-lists` (Mondays 03:00 UTC, Bearer
    `CRON_SECRET` via `lib/cronAuth.ts`, 50 a run) and `pnpm
    brevo:tidy-lists` (dry run; `--apply` deletes). Only lists in the
    folder named `UA broadcast <id> (<UTC stamp>)` are touched: deleted
    30 days after their broadcast was sent, failed or cancelled, or after
    a day when no broadcast holds them (a send that fell back to draft and
    was retried, or a deleted draft). Lists of scheduled or sending
    broadcasts are kept. The broadcast gets `brevoListDeletedAt`; the
    contacts and the campaign's stats stay in Brevo.
  - Not yet: sending more than ~40s of imports in one request (fine at our
    size).
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
- Settings > Account: profile is edited at `/profile/edit`; passwords are
  changed (or, for Google-only accounts, set) through the emailed reset
  code. Settings > Privacy > "Download my data": `GET
  /api/user/data-export` (`lib/account/dataExport.ts`), one JSON file of
  everything we hold, secrets dropped.
- Account deletion (`lib/account/deletion.ts`): an emailed code
  (`/api/user/delete-account/request` + `/confirm`) sets `user.deletion`
  {requestedAt, purgeAfter = +7 days}, bumps tokenVersion and signs out
  everywhere. Pending accounts have no public profile and get no
  broadcasts; any sign-in cancels it (`startSession` calls
  `cancelPendingDeletion`). Staff roles can't delete their account. The
  daily Vercel Cron `/api/cron/purge-accounts` (Bearer `CRON_SECRET`, 10 a
  run) erases due accounts: books behind a UniLibrary material, the
  materials, typed content, comments and reactions are kept with the upid,
  name and photo blanked (shown as "a former member", `ProfileHandle`);
  everything else is deleted (files, avatar, Brevo contact), the user
  record last so a failed run just resumes. A new collection holding user
  data needs a step in both the export and the purge.
- Field encryption: emails and phones are AES-encrypted, looked up by
  `emailHash` / `phoneHash` (`src/lib/encryption.ts`).
- Signup's school comes from the university catalog (`UniversityCombobox`
  on the Profile step, `GET /api/institutions/universities`), so schools
  approved from suggestions and surveys can be picked at once; register
  stores `universityId`/`universityName`/`universityAbbr` with `school`.
  "My school isn't listed" sends `schoolUnlisted` + the typed name (kept
  as `school`; profile completion then asks for it as a school
  suggestion). A bare name from an older cached app version is matched to
  the catalog by name, or accepted if it's on the old `schoolData` list.
- School email (optional signup step): the address must belong to the
  school picked on the Profile step. `lib/schoolEmail.ts` (shared by client
  and server) gives each school "keys" from its catalog abbreviation and
  website plus the matching `schoolData` entry's (by name or abbreviation;
  most catalog schools were seeded without a website, `schoolData` now
  only supplies those) and accepts a domain where one part is a key followed by
  `edu.ng` or the rest of the school's website domain, with anything before
  it (`stu.unizik.edu.ng`, `student.oauife.edu.ng`). There is no fixed list of
  patterns; fix a school that doesn't match by correcting its entry in
  `schoolData`. `/api/auth/school-email/send` emails a code and returns a
  challenge token (`SchoolEmailChallenge`: code and token hashed, address
  encrypted, TTL), `/verify` checks it (5 attempts), and register
  consumes a verified token (same school, within 1 hour, once) to store
  `schoolEmail` (encrypted), `schoolEmailHash` (unique sparse: one account
  per school email) and `schoolEmailVerifiedAt`. Verifying the main email then awards the
  `verified_student` badge. Signed-in users add or change one from
  Settings > Account (`SchoolEmailCard` popup, `/api/user/school-email`
  + `/send` + `/verify`, `lib/userSchoolEmail.ts`): checked against the
  profile's school (a catalog university not in `schoolData` is matched on
  its own abbreviation and website), stored and badged at once. Both flows
  share the code step in `lib/schoolEmailChallenge.ts`. There's no
  "remove" (the badge is kept for good), only "change".

## Staff areas (/mod and /admin)

- Moderators (`MOD_ROLES`: auditor, course_rep, lecturer, ed_admin) use
  **/mod** only. Platform admins (`ADMIN_ROLES`: com_admin, webmaster, dev)
  use **/admin** and can also use /mod. Both lists live in `src/types/roles.ts`;
  the proxy and `userContext.canAccessRoute` read them through
  `src/lib/routeAccess.ts`. A moderator on an old /admin link is redirected
  to the /mod copy (`modPathFor`).
- Pages open to signed-out visitors are listed once, in
  `PUBLIC_PAGE_PATHS` (`lib/routeAccess.ts`), read by both the proxy and
  the client gate; a page added to only one of them shows "Access Denied".
- Pages that exist in both areas are written once in `src/app/_staff/` (a
  private folder) and mounted by one-line page files in `app/admin/*` and
  `app/mod/*`. Each still checks its own permission (`requireStaffPage`).
  User management (`/admin/users`) is admin-only.
- Shared client components get the area from `StaffAreaProvider`
  (`components/admin/staffArea.tsx`, set by each layout) and build links with
  `useStaffArea().base`; never hard-code `/admin` in them.
- APIs stay under `/api/admin/*` and check fine-grained permissions.

## Reader (/read/[id])

- Highlights are boxes in % of the page (`HighlighterLayer`), drawn with
  pointer events so mouse, pen and touch all work (in highlight mode the
  page doesn't scroll under a finger). Each can carry a note (up to
  `MAX_NOTE_LENGTH`): the sidebar's Highlights tab lists them in page
  order with Add/Edit note and Delete; a 📝 marker on a highlight with a
  note (or "+ Note" for a few seconds after making one) opens it there
  (`showHighlightNote` / `noteRequest` in `readerContext`).
- Annotations sync to `/api/books/[id]/annotations` (full state, 409 on a
  stale `syncVersion`). Two tabs merge with `threeWayMerge`
  (`lib/annotationMerge.ts`, unit-tested): additions from both sides,
  deletions stick, and an item both still have keeps this tab's version
  when only this tab changed it (a note), else theirs.

- Night mode (`useReaderNight`, the toolbar's moon): a per-device setting
  in localStorage (`ua_reader_night`) that adds `reader-night` to the page
  container; `globals.css` inverts only the page canvas / page image
  (`invert(0.9) hue-rotate(180deg)`), so highlights, note markers and the
  watermark keep their colours. The site's own dark theme doesn't reach
  PDF pages. The toolbar hides the always-disabled download icon on phones
  to make room.

- Offline (`lib/offlineCache.ts`, IndexedDB `uniarchive-offline` v2,
  AES-GCM under a non-extractable per-browser key): Cloudinary books save
  their page images (`mode="images"`, any browser). Backblaze books on
  browsers that run pdf.js save the whole PDF instead (`mode="pdf"`,
  `savePdfOffline`): streamed from the signed URL and encrypted in 4 MB
  chunks so it never sits whole in memory, after a storage-space check;
  capped by RAM (`offlinePdfMaxBytes`: 60 MB at 2 GB or less, 150 MB at
  4 GB or unknown, 300 MB above; bigger files get no button). The device
  renders it with pdf.js, so the paid PDF worker isn't needed for this. A
  saved PDF is then read from the device (`PdfCanvas file=`) online or
  offline, and by `OfflineReader` when the service worker serves
  `/offline`. "✓ Offline" offers to remove the copy (`removeCachedBook`
  drops both kinds). Old browsers that can't run pdf.js still can't open
  Backblaze PDFs (`PdfUnsupported`: use a computer) until the PDF worker
  or the phone app.

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
- PDF gifting (`POST /api/books/[id]/gift`, `GiftDialog` on the library
  book card): a student gives a copy of a library book to UniArchive with a
  short note; their profile's school and level are snapshotted. The file is
  copied to `platform/gifts/<owner>/` (B2 copy in-bucket; Cloudinary files
  are downloaded and written to B2), so deleting the original never breaks
  it. The library book gets `giftedAt` and can't then be submitted or gifted
  again (one gift per book: unique `platform.sourceBookId`). Gifts show in
  the admin queue's Gifts tab (`material.review_gifts`) and pre-fill the
  verify form. No credit to the student. Rate limit: 10 gifts/day.
- **PDF worker status: intentionally disabled for now.** It needs a paid
  Render background worker (~$7/month), which isn't available yet, so it
  isn't deployed and `PDF_WORKER_SECRET` isn't set (the internal routes
  answer 503). Until then, an old browser that can't run pdf.js and opens
  a Backblaze PDF sees a friendly fallback (`PdfUnsupported`: open it on a
  PC or laptop; a download button only for the reader's own files) instead
  of page images. Browsers that run pdf.js don't need it, offline included
  (they save the whole PDF; see Reader).
  New Backblaze uploads still get `pdfJob`s queued; they're harmless and get
  processed once the worker is on. To re-enable, follow "Deploying on
  Render" in `services/pdf-worker/README.md`.
- PDF worker (`services/pdf-worker`, its own npm project, Node 24 running
  TypeScript directly; deployed as a Render background worker from
  `render.yaml`, Docker with Ghostscript + poppler). Every Backblaze PDF gets
  `Book.pdfJob` on creation; the worker pulls jobs from
  `/api/internal/pdf-jobs/claim` (HMAC with `PDF_WORKER_SECRET`, 30 min
  lease, 3 attempts), writes WebP page images to `pages/<bookId>/<n>.webp`
  and compresses platform files only, then reports to `.../[id]/complete`.
  `Book.pageImages` makes the reader's image mode (`hasPageImages`) and
  offline save work for Backblaze books. Deleting a book or discarding a
  platform file removes its page images. The worker's S3 client uses
  `requestChecksumCalculation: "WHEN_REQUIRED"` (streamed aws-chunked
  uploads with trailing checksums aren't decoded by every S3-compatible
  store). The root tsconfig excludes `services/`.

## Google Drive import (v1.5, being built)

Plan: README "Roadmap > v1.5". Built so far (commit 1, no routes or UI
yet): the pipeline every source will use.
- `lib/drive/urls.ts` (`parseDriveUrl`, pure, unit-tested): folder, file,
  `open?id=`, `uc?id=` links and bare ids; keeps `resourcekey`.
- `lib/drive/api.ts`: fetch-based Drive v3 client (no googleapis), auth
  `{apiKey}` (public links) or `{accessToken}` (Picker / inbox);
  `getMeta` (shortcuts resolved), `listPdfs` (breadth first, 3 levels,
  500 files), `download` (`alt=media`, resource-key header). Errors are
  `DriveError` with messages people can act on (private link, flagged
  file, rate limit). `DRIVE_API_URL` points tests at a fake.
- `lib/drive/importFile.ts` (`importDriveFile(target, ref, auth, via)`):
  PDF of at most 500 MB -> ledger skip (`DriveImport`: same Drive file +
  md5 for this owner, its book still there, no download) -> download,
  `%PDF-` check, SHA-256 -> duplicate by checksum (`libraryDuplicate`:
  the owner's books; `platformDuplicate`: the queue) -> store -> Book.
  Up to `BUFFER_MAX_BYTES` (50 MB) in memory with a pdf-lib page count;
  bigger files stream to Backblaze (`storageClient.uploadStream`,
  `@aws-sdk/lib-storage` multipart, hashed by a Transform on the way) and
  are deleted again if they turn out to be duplicates or not PDFs.
  Library: Cloudinary up to 10 MB (`uploadPdfFromServer`), falling back
  to Backblaze if Cloudinary refuses; academic details from the owner's
  profile. Platform: `platform/<uid>/` (staff, source `drive`) or
  `platform/inbox/` (source `drive_inbox`, sharer's name and encrypted
  email on `platform.drive`). Never throws for a bad file: returns
  imported / duplicate / failed and logs a `DriveImport` row.
- `lib/bookCreate.ts` (`createLibraryBook`, `createPlatformBook`) builds
  every Book: `POST /api/books`, `/api/upload/finalize` and
  `/api/mod/uploads` use it too. Library books now get `checksum` when
  known (index `{uploaderId, checksum}`; a partial index can't say
  "platform doesn't exist", so it covers any book with a checksum).
- `DriveImport` rows are in the data export and deleted in the purge.

## UniLibrary: unverified PDFs

- Every PDF is listed as soon as it exists, not only once staff verify it:
  a `Material` (one per Book, keyed by `bookId`) starts `status:
  "unverified"` when a student submits (`saveSubmission`), staff upload
  (`POST /api/mod/uploads`) or a student gifts a PDF, and tier-1
  verification / platform publish turn the same record "verified"
  (`verifyMaterialRecord`). All of it lives in `lib/materialPublish.ts`.
  Rejecting a submission or discarding an upload removes the unverified
  record (`removeUnverifiedMaterial`; only hidden if people already
  commented, reacted or typed it out). Bulk uploads have no category or
  submission: shown as "Unidentified PDF" (`categoryBadge`).
- Filters on `materialModel.ts`: `VERIFIED_MATERIALS`; `COMMUNITY_MATERIALS`
  now also excludes unverified ones (no credit, badges or profile listing
  until verified); `PUBLIC_MATERIALS` (active, not hidden by reports) for
  the feed, material pages and who may read a PDF (`bookAccess`).
  Verified-only: sitemap, broadcast material picker, admin counts.
- Public: `GET /api/materials` mixes both (`unverified: true` on the
  summary; `tier=1` = verified only; unverified score 0.75× in trending,
  unidentified never trend; `allCount` includes unidentified). Cards and
  `/materials/[id]` show `VerificationBadge`; an unverified page is
  noindex with no JSON-LD and opens `UnverifiedNotice` once per device;
  the reader shows a banner (`Book.unverifiedMaterialId`).
- Reports: `POST /api/materials/[id]/report` (`MaterialReport`, one per
  user, reasons in `lib/constants/materialReports.ts`, `materialReport`
  limiter). Three reports hide an unverified PDF (`hiddenByReports`) until
  staff "Restore" it in /materials (`clearReports`); verified ones are
  only counted. Reports are in the data export and deleted in the purge.
- "Help identify this PDF" (`HelpIdentify`): a floating, non-blocking
  panel on `/materials/[id]` and in the reader (`ReaderShell`), opened
  from a launcher button (bottom left), the notice, the Unverified callout
  or the reader banner, so people can read while they fill it in. It drags
  by its header on computers, is a bottom sheet on phones, minimises to a
  bar, and stays mounted when closed so typing isn't lost. Signed-in
  readers suggest the details of an
  unverified material (`MaterialSuggestion`, one per user per material,
  editable while pending), using the shared submission form fields and the
  same validation (`parseSuggestion` in `lib/materialSuggestions.ts`;
  `materialSuggest` limiter). `GET/POST /api/materials/[id]/suggestions`;
  staff get `groups` by `fingerprint` (category, course code, school,
  level). Staff use them in `SuggestionsPanel`: the review drawer's
  "Verify with these details" sends `suggestionId` to tier-1 verify (the
  submission takes the suggestion's details first); the platform verify
  workspace's "Use these details" fills the form and publish sends
  `suggestionId`. `settleSuggestions` accepts it and every agreeing one,
  declines the rest (also on a plain verify), and awards "PDF Detective"
  at `PDF_DETECTIVE_ACCEPTED` (5) accepted. Accepted suggestions aren't
  ContributionEvents (those drive role progression). Queues show a 💡
  count. Deleting an unverified listing deletes its suggestions and
  reports; suggestions are in the data export and deleted in the purge.
- Existing databases need `pnpm db:unverified-materials --apply` once
  (dry run without `--apply`): it swaps the plain unique `submissionId_1`
  index for the partial `submissionId_partial` (until then only one
  unidentified upload can be listed), marks old materials verified and
  lists PDFs already waiting. Run on production 2026-10-07.

## Conversion workspace (typing out materials)

- `/contribute/[materialId]` (`?doc=<id>` edits a typed note): the PDF
  (`components/pdf/PdfPane`, or page images on devices that can't run
  pdf.js) beside an editor. Computer: side by side with a resizable divider;
  phone: a PDF | Type switcher. Same rules as typed content: past questions
  on EXAMS by anyone signed in; notes on LEARNING_AIDS/BOOKS by
  collaborator+; editing a note by its author or auditor+
  (`lib/conversionDrafts.ts`, `canWriteNotes`/`canEditNote` in
  `lib/layer2.ts`). Entry points: the material page's Typed Questions /
  Typed Notes tabs and "Edit beside the PDF" on a note.
- Drafts: `ConversionDraft` (one active per user, material, kind and
  target; 20 active max; deleted 180 days after last touched) via
  `/api/conversions/drafts` (+ `[id]`, `[id]/finish`). Every save sends the
  revision it builds on; a stale one gets 409 with the server copy.
- Autosave (`lib/draftSync.ts`, `useDraftSession`): IndexedDB first
  (~500ms), then the server every ~10s, when the page is hidden, on
  reconnect and on "Sync now". Conflicts merge question items by
  `clientItemId` (deletions remembered); for a note this device wins and
  the other version is offered. One tab edits at a time (Web Locks), others
  are read-only via BroadcastChannel. A 401 keeps work on the device until
  the user signs back in. Signing out (navbar, or "sign out all devices")
  syncs, warns about drafts that still can't sync, then clears that
  user's drafts from the device (`useDraftSafeSignOut`).
- Submits: each question on its own, notes on publish, with an
  `Idempotency-Key` (stored as `submissionKey`, sparse unique) so retries
  never duplicate. Note edits send `baseUpdatedAt`; a changed note gets 409
  with the latest version. `wordCount` is stored on questions and notes;
  older records need `pnpm db:word-counts --apply` (dry run without
  `--apply`; run on production 2026-10-07, nothing was missing).
- Dashboard Conversions tab (`/dashboard?tab=conversions`): drafts in
  progress plus stats from published work (`GET /api/conversions/stats`,
  `lib/conversionStats.ts`), cached 5 min in Upstash per user, dropped on
  submit/edit/delete, failing open with short timeouts. "Materials that
  need typing" (`GET /api/conversions/needs-typing`, `lib/needsTyping.ts`)
  lists active materials with no typed content the user may type (EXAMS for
  everyone, notes for collaborator+), minus their own active drafts,
  nearest first: same department + level, department, faculty, school,
  then popular; most-viewed first within each, with how many other people
  are typing each one.

## Surveys

- Run on the site instead of Google Forms, so answers are analysed in the
  admin (charts, filters, export). Managed at `/admin/surveys` (permission
  `survey.manage`: com_admin and dev; no /mod copy).
- `lib/survey/questions.ts` (client-safe) is the one definition of question
  types (short/long text, single/multi choice with an optional "Other"
  box, dropdown, yes/no, rating 1-5, scale 0-10 with end labels, number),
  of what a valid answer is (`cleanAnswers`, shared by the form and the
  API) and of the "About you" fields (name, email, school, level, who:
  each off/optional/required per survey). Choices are stored by option id,
  so rewording an option keeps its results.
- `Survey` (draft/open/closed, optional open/close window). The builder
  (`SurveyBuilder`) edits beside a live preview that uses the public
  question component (`components/survey/SurveyQuestions`). Once a survey
  has answers, `lockedChanges` refuses removing questions or options,
  changing a type or a scale, and new required questions (409); "Duplicate"
  makes a new draft for bigger changes. Only drafts without responses can
  be deleted.
- Public: `/surveys` and `/surveys/[slug]` (anyone, signed in or not;
  noindex; `isPublicSurveyPath` in `lib/routeAccess.ts`). One
  `SurveyResponse` per person: signed-in by `userId`, signed out by a
  random key in the httpOnly `ua_survey_key` cookie (only its hash is
  stored); answering again edits it until the survey closes. Signed-in
  people get "About you" prefilled from their profile. Email is encrypted
  (+ hash) and only for follow-up. Spam: hidden `website` field, at least
  3 s between showing the form and sending, `surveyResponse` limiter (20 an
  hour per IP). `POST /api/surveys/[slug]/responses`.
- School data: the form picks university, faculty and department from the
  catalog, with "not listed" at each step. Typed parts go through
  `classifySuggestion` (`lib/survey/respond.ts`): an exact catalog match
  fills in the ids; otherwise a `SchoolSuggestion` with `source: "survey"`
  (no submitter) is created, or an existing one for the same school +
  faculty + department is reused with its priority raised. The response
  points at it (`schoolSuggestionId`); approving it in `/suggestions`
  fills the catalog records into those responses (`placeSurveyResponses`
  in `lib/suggestionReview.ts`). A typed school or faculty needs the
  parts below it.
- Results (`/admin/surveys/[id]/results`, `lib/survey/analysis.ts`):
  per-question summaries worked out in memory from the matching responses
  (fine up to 50,000; past that the charts cover the newest), facets for
  the filters (school or "not in our list", faculty, department, level,
  who, signed in or out, Lagos dates, text search), responses per day, the
  individual responses (delete one for spam) and CSV/JSON export
  (streamed, Excel-ready BOM, formula cells defused; `surveyExport`
  limiter). Charts are CSS bars: there's no chart library.
- Reach: `GET /api/surveys/open` (open surveys and whether this visitor
  answered) feeds the ribbon (`scrollribbon.tsx`) and the dashboard
  banner (`SurveyBanner`, "Not now" remembered in localStorage). The
  "Survey invite" broadcast template emails a link through Brevo.
- Accounts: the data export includes signed-in responses; the purge keeps
  them in the results without userId, name, email or IP hash.
- README "Writing survey questions" is the brief for writing questions
  (types, limits, the JSON shape `cleanQuestions` accepts). Keep it in step
  with `LIMITS` and `QUESTION_TYPES` in `lib/survey/questions.ts`. "Paste
  questions" in the builder (`ImportQuestions`, `parseQuestionImport`)
  takes that JSON, or an AI answer with ```json blocks, and appends it
  (optional when the survey already has answers). The recommend score
  only shows for 0-10 scales whose label mentions "recommend".

## SEO

- `/materials/[id]` is server-rendered (`page.tsx` loads it with
  `lib/materialDetail.ts`, the same loader as `GET /api/materials/[id]`;
  `MaterialView.tsx` is the interactive client part) and indexable: title,
  course, school, outline and a preview of up to 30 typed questions and 20
  typed notes are in the HTML, with LearningResource + BreadcrumbList
  JSON-LD and a description that puts the searchable facts first (snippets
  stop around 160 characters). Missing or inactive materials are a real
  404 (noindex).
- `/sitemap.xml` lists every active material (up to 45,000; past that use
  `generateSitemaps()`), regenerated hourly. `next build` pre-renders it,
  so it reads the database: build against a throwaway one when testing.
- JSON-LD must escape `<` to the six characters backslash-u003c (in a JS
  string literal written with two backslashes); with one backslash it is just `<` again.

## Gotchas

- react-pdf 11 defaults to Suspense mode: a load error also throws to the
  nearest error boundary and takes the whole page down. Pass
  `suspense={false}` (see `PdfPane`) and handle `onLoadError`.
- `NEXT_PUBLIC_APP_URL` is inlined at build time (site URL for links and
  metadata). Never call our own API over HTTP from a server component: the
  reader layout used to, through that URL with the cookies copied over, and
  a redirect on the way (another host) dropped them, sending signed-in
  readers back to sign in, then home, in a loop. Share the code instead
  (`lib/readerBook.ts` serves both `/read/[id]` and `GET /api/books/[id]`),
  and keep `from=` on any redirect to sign-in.
- `src/app/favicon.ico` must hold RGBA PNGs: Turbopack (`pnpm dev`) can't
  decode RGB ones ("The PNG is not in RGBA format"), webpack builds can.
  Regenerated 2026-10-06 (same pixels, alpha added).
- Mobile widths: a `grid` that only sets columns at a breakpoint
  (`sm:grid-cols-2`) has an *auto* column on phones, which grows to its
  widest content (a scrolling tab strip, a long email or file name) and
  pushes cards off screen. Always give it a phone column too:
  `grid grid-cols-1 sm:grid-cols-2` (`grid-cols-1` is `minmax(0,1fr)`).
  Don't centre something that can be wider than the screen with flex
  `justify-center` (its left edge becomes unreachable): use an
  `overflow-x-auto` wrapper and `mx-auto w-fit` (the reader does).
  PDF pages fit the screen width on first load when the default zoom
  would be wider (`fitToWidth` in `PdfCanvas`, `MIN_ZOOM` 0.3).
- next-pwa's `reloadOnOnline` is **off** on purpose: it reloaded every page
  on reconnect, wiping in-progress work. The `/offline` fallback page
  reloads itself when the connection returns instead.

## Features in place

UniLibrary (public browsing, trending sort, reactions, threaded comments,
reports), PDF reader with highlights, bookmarks and reading progress, uploads
and submissions with admin review, typed content (past-question Q&A, lecture
note editor, `/materials/[id]`, the conversion workspace and the dashboard
Conversions tab), role progression and applications, badges,
public profiles (`/profile/[upid]`), surveys (`/surveys`, results in the
admin), full admin panel (`/admin`), SEO
(metadata, sitemap, robots, OG images, JSON-LD), privacy and terms pages.

## Tests

- `pnpm test` (Vitest; `pnpm test:watch` while working). Two projects in
  `vitest.config.mts`: `tests/unit` (pure logic, no database or network)
  and `tests/db` (logic that talks to MongoDB). The db project starts its
  own in-memory MongoDB (`mongodb-memory-server-core`,
  `tests/db/globalSetup.ts`; the first run downloads the binary to
  `~/.cache/mongodb-binaries`), gives each file a fresh database, and
  refuses any URI that isn't that server (`tests/db/setup.ts`). It never
  reads `.env.local`: the config sets fixed test secrets
  (`ENCRYPTION_KEY`, `JWT_SECRET`, `HASH_SALT`, `NEXT_PUBLIC_APP_URL`).
- Seed with `Model.collection.insertMany` to skip schema validation, but
  call `await Model.init()` first so the unique indexes exist: otherwise a
  seed that breaks one (users need unique `emailHash` and `uuid`;
  suggestions a `userId`; typed questions a `questionNumber`) only fails
  when the background index build wins the race. Stub external APIs in-process with
  `vi.stubGlobal("fetch", ...)` (see `tests/db/tidyLists.test.ts` for a
  fake Brevo).
- Covered so far: survey questions/answers, outlines, route access,
  draft merging, broadcast templates (escaping, links, digest), Lagos
  months, field encryption and preference links, school email matching,
  the material lifecycle (unverified -> verified -> removed), broadcast
  recipients, digest numbers, Brevo list tidying, Drive links and the
  Drive import pipeline (fake Drive, mocked storage). Not covered: API
  routes and pages (still exercised by hand or scripted runs against
  `pnpm start`), React components.
- CI (`.github/workflows/ci.yml`): typecheck, lint and tests on every push
  to main and every pull request (Node 24). The build isn't run there: it
  needs a database for the sitemap, and Vercel builds every deploy.

## Roadmap

README "Roadmap" is the plan of record: v1 (the web platform, Phases 1-2)
is live, with a short "left before v2" list; v2 is Archive Scouts
(gamified micro-tasks, Archive Credits, streaks, cosmetic rewards) and a
Flutter phone app; later is a full learning platform (OCR, courses,
practice, assignments, study rooms). Each v2/later item lists what it
needs first (e.g. a notification centre and a credit ledger before
Scouts; token auth and a versioned `/api/v1` before the app). Earlier
planning documents assumed FastAPI + PostgreSQL; that was superseded by
this Next.js + MongoDB codebase.

## Known gaps

- `/settings` has no UI-only controls left (profile editing links to
  `/profile/edit`).
- No automated tests for API routes, pages or components yet: those are
  checked against a running app (see Workflow rules), with scripted runs
  against a throwaway MongoDB, never the `.env.local` DB. For Backblaze, run `s3rver` with a self-signed cert (the storage client
  always uses https) and `NODE_TLS_REJECT_UNAUTHORIZED=0` for Node. Chrome
  rejects its certificate; to load PDFs in the browser, run a plain-HTTP
  relay to it on another port and, in the page, rewrite the signed URL's
  origin to the relay in `fetch`/`XMLHttpRequest` before the PDF loads
  (pdf.js fetches on the main thread). Browser uploads to it are untested.
