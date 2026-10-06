// types/library.ts
import type { MaterialOutline } from "@/lib/outline";

export interface Book {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  storageProvider: "cloudinary" | "backblaze";
  thumbnailUrl?: string;
  fileSize: number; // bytes
  pageCount?: number;
  ownerUpid: string;
  tags: string[];
  lastOpenedAt?: string;
  uploadedAt: string;
  // Academic context (optional, from the uploader's profile)
  universityId?: string;
  universityName?: string;
  universityAbbr?: string;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  level?: string;
  semester?: string;
  // UniLibrary submission
  hasSubmission?: boolean;
  submissionId?: string;
  /** Pipeline status of the submission; present when hasSubmission. */
  submissionStatus?: "draft" | "submitted" | "in_review" | "verified" | "rejected";
  /** When the owner gifted a copy to UniArchive (no submission after that). */
  giftedAt?: string;
  /**
   * Readable as page images on devices that can't run pdf.js: always for
   * Cloudinary books, and for Backblaze books once the PDF worker made them.
   */
  hasPageImages?: boolean;
  /**
   * The published material's table of contents or course outline, sent with
   * the reader's GET /api/books/[id] when the book backs a material.
   */
  outline?: MaterialOutline | null;
  /** The book backs a material still waiting for review (the reader says so) */
  unverifiedMaterialId?: string;
}
