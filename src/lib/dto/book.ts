// src/lib/dto/book.ts
// Maps a Book document to the shape the frontend's Book type expects.
import type { Types } from "mongoose";
import type { IBook } from "@/lib/models/bookModel";
import type { Book } from "@/types/library";

export type BookDoc = IBook & { _id: Types.ObjectId };

export function toBookDto(
  doc: BookDoc,
  submissionStatus?: Book["submissionStatus"],
): Book & {
  storageKey: string;
  mimeType: string;
  visibility: IBook["visibility"];
  status: IBook["status"];
} {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    fileUrl: doc.fileUrl,
    storageProvider: doc.storageProvider ?? "backblaze",
    thumbnailUrl: doc.thumbnailUrl,
    fileSize: doc.fileSize,
    pageCount: doc.pageCount,
    ownerUpid: doc.ownerUpid,
    tags: doc.tags ?? [],
    lastOpenedAt: doc.lastOpenedAt?.toISOString(),
    uploadedAt: doc.createdAt.toISOString(),
    universityId: doc.universityId?.toString(),
    universityName: doc.universityName,
    universityAbbr: doc.universityAbbr,
    facultyId: doc.facultyId?.toString(),
    facultyName: doc.facultyName,
    departmentId: doc.departmentId?.toString(),
    departmentName: doc.departmentName,
    level: doc.level,
    semester: doc.semester,
    hasSubmission: doc.hasSubmission ?? false,
    submissionId: doc.submissionId?.toString(),
    submissionStatus: doc.hasSubmission ? submissionStatus : undefined,
    storageKey: doc.storageKey,
    mimeType: doc.mimeType,
    visibility: doc.visibility,
    status: doc.status,
  };
}
