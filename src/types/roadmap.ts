// types/roadmap.ts
// The public roadmap on /about (RoadmapTracker). Plain language for
// students; the detailed version (versions, scope, prerequisites) is the
// "Roadmap" section of README.md. Keep the two in step.
export type RoadmapStatus = "done" | "in-progress" | "planned";

export interface RoadmapItem {
  title: string;
  description: string;
  status: RoadmapStatus;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  /** "Live", "Next", "Later" */
  stage: string;
  summary: string;
  items: RoadmapItem[];
}

export const roadmap: RoadmapPhase[] = [
  {
    id: "read",
    title: "Phase 1: Your library and reader",
    stage: "Live",
    summary: "Keep your own PDFs and read them comfortably, even on a low-end phone.",
    items: [
      {
        title: "Accounts and security",
        description:
          "Email or Google sign-in, codes for new devices, sign-in history, and your email and phone number encrypted.",
        status: "done",
      },
      {
        title: "Personal PDF library",
        description: "Upload your own PDFs and read them on any device.",
        status: "done",
      },
      {
        title: "In-browser reader",
        description:
          "Highlights, bookmarks, reading progress, page or scroll view, and a lightweight mode for low-end phones.",
        status: "done",
      },
      {
        title: "Install it and read offline",
        description:
          "Install UniArchive from your browser and save any PDF to read without data, stored encrypted on your device. Very old phones can save smaller PDFs; large ones there wait for the app.",
        status: "done",
      },
      {
        title: "Notes on highlights and night mode",
        description: "Write a note on anything you highlight, and darken the pages to read at night without the glare.",
        status: "done",
      },
    ],
  },
  {
    id: "unilibrary",
    title: "Phase 2: The UniLibrary",
    stage: "Live",
    summary: "Past questions, notes and textbooks for every school, shared and checked by students.",
    items: [
      {
        title: "Browse by school and course",
        description:
          "Free, no account needed: filter by university, faculty, department, level, course and type, newest or trending.",
        status: "done",
      },
      {
        title: "Search and material pages",
        description:
          "Search titles, course codes and tables of contents. Every material has its own page you can find on Google.",
        status: "done",
      },
      {
        title: "Share and verify materials",
        description:
          "Submit materials or gift a PDF; our team checks them. New PDFs show at once with an Unverified badge until they're checked.",
        status: "done",
      },
      {
        title: "Help identify PDFs",
        description: "Tell us what an unidentified PDF is (course, school, level) and earn the PDF Detective badge.",
        status: "done",
      },
      {
        title: "Typed past questions and notes",
        description:
          "Type out past questions and notes beside the PDF so they're searchable. Saves as you go, even offline.",
        status: "done",
      },
      {
        title: "Profiles, badges and roles",
        description: "Public profiles, badges for what you contribute, and roles from collaborator to course rep and lecturer.",
        status: "done",
      },
      {
        title: "Comments, reactions and reports",
        description: "Discuss materials in threads, react, and report anything wrong.",
        status: "done",
      },
      {
        title: "Import from Google Drive",
        description:
          "Bring PDFs in straight from Google Drive: pick files from your own Drive, paste a shared folder link, or share them with UniArchive's Gmail without an account.",
        status: "done",
      },
      {
        title: "Surveys and email updates",
        description: "Answer surveys that shape UniArchive, and choose which emails you get.",
        status: "done",
      },
    ],
  },
  {
    id: "scouts",
    title: "Phase 3: Archive Scouts",
    stage: "Next",
    summary: "Small tasks that keep the library accurate, with rewards worth showing off.",
    items: [
      {
        title: "Scout tasks",
        description: "Bite-sized jobs on your phone: check a PDF is readable, tell us what it is, check a typed answer.",
        status: "done",
      },
      {
        title: "Archive Credits and XP",
        description: "Earn credits and experience for every task that's confirmed. Credits are never cash and never buy power.",
        status: "done",
      },
      {
        title: "Spend your credits",
        description:
          "Post bounties for papers you need, tip people whose notes helped, freeze your streak, get exam packs, certificates and more.",
        status: "planned",
      },
      {
        title: "Daily streaks",
        description: "Do 3 tasks a day to build a streak that multiplies what you earn, with a reminder before it ends.",
        status: "done",
      },
      {
        title: "Rewards to show off",
        description: "Animated profile frames, gradient names and exclusive reader themes. Reading stays free for everyone.",
        status: "planned",
      },
      {
        title: "Leaderboards",
        description: "Weekly top scouts in each department, and Campus Pioneer banners for the first in a school.",
        status: "planned",
      },
    ],
  },
  {
    id: "mobile",
    title: "Phase 4: The UniArchive app",
    stage: "Later",
    summary: "A phone app built for slow campus networks and low-end phones.",
    items: [
      {
        title: "Android app",
        description: "Opens instantly and only downloads what changed, so it stays fast on slow networks.",
        status: "planned",
      },
      {
        title: "Encrypted offline library",
        description: "Your PDFs stored securely on your phone and readable without data.",
        status: "planned",
      },
      {
        title: "Contribute offline",
        description: "Type and check materials without a connection; it syncs when you're back online.",
        status: "planned",
      },
    ],
  },
  {
    id: "hub",
    title: "Phase 5: Student life",
    stage: "Later",
    summary: "A social space for campus life, built with the people who run your department's events.",
    items: [
      {
        title: "The Hub",
        description: "School and department spaces with channels and events, and lots to spend your credits on.",
        status: "planned",
      },
      {
        title: "Your campus, in 3D",
        description: "Lightweight 3D avatars and scenes of school life, if the Hub takes off.",
        status: "planned",
      },
    ],
  },
  {
    id: "learn",
    title: "Phase 6: A full learning platform",
    stage: "Later",
    summary: "From finding materials to studying, practising and learning together.",
    items: [
      {
        title: "Search inside scanned PDFs",
        description: "Scanned pages turned into searchable text automatically.",
        status: "planned",
      },
      {
        title: "Course pages",
        description: "Syllabus tracking, modules and your progress through each course.",
        status: "planned",
      },
      {
        title: "Practice",
        description: "Quizzes, flashcards and self-tests built from past questions.",
        status: "planned",
      },
      {
        title: "Assignments",
        description: "Submit assignments to your lecturers and course reps.",
        status: "planned",
      },
      {
        title: "Study together",
        description: "Shared libraries, study groups, department channels and messages.",
        status: "planned",
      },
      {
        title: "Live study rooms",
        description: "Group audio with a shared whiteboard for working through problems together.",
        status: "planned",
      },
    ],
  },
];
