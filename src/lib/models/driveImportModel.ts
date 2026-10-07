// src/lib/models/driveImportModel.ts
// One row per Google Drive file someone tried to import (lib/drive/
// importFile.ts): the ledger that lets a file already imported be skipped
// without downloading it again, and the record of what happened. `owner` is
// the library owner's user id for library imports, or "platform" for staff
// and inbox imports (the queue is shared).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";

export const DRIVE_IMPORT_TARGETS = ["library", "platform"] as const;
export const DRIVE_IMPORT_VIAS = ["link", "picker", "inbox"] as const;
export const DRIVE_IMPORT_STATUSES = ["imported", "duplicate", "failed"] as const;

export interface IDriveImport {
  _id: Types.ObjectId;
  owner: string;
  target: (typeof DRIVE_IMPORT_TARGETS)[number];
  via: (typeof DRIVE_IMPORT_VIAS)[number];
  /** Who ran it (the student, the staff member, or the admin who connected the inbox) */
  importedBy: Types.ObjectId;
  driveFileId: string;
  md5?: string;
  name: string;
  size?: number;
  status: (typeof DRIVE_IMPORT_STATUSES)[number];
  message?: string;
  bookId?: Types.ObjectId;
  /** The copy we already had, for duplicates */
  duplicateOf?: Types.ObjectId;
  /** Inbox only: who shared it with the UniArchive account (email encrypted) */
  sharedByName?: string;
  sharedByEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriveImportSchema = new Schema<IDriveImport>(
  {
    owner: { type: String, required: true },
    target: { type: String, enum: DRIVE_IMPORT_TARGETS, required: true },
    via: { type: String, enum: DRIVE_IMPORT_VIAS, required: true },
    importedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driveFileId: { type: String, required: true },
    md5: { type: String },
    name: { type: String, required: true, maxlength: 500 },
    size: { type: Number },
    status: { type: String, enum: DRIVE_IMPORT_STATUSES, required: true },
    message: { type: String, maxlength: 500 },
    bookId: { type: Schema.Types.ObjectId, ref: "Book" },
    duplicateOf: { type: Schema.Types.ObjectId, ref: "Book" },
    sharedByName: { type: String, maxlength: 200 },
    sharedByEmail: { type: String },
  },
  { timestamps: true },
);

// "Already imported?" and an owner's history, newest first
DriveImportSchema.index({ owner: 1, driveFileId: 1, createdAt: -1 });
// Data export and purge
DriveImportSchema.index({ importedBy: 1 });

export async function getDriveImportModel(): Promise<Model<IDriveImport>> {
  const conn = await connectDB();
  return (conn.models.DriveImport as Model<IDriveImport> | undefined) ??
    conn.model<IDriveImport>("DriveImport", DriveImportSchema);
}
