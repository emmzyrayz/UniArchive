// src/lib/constants/materialCategories.ts
// Material taxonomy, ported from the old codebase's Infoform / materialUpload types.

export type MaterialCategory =
  | "LEARNING_AIDS"
  | "ACADEMIC_WORK"
  | "MEDIA"
  | "EXAMS"
  | "BOOKS";

export type MaterialSubcategory =
  | "LECTURE_NOTE"
  | "COURSE_MATERIAL"
  | "TUTORIAL"
  | "SYLLABUS"
  | "ASSIGNMENT"
  | "PROJECT"
  | "LAB_REPORT"
  | "RECORDED_LECTURE"
  | "PRESENTATION"
  | "PAST_QUESTION"
  | "MOCK_EXAM"
  | "TEXTBOOK"
  | "EBOOK";

export interface SubcategoryInfo {
  id: MaterialSubcategory;
  label: string;
  description: string;
}

export interface CategoryInfo {
  id: MaterialCategory;
  label: string;
  description: string;
  subcategories: readonly SubcategoryInfo[];
}

export const CATEGORIES: readonly CategoryInfo[] = [
  {
    id: "LEARNING_AIDS",
    label: "Learning Aids",
    description:
      "Educational materials to help with learning and understanding concepts",
    subcategories: [
      {
        id: "LECTURE_NOTE",
        label: "Lecture Notes",
        description:
          "Notes from classes, sometimes handwritten or typed. Examples: PDF, text files, scanned pages",
      },
      {
        id: "COURSE_MATERIAL",
        label: "Course Materials",
        description:
          "Textbooks, curriculum outlines, syllabi, handouts. Example: CSC201 full module",
      },
      {
        id: "TUTORIAL",
        label: "Tutorial / Summary Sheet",
        description:
          "Condensed versions of topics, cheat sheets, diagrams. Examples: PDF cheat sheets",
      },
      {
        id: "SYLLABUS",
        label: "Course Overview / Syllabus",
        description:
          "Outline of course objectives, topics, grading system. Example: Semester plan",
      },
    ],
  },
  {
    id: "ACADEMIC_WORK",
    label: "Academic Work",
    description: "Student assignments, projects, and academic submissions",
    subcategories: [
      {
        id: "ASSIGNMENT",
        label: "Assignment / Solution Guide",
        description:
          "Marked assignments or answer keys for practice. Examples: Problem sets + answers",
      },
      {
        id: "PROJECT",
        label: "Project / Research Work",
        description:
          "Final year projects, seminar papers, research papers. Examples: DOC/PDF, sometimes zipped",
      },
      {
        id: "LAB_REPORT",
        label: "Lab Report / Experiment",
        description:
          "Practical lab work, experiment results. Examples: Biology, Chemistry, Physics lab docs",
      },
    ],
  },
  {
    id: "MEDIA",
    label: "Media",
    description: "Video and multimedia educational content",
    subcategories: [
      {
        id: "RECORDED_LECTURE",
        label: "Recorded Lecture",
        description:
          "Video/audio recordings of classes or tutorials. Examples: Video file or YouTube embed",
      },
      {
        id: "PRESENTATION",
        label: "Presentation Slides",
        description:
          "PowerPoint or PDF slides used by lecturers or students. Examples: .pptx, .pdf",
      },
    ],
  },
  {
    id: "EXAMS",
    label: "Exams",
    description: "Test materials and examination resources",
    subcategories: [
      {
        id: "PAST_QUESTION",
        label: "Past Question",
        description:
          "Previous exam/test questions for revision. Examples: WAEC, departmental exams",
      },
      {
        id: "MOCK_EXAM",
        label: "Mock Exam / Practice Test",
        description:
          "Practice questions or third-party test simulations. Examples: Test drills",
      },
    ],
  },
  {
    id: "BOOKS",
    label: "Books",
    description: "Textbooks and reference materials",
    subcategories: [
      {
        id: "TEXTBOOK",
        label: "E-book / Textbook",
        description:
          "Complete scanned textbooks or ebooks shared among peers. Examples: .pdf, .epub",
      },
      {
        id: "EBOOK",
        label: "E-books",
        description:
          "Digital books and electronic reading materials in various formats",
      },
    ],
  },
];

export const MATERIAL_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const MATERIAL_SUBCATEGORY_IDS = CATEGORIES.flatMap((c) =>
  c.subcategories.map((s) => s.id),
);

export function isMaterialCategory(value: string): value is MaterialCategory {
  return (MATERIAL_CATEGORY_IDS as readonly string[]).includes(value);
}

export function isSubcategoryOf(
  category: MaterialCategory,
  subcategory: string,
): subcategory is MaterialSubcategory {
  const match = CATEGORIES.find((c) => c.id === category);
  return !!match?.subcategories.some((s) => s.id === subcategory);
}
