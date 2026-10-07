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
- **Read in the browser**: a PDF reader with highlights, bookmarks, reading
  progress, scroll or single-page modes, a lightweight mode for low-end
  phones, a watermark with the reader's id, and offline saving.
  Very large PDFs on low-end phones get a "open it on a computer" fallback
  for now.
- **Keep a personal library**: upload your own PDFs (up to 10 MB on the
  fast path, larger ones to cloud storage) and read them anywhere.
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
- **Have a say**: surveys anyone can answer at `/surveys`.

**How it runs.** A web app (installable as a PWA) at uniarchive.com.ng,
built and run by one developer. Staff (moderators and admins) review
submissions, school suggestions and reports, upload platform materials,
and send email announcements and newsletters. There is no mobile app, no
paid tier and no advertising.

**Not there yet**: offline saving and low-end-phone page images for large
PDFs (needs a paid background worker), notes on highlights, a dark mode
for PDF pages. Where it goes next is under [Roadmap](#roadmap).

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
(Phase 4); its exact scope is settled in v2 planning. **Later** turns
UniArchive into a full learning platform (Phase 5). The public, plain
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
- **PDF worker** (`services/pdf-worker`): page images so low-end devices can
  read Backblaze PDFs, plus compression for platform files. It needs a paid
  Render background worker (~$7/month). Until then those devices get a
  friendly "open it on a PC or laptop" message. Jobs still queue up and will
  be processed once it's on. To enable it, follow "Deploying on Render" in
  `services/pdf-worker/README.md`.

### v1: left before v2

Product gaps (small, worth closing first):
- **Notes on highlights.** Highlights already store a `note` field
  (`annotationModel.ts`); the reader has no way to write or show it. The
  old public roadmap promised "notes and highlights".
- **Dark mode for PDF pages.** The site has a dark theme, but PDF pages
  stay white. A reader toggle (invert the page canvas, keep images
  readable) closes it. v2's "exclusive reader themes" build on it.
- **Offline for large PDFs.** Only Cloudinary PDFs (≤10 MB) can be saved
  offline; Backblaze ones need page images from the PDF worker (paid
  Render worker, ~$7/month). A cost decision, not code.

Production chores (owner):
- Run `pnpm db:word-counts --apply` (dry run first; not yet run).
- Confirm `pnpm db:text-index --apply` was run (outline search).
- Send a first real broadcast to a small audience (e.g. role = dev): the
  sender `updates@` is verified in Brevo, the first-name greeting fills
  in, and the unsubscribe link reaches the webhook.
- `pnpm brevo:tidy-lists` (dry run), then delete one old list and check its
  campaign's stats survive before the weekly cron does the rest.
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

### v2 (next): Archive Scouts

Make keeping the library accurate feel like a game instead of work, with
no cash payouts.
- **Scout tasks**: bite-sized jobs from the existing queues: is this PDF
  readable, are these details right (today's Help identify), spot-check a
  typed answer, type one page. Each task is small enough for a phone and a
  few minutes.
- **Archive Credits (AC) and XP** per task, scaled by how much the result
  was needed and whether it held up (agreed with others, accepted by
  staff).
- **Daily streaks** with multipliers for days in a row.
- **Rewards**: animated profile frames and avatar rings, gradient names
  and badges in comments and profiles, exclusive reader themes (OLED black
  and others, on top of v1's dark mode), department leaderboards and
  Campus Pioneer banners.

Builds on: badges and `awardBadgesAfter`, `ContributionEvent` (role
progression), `MaterialSuggestion` (agreement by fingerprint),
"Materials that need typing", two-tier verification.

Needs first:
- An in-app notification centre (credits earned, streak at risk, a
  suggestion accepted). Today everything is email.
- Anti-farming rules: credits only for results that are confirmed
  (consensus or staff), daily caps, no credit for your own uploads,
  reversal when work is rejected later.
- A ledger (append-only credit transactions) rather than a counter, so
  balances can be audited and corrected.
- Decide whether credits ever affect roles (today roles come from
  `ContributionEvent`s) or stay cosmetic.

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
