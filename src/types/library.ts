// types/library.ts
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
}
