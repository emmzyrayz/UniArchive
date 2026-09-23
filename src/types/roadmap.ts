// types/roadmap.ts
export type RoadmapStatus = "done" | "in-progress" | "planned";

export interface RoadmapItem {
  title: string;
  description: string;
  status: RoadmapStatus;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  items: RoadmapItem[];
}

export const roadmap: RoadmapPhase[] = [
  {
    id: "mvp",
    title: "Phase 1 — Personal Library (Current)",
    items: [
      {
        title: "Account & auth system",
        description: "Sign up, sign in, email verification, password reset",
        status: "done",
      },
      {
        title: "PDF upload & storage",
        description: "Upload and organize your own study materials",
        status: "in-progress",
      },
      {
        title: "In-browser reader",
        description: "Read your PDFs directly, no downloads needed",
        status: "in-progress",
      },
      {
        title: "PWA offline support",
        description: "Access your library even with patchy internet",
        status: "planned",
      },
    ],
  },
  {
    id: "smart-library",
    title: "Phase 2 — Smart Library",
    items: [
      {
        title: "OCR & searchable text",
        description: "Search inside scanned PDFs, not just titles",
        status: "planned",
      },
      {
        title: "Reading progress & bookmarks",
        description: "Pick up exactly where you left off",
        status: "planned",
      },
      {
        title: "Notes & highlights",
        description: "Annotate directly on your documents",
        status: "planned",
      },
    ],
  },
  {
    id: "social",
    title: "Phase 3 — Study Together",
    items: [
      {
        title: "Friend invites & shared libraries",
        description: "Share your collection with people you trust",
        status: "planned",
      },
      {
        title: "Live group study rooms",
        description:
          "Audio chat with a shared live whiteboard while reading together",
        status: "planned",
      },
    ],
  },
];
