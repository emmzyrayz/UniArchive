// components/unilibrary/materialLabels.ts
// Display labels for the UniLibrary feed: badge per category/subcategory,
// the category tabs, and the filter options.
import type {
  MaterialCategory,
  MaterialSubcategory,
} from "@/lib/constants/materialCategories";

type Tone = "amber" | "blue" | "purple" | "teal" | "orange" | "grey";

const TONE_CLASS: Record<Tone, string> = {
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  purple: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  teal: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
  orange: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  grey: "bg-neutral-500/10 text-text-secondary border-border",
};

const SUBCATEGORY_BADGES: Record<MaterialSubcategory, [string, Tone]> = {
  PAST_QUESTION: ["Past Q", "amber"],
  MOCK_EXAM: ["Mock exam", "amber"],
  LECTURE_NOTE: ["Notes", "blue"],
  COURSE_MATERIAL: ["Course material", "blue"],
  SYLLABUS: ["Syllabus", "blue"],
  TUTORIAL: ["Summary", "teal"],
  TEXTBOOK: ["Textbook", "purple"],
  EBOOK: ["E-book", "purple"],
  ASSIGNMENT: ["Assignment", "orange"],
  PROJECT: ["Project", "orange"],
  LAB_REPORT: ["Lab report", "orange"],
  RECORDED_LECTURE: ["Recording", "grey"],
  PRESENTATION: ["Slides", "grey"],
};

const CATEGORY_BADGES: Record<MaterialCategory, [string, Tone]> = {
  EXAMS: ["Past Q", "amber"],
  LEARNING_AIDS: ["Notes", "blue"],
  BOOKS: ["Textbook", "purple"],
  ACADEMIC_WORK: ["Assignment", "orange"],
  MEDIA: ["Document", "grey"],
};

export function categoryBadge(
  category: MaterialCategory,
  subcategory?: MaterialSubcategory,
): { label: string; className: string } {
  const [label, tone] =
    (subcategory && SUBCATEGORY_BADGES[subcategory]) ??
    CATEGORY_BADGES[category] ?? ["Document", "grey"];
  return { label, className: TONE_CLASS[tone] };
}

export const BADGE_CLASS =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap";

/** Feed tabs, one per stored category (the API filters on category). */
export const CATEGORY_TABS: { id: MaterialCategory | ""; label: string }[] = [
  { id: "", label: "All" },
  { id: "EXAMS", label: "Past Questions" },
  { id: "LEARNING_AIDS", label: "Notes & Summaries" },
  { id: "BOOKS", label: "Textbooks" },
  { id: "ACADEMIC_WORK", label: "Assignments & Projects" },
  { id: "MEDIA", label: "Slides & Media" },
];

// Same values the submission form stores
export const LEVEL_OPTIONS = ["100L", "200L", "300L", "400L", "500L", "PG"] as const;

export const TIER_OPTIONS = [
  { id: "", label: "All" },
  { id: "1", label: "✓ Verified" },
  { id: "2", label: "⭐ Endorsed" },
] as const;
