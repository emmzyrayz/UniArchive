// assets/data/libraryData.ts
import type { Book } from "@/types/library";

export const MOCK_BOOKS: Book[] = [
  {
    id: "book-1",
    title: "Linear Algebra I — Lecture Notes",
    description:
      "Full semester notes covering vector spaces through eigenvalues.",
    fileUrl: "/mock/LinearAlgebraII.pdf",
    thumbnailUrl: "/images/blog/code-screen.jpg",
    fileSize: 3_200_000,
    pageCount: 84,
    ownerUpid: "upid-4",
    tags: ["Mathematics", "MAT125"],
    lastOpenedAt: "2024-03-14T10:00:00Z",
    uploadedAt: "2024-02-01T09:00:00Z",
  },
  {
    id: "book-2",
    title: "Data Structures Past Questions 2019-2023",
    fileUrl: "/mock/MTH222.pdf",
    thumbnailUrl: "/images/blog/tech-workspace.jpg",
    fileSize: 1_450_000,
    pageCount: 22,
    ownerUpid: "upid-4",
    tags: ["Computer Science", "Past Questions"],
    uploadedAt: "2024-01-20T14:30:00Z",
  },
  {
    id: "book-3",
    title: "Intro to Thermodynamics — Textbook Scan",
    description: "Chapters 1-6, scanned from the departmental library copy.",
    fileUrl: "/mock/MTH302.pdf",
    fileSize: 18_900_000,
    pageCount: 210,
    ownerUpid: "upid-4",
    tags: ["Physics"],
    lastOpenedAt: "2024-03-10T08:15:00Z",
    uploadedAt: "2023-11-05T16:00:00Z",
  },
];


export function formatFileSize(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
