// src/lib/dto/book.ts
// Maps a Book document to the shape the frontend's Book type expects.
import type { Types } from "mongoose";
import type { IBook } from "@/lib/models/bookModel";
import type { Book } from "@/types/library";

export type BookDoc = IBook & { _id: Types.ObjectId };

export function toBookDto(doc: BookDoc): Book & {
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
    thumbnailUrl: doc.thumbnailUrl,
    fileSize: doc.fileSize,
    pageCount: doc.pageCount,
    ownerUpid: doc.ownerUpid,
    tags: doc.tags ?? [],
    lastOpenedAt: doc.lastOpenedAt?.toISOString(),
    uploadedAt: doc.createdAt.toISOString(),
    storageKey: doc.storageKey,
    mimeType: doc.mimeType,
    visibility: doc.visibility,
    status: doc.status,
  };
}
