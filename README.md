# UniArchive

A study-material archive for Nigerian university students: past questions,
lecture notes and textbooks, organised by university → faculty → department,
readable in the browser (even on low-end phones and offline) and typed out
by contributors so they're searchable.

- Production: https://uniarchive.com.ng (deploys from `main` on Vercel)
- Personal project. This file explains **what UniArchive is** (for anyone,
  people or AI tools, who needs the product picture) and tracks **where it
  is going**; architecture, conventions and how things work live in
  [AGENTS.md](AGENTS.md).

Last updated: 2026-10-07.

---

## What UniArchive is

**The problem.** Nigerian students pass study materials around in WhatsApp
groups, photocopies and phone galleries: past questions are hard to find
before exams, lecture notes disappear when a course rep graduates, and
scanned PDFs can't be searched. Data is expensive and many students use
low-end Android phones.

**Who it's for.** Students at Nigerian universities (federal, state and
private), plus graduates, lecturers and people preparing for university.
Content is organised by university → faculty → department → level (100L
to 500L/600L, postgraduate) and course code.

**What people can do today**
- **Find materials** in the UniLibrary, free and without an account: past
  questions, mock exams, lecture notes, course materials, tutorial and
  summary sheets, syllabuses, assignments and solution guides, projects,
  lab reports, slides, recorded lectures and textbooks. Filter by school,
  faculty, department, level, course and type; sort by newest or trending.
  Each material has a public page (searchable on Google) with its course
  details, table of contents or course outline, and typed questions.
  Every PDF appears as soon as it's shared: ones our team hasn't checked
  yet carry an **Unverified** badge (staff uploads nobody has described yet
  show as "Unidentified PDF"), stay out of Google until checked, and can
  be reported; three reports hide an unverified one until staff look.
  Anyone signed in can **help identify** an unverified PDF (title, course,
  school, level...); staff verify it with the details people agree on in
  one click, and helpers earn the PDF Detective badge.
- **Read in the browser**: a PDF reader with highlights (with your own
  notes, on a computer or a phone), bookmarks, reading progress, a night
  mode that darkens the pages, scroll or single-page modes, a lightweight mode for low-end
  phones, a watermark with the reader's id, and offline saving.
  Very large PDFs on low-end phones get a "open it on a computer" fallback
  for now.
- **Keep a personal library**: upload your own PDFs (up to 10 MB on the
  fast path, larger ones to cloud storage) and read them anywhere, or
  import PDFs from Google Drive (pick them from your own Drive, or paste
  a shared folder's link; server to server, so it doesn't use the
  student's data).
- **Contribute**: submit materials to the UniLibrary (staff verify them in
  two tiers), gift a PDF to UniArchive, or type out past questions and
  notes beside the PDF in the conversion workspace (autosaves, works
  offline, syncs across devices). The dashboard suggests "materials that
  need typing" from your own department first.
- **Community**: react to and comment on materials (threaded, with
  reporting), public profiles, badges (First Upload, Verified Contributor,
  Popular Upload, Helpful Commenter, School Pioneer, Verified Student,
  Verified Lecturer and more) and role progression: student → collaborator
  → auditor, course rep, lecturer (by application and staff review).
- **Accounts**: email and password or Google sign-in, new-device codes,
  sign-in history, sign out of other devices, an optional school email
  that earns the Verified Student badge, email preferences, download all
  your data, delete your account.
- **Notifications**: a bell in the menu (and a notifications page on
  phones) tells you when your material is verified or turned down, a PDF
  you helped identify is verified, you earn a badge, or a role application
  is decided.
- **Archive Scouts**: small tasks at `/scouts` (identify a PDF, say
  whether one is readable, check a typed past question against the
  paper), nearest to your department first. Answers are paid in Archive
  Credits and XP once confirmed (3 Scouts agree, or staff accept the
  details); credits have no cash value and never change roles. Three
  tasks a day builds a streak that multiplies pay (up to x1.5), with a
  reminder before it ends and Scout badges (Week Streak, Campus Pioneer
  and more). Credits buy streak freezes and repairs in the Scouts shop
  (`/scouts/shop`).
- **Have a say**: surveys anyone can answer at `/surveys`.
- **Share without an account**: share PDFs or folders with UniArchive's
  Gmail in Google Drive; they're imported for our team to check and
  publish.

**How it runs.** A web app (installable as a PWA) at uniarchive.com.ng,
built and run by one developer. Staff (moderators and admins) review
submissions, school suggestions and reports, upload platform materials,
and send email announcements and newsletters. There is no mobile app, no
paid tier and no advertising.

**Not there yet**: old phones whose browser can't run the PDF viewer
can't open large PDFs (they're told to use a computer) until the paid
page-image worker or the phone app arrives. Where it goes next is under [Roadmap](#roadmap).

## Writing survey questions

Surveys are built at `/admin/surveys`. This section is the brief for
writing questions, by hand or with an AI tool.

**Each survey already asks "About you"** (the admin picks which, each off,
optional or required): name, email (only for follow-up), school + faculty +
department (picked from our catalog, or typed if missing, which feeds the
catalog), level (100L-600L, PG) and who they are (student, graduate,
lecturer/staff, preparing for university, other). Don't repeat these as
questions; results can already be filtered by all of them.

**Question types** (`type` value in brackets):
- Short answer (`short_text`, up to 300 characters) and paragraph
  (`long_text`, up to 5,000).
- Multiple choice, pick one (`single_choice`) and checkboxes, pick any
  (`multi_choice`): 2-30 options, optional "Other: ___" box
  (`allowOther`).
- Dropdown (`dropdown`): pick one, 2-30 options, no "Other" box.
- Yes / No (`yes_no`).
- Rating, 1-5 stars (`rating`).
- Scale (`scale`): from 0 or 1 up to 3-10, with optional words under each
  end (`minLabel`, `maxLabel`). A 0-10 question that mentions
  "recommend" also gets a "would you recommend" score in the results.
- Number (`number`), with optional smallest and largest (`min`, `max`).

**Limits and rules.** At most 50 questions per survey (keep real surveys
much shorter: 10-25 questions, about 5 minutes, or people stop halfway;
split a long question bank into several themed surveys). Question text up
to 300 characters, help text up to 500, each option up to 150. Any
question can be required. Once people have answered, questions and
options can be reworded and new optional questions added, but not removed
or changed in type.

**Format.** A survey's questions are a JSON array like this. Paste it
(or an AI tool's whole answer with its ```json blocks) into **Paste
questions** in the survey builder; ids are added for you:

```json
[
  {
    "type": "single_choice",
    "label": "How did you first hear about UniArchive?",
    "help": "Pick the one that brought you here.",
    "required": true,
    "options": [{ "label": "A friend or coursemate" }, { "label": "WhatsApp group" }, { "label": "Course rep" }],
    "allowOther": true
  },
  {
    "type": "scale",
    "label": "How likely are you to recommend UniArchive to a coursemate?",
    "required": true,
    "min": 0,
    "max": 10,
    "minLabel": "Not likely",
    "maxLabel": "Very likely"
  },
  { "type": "long_text", "label": "What would make UniArchive more useful for your exams?" }
]
```

Fields: `type`, `label` and `required` on every question; `help`
optional; `options` for single_choice, multi_choice and dropdown;
`allowOther` for single_choice and multi_choice; `min`/`max` for scale
and number; `minLabel`/`maxLabel` for scale.

**Good questions for UniArchive** are short, one idea each, in plain
Nigerian-student English, and about things we can act on: how people
find and share materials today, which features they use, what's missing
for their course or school, device and data limits, reading habits,
willingness to contribute or type out materials, trust in verified
content, and what would make them come back.

## Roadmap

Three stages. **v1** is the web platform (Phases 1 and 2), live at
uniarchive.com.ng. **v2** adds Archive Scouts (Phase 3) and a phone app
(Phase 4). **v2.5** adds `/hub`, a social space for student life
(Phase 5). **Later** turns UniArchive into a full learning platform
(Phase 6). The public, plain
language version is the roadmap on `/about` (`src/types/roadmap.ts`);
keep the two in step.

Earlier planning documents assumed FastAPI + PostgreSQL. UniArchive is
built on Next.js + MongoDB (see AGENTS.md), and the plans below assume
that stack.

### v1: shipped

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
- SEO: metadata, sitemap, robots, OG images, JSON-LD. UniLibrary material
  pages are server-rendered and indexable (October 2026): each has its
  course, school, outline and a preview of its typed questions in the HTML,
  LearningResource JSON-LD, and a place in the sitemap.
- School email verification at signup (October 2026): optional step, the
  address must belong to the picked school, a code proves it, and it earns
  a Verified Student badge. Added or changed later from Settings too.
- Mail system (October 2026): ZeptoMail for one-to-one mail (account
  emails, and admins writing to a user at `/admin/mail`); Brevo for
  broadcasts at `/admin/mail/broadcasts` (nine templates, including a
  monthly digest that fills in the month's numbers and a profile nudge
  aimed at incomplete profiles; stacking
  audiences, live preview and count, test copy, send now or schedule,
  cancel, stats). Users choose announcements (default on) and the
  newsletter (opt-in) in Settings or from a link in every broadcast, and
  Brevo unsubscribes flow back by webhook.
- Account control (October 2026): Settings links to profile editing and
  password change, "Download my data" exports everything as JSON, and
  accounts can be deleted (emailed code, 7-day grace that a sign-in
  cancels, then a daily purge that keeps published work anonymously).

- Surveys (October 2026): run on UniArchive instead of Google Forms.
  Admins build them (nine question types, choose which "about you" details
  to ask), anyone can answer at `/surveys` signed in or not, and results
  are analysed in the admin: a chart per question, filters by school,
  faculty, department, level and more, every response, and CSV/JSON
  export. Schools, faculties and departments people type that we don't
  list go to the school-suggestion review and get added to the catalog.
  Open surveys show in the ribbon and on the dashboard, and the "Survey
  invite" broadcast emails them.
- "Materials that need typing" on the dashboard Conversions tab
  (October 2026): untyped past questions and notes near the contributor
  first (their department and level, then faculty, school, popular).

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

**Built, switched off**
- **PDF worker** (`services/pdf-worker`): page images so old browsers that
  can't run the PDF viewer can read Backblaze PDFs, plus compression for
  platform files. It needs a paid Render background worker (~$7/month).
  Until then those browsers get a friendly "open it on a PC or laptop"
  message. Modern browsers don't need it, offline included: they save and
  render the whole PDF themselves. Jobs still queue up and will
  be processed once it's on. To enable it, follow "Deploying on Render" in
  `services/pdf-worker/README.md`.

### v1: left before v2

Product gaps: none left (notes on highlights, night mode and offline
saving of large PDFs shipped 2026-10-07). Large PDFs on old phones wait
for the phone app (or the paid PDF worker); they're told to use a
computer meanwhile.

Production chores (owner):
- ~~`pnpm db:word-counts --apply`~~ and ~~`pnpm db:text-index --apply`~~:
  run 2026-10-07, nothing was missing.
- ~~Send a first real broadcast to a small audience~~ (sent 2026-10-07).
  Still worth confirming from it: the sender `updates@` shows without a
  spoofing warning, the first-name greeting fills in, and an unsubscribe
  click turns off both kinds in that user's Settings (the webhook).
- `pnpm brevo:tidy-lists` dry run done 2026-10-07 (one list, too new to
  delete). When the first list passes 30 days, check its campaign's stats
  survive the cron's first deletion.
- Vercel: `CRON_SECRET` set, `NEXT_PUBLIC_APP_URL` on the apex domain,
  `EMAIL_USER`/`EMAIL_PASS` removed; Google OAuth redirect URI and the
  Brevo webhook URL on the apex domain; sitemap submitted in Search
  Console.
- A browser pass of features only tested through their APIs: surveys
  (builder, public form, results), the Help identify panel and the staff
  suggestions panel, the digest's "Fill in the numbers".

Engineering (optional for v1):
- **Tests for API routes and pages**: `pnpm test` covers the core logic
  (unit tests plus database tests on an in-memory MongoDB, run by CI on
  every push); routes, pages and components are still checked by hand.

### v1.5 (shipped 2026-10-08): Google Drive import

Many students keep study material in Google Drive and pass the share link
around. UniArchive takes those PDFs in directly, server to server, so a
student's data is spent only on choosing files, not on moving them. Planned
2026-10-07, shipped 2026-10-08. Live once the owner adds the Google keys
(below); until then each part says it isn't set up.

Four ways in:
1. **Public Drive link** (students and staff): paste an "anyone with the
   link" folder or file URL, see its PDFs (folders searched up to 3
   levels, 500 files), import all or some. No Google sign-in.
2. **Student Drive import**: Google's own file picker (multi-select, so a
   whole folder's PDFs at once) into the personal library; from there they
   submit to the UniLibrary as today.
3. **Staff Drive import** on `/mod|admin/materials/upload`: the picker or a
   public link, into the platform verify queue like bulk uploads.
4. **Platform inbox**: people who'd rather not join share PDFs or folders
   with the UniArchive Gmail; a daily job (and "Check now" in the admin)
   imports new PDFs into the staff queue as unidentified uploads, noting
   who shared them. No contributor credit, as with gifts.

Exact duplicates are skipped and listed in the import summary (by Drive
file, and by SHA-256 of the file: the owner's library for library imports,
the platform queue for staff and inbox imports).

**Why the picker and not folder browsing inside UniArchive.** Google's
`drive.file` permission (only the files a person picks in Google's
Picker) needs no paid security assessment. Listing a person's folders
needs the restricted `drive.readonly` permission: a paid third-party
security assessment (CASA) and weeks of review before the public can use
it. Trade-off accepted: a folder isn't "followed", so files added later
are imported by picking them again. The platform inbox does use
`drive.readonly`, but only for UniArchive's own account.

Build order (one commit each, each tested and documented):
1. **Core pipeline** (done 2026-10-08): Drive URL parser (`lib/drive/urls.ts`), a small
   fetch-based Drive v3 client (`lib/drive/api.ts`, `DRIVE_API_URL` for
   tests), and one import pipeline for every source
   (`lib/drive/importFile.ts`): check it's a PDF of at most 500 MB, skip
   files already imported, download, hash, store, create the Book, log a
   `DriveImport` row. Files up to 50 MB are buffered (page count with
   pdf-lib); bigger ones stream to Backblaze with multipart upload
   (`@aws-sdk/lib-storage`). Library imports of 10 MB or less go to
   Cloudinary (page images, old phones), larger to Backblaze; platform
   imports to Backblaze. Book creation moves into `lib/bookCreate.ts`,
   shared with today's upload routes, so the records are identical.
   Library books get a checksum (dedupe index per owner).
2. **Public link import** (done 2026-10-08): `POST /api/drive/scan` and
   `POST /api/drive/import` (one file per request, the browser runs the
   queue with progress), `DriveImportDialog` on the Library page and the
   staff upload page, daily limits.
3. **Picker import** (done 2026-10-08): Google Identity Services token (`drive.file`,
   short-lived, never stored) plus the Google Picker, in the same dialog.
4. **Platform inbox** (done 2026-10-08): admin page to connect UniArchive's Google account
   (separate OAuth client, refresh token encrypted), daily cron
   `/api/cron/drive-inbox` plus "Check now", queue badge and sharer.
   Admin-only permission.
Each also updates the privacy page (Google API "Limited Use" statement),
terms, the data export and purge (`DriveImport`), AGENTS.md and
`.env.example`.

Owner setup in Google Cloud (before production use):
- Main project: enable the Drive API and the Picker API; a browser API
  key restricted to uniarchive.com.ng (Picker); a server API key
  restricted to the Drive API (public links); add `drive.file` to the
  OAuth consent screen (brand verification only).
- Inbox: a separate project and OAuth client with `drive.readonly`,
  published (not "Testing": its refresh tokens expire after 7 days), used
  only by the UniArchive account.

Testable here: the pipeline against a fake Drive server and the local
storage harness, permissions, limits, duplicates. Not testable without
real Google keys: the Picker, the inbox sign-in and a real public folder;
the owner checks those in production with a test account.

### v2 (next, being planned 2026-10-08): Archive Scouts

Make keeping the library accurate feel like a game instead of work.
Students do small tasks on their phones and earn Archive Credits (AC), XP,
levels and streaks. Credits never affect roles (those keep today's rules)
and are never cash. Reading, searching and offline saving stay free for
everyone: credits buy extras, never the basics.

Decisions (2026-10-08): Scouts before the phone app; first task types are
Identify a PDF, Is this readable? and Check a typed answer; weekly
leaderboards per department (with an opt-out); credits buy bounties and
boosts, streak freezes, certificates, tips and gifts, exam packs, extra
storage and looks; sponsor-funded real rewards (data, airtime, printing
vouchers) wait for a later season.

**The economy core is open (plug and play).** The core knows nothing
about Scouts: every feature that earns or spends credits is a module that
registers earn sources and shop products, so the phone app, the v2.5
`/hub` and partner events plug in without changing it.
- A double-entry, append-only ledger (`LedgerEntry`): every entry moves
  credits between accounts (`user:<id>`, `system:mint`, `system:burn`,
  `system:treasury`, `escrow:<bounty>`, later `hub:<server>`) and sums to
  zero, so an audit is a sum. Each has a unique `sourceKey`, so nothing
  pays twice. Currencies: AC (spendable) and XP (earned only; levels and
  boards); more can be added (a hub or event currency).
- `Wallet` balances updated in the same transaction, rebuildable from the
  ledger.
- `defineEarnSource` (rewards, caps, streak boost, reversible) and
  `defineProduct` (price, limits, level, `fulfil`): one generic buy route
  and a shop page that shows any registered product.
- Admins change prices, rewards, caps and switch modules on or off at
  `/admin/economy` without a deploy. Listeners after each entry drive
  notifications, badges and leaderboards.

Build order (one commit each, each tested and documented):
1. **Notification centre** (done 2026-10-08): a bell with unread count,
   a notifications page, hooked to badges, suggestions, submissions and
   role applications (also what the app's push notifications will use).
2. **Economy core** (done 2026-10-08) as above, with levels, the wallet
   and history APIs, and `/admin/economy`.
3. **Scout tasks** (done 2026-10-08): one card at a time at `/scouts/play`, picked nearest
   first (your department, faculty, school), never your own content.
   Answers settle by consensus (3 agree before 5 disagree); only confirmed
   answers pay. Identify a PDF (today's Help identify; pays when staff
   accept: 15 AC / 20 XP), Is this readable? (3 sample pages; unreadable
   or "not study material" counts like a report; 3 AC / 5 XP), Check a
   typed answer (beside its PDF page; "correct" verifies the typed
   question and pays its typist 5 AC, "mistakes" disputes it and tells
   the typist; 5 AC / 8 XP). Staff can overturn, which takes the credits
   back.
4. **Streaks** (done 2026-10-08): 3 tasks a day keeps it; multipliers ×1.1 (3 days), ×1.25
   (7), ×1.5 (14+). A daily cron sends "streak at risk". Scout badges,
   Campus Pioneer for the first 10 Scouts in a school.
5. **Spending**, one feature per commit, each planned first (order:
   freeze/repair and the shop (done 2026-10-08), looks, tips and gifts,
   bounties and boosts, event codes, certificates, exam packs, storage):
   - Bounties (post AC on a missing paper or on typing a material; others
     can add to the pool; paid when the material is verified, 10% fee,
     refunded after 60 days) and boosts (push a material up the typing
     and task queues for 7 days).
   - Streak freeze (40 AC, hold 2) and repair (100 AC, within 48 h).
   - Tips (5-50 AC, no XP, daily limits) and gifting looks to friends.
   - Exam packs (all verified past questions of a course in one PDF,
     30 AC, built once and shared) and extra library storage.
   - Certificates (a PDF with a public check page, unlocked by level),
     Scout of the week, and invitations to a Campus Scout programme.
   - Event codes: staff or trusted organisers (such as a department's
     Director of Socials) hand out credits at events, from a budget.
   - Looks: avatar frames and rings, gradient names, reader themes (OLED
     black, sepia...), Pioneer banners.
6. **Department leaderboards**: XP earned Monday to Sunday (Lagos); the
   top 3 get a bonus when the week closes.
7. **Staff side**: `/admin/economy` and `/admin/scouts` (settle rates,
   materials flagged by Scouts, people paused for low accuracy, ledger
   adjustments).

Anti-farming: credits only for confirmed results; a daily cap (150 AC
from tasks); a signed task token and a minimum time per task; nothing for
your own uploads or typing; votes stop counting below 60% accuracy after
20 settled answers; reversal when staff overturn a result; tips give no
XP and are limited per pair of people.

Builds on: badges and `awardBadgesAfter`, `MaterialSuggestion` (agreement
by fingerprint), "Materials that need typing", `TypedQuestion.status`
(nothing set it before), reading streak days (`readingStats.ts`).

### v2 (next): the phone app

A Flutter app, Android first, for slow campus networks (50-100 KB/s) and
low-end phones.
- The app shell, PDF engine and an encrypted local library stay on the
  phone (SQLite vault with keys in `flutter_secure_storage`, native PDF
  rendering); launches fetch small JSON deltas.
- Offline reading, typing and checking, with a background sync queue (the
  web's draft sync and `Idempotency-Key` rules carry over).

Needs first, on the web side:
- Token auth for the app (today's sign-in is cookies plus a short JWT):
  long-lived device tokens with revocation, tied to the existing sessions
  list and `tokenVersion`.
- A versioned, documented API (`/api/v1`) with "changes since" endpoints
  for library, progress, highlights and drafts.
- Push notifications (FCM), shared with the notification centre.
- Internal tooling idea: a generator that reads the web API into a JSON
  blueprint and fills a reusable Flutter shell (a Claude skill), so the
  app tracks the web without hand-copying every endpoint.

### v2.5 (after the app): `/hub`, student life

Planned only; to be designed after v2. A place for student life beyond
studying, built with campus community hosts (a department's Director of
Socials runs events and parties and reaches many school communities).
- First, a Discord-like social space: school and department servers,
  channels, events, and plenty to spend points on (server boosts, custom
  emoji, event tickets, profile items).
- Then, if it takes off: lightweight 3D avatars and scenes modelled on
  campus and school life, in the spirit of the Lagos Life sim game.
- Plugs into the economy core as a `hub` module (its own products, earn
  sources, maybe its own currency); event codes from v2 are the first
  step.
- Needs first: moderation, reporting and blocking from day one, and a
  realtime service (Vercel functions can't hold connections open: a
  hosted one such as Ably or LiveKit, or our own server).

### Later: a full learning platform

- **Search inside scanned PDFs (OCR)**: a background job on the PDF
  worker (Tesseract, or a paid service such as AWS Textract) writing
  page text to the search index; math to LaTeX is harder and can come
  after.
- **Course pages**: a real course catalog (today a course is only a code
  on each material), syllabus tracking, modules and progress.
- **Practice**: quizzes, flashcards and self-tests. Typed past questions
  already store options and correct answers, so multiple-choice practice
  can start from them.
- **Assignments**: submission portals for verified lecturers and course
  reps.
- **Study together**: shared libraries, study groups, department channels
  and direct messages, with reporting and moderation from day one.
- **Live study rooms**: group audio (WebRTC) and a shared whiteboard. Vercel
  functions can't hold open connections, so this needs a realtime service
  (a hosted one such as LiveKit or Ably, or our own server).

## Running it locally

```bash
pnpm install
cp .env.example .env.local   # fill in the values
pnpm build && pnpm start -p 3000
pnpm test        # unit + database tests (in-memory MongoDB, never .env.local)
```

`.env.local` points at the real database: never write test data to it.
To skip signing in while developing, set `DEV_USER_UPID` (your account's
upid) in `.env.local`: `pnpm dev` on localhost then signs you in as that
account automatically and shows a 🛠 DEV MODE badge. It does nothing in
production builds.
Testing notes, gotchas and every subsystem are documented in
[AGENTS.md](AGENTS.md).
