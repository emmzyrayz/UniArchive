// src/lib/models/contentDocumentModel.ts
// Typed wiki content (Layer 2) for lecture notes and textbook summaries,
// linked to a Layer 1 Material. Content is stored in the BlockEditor's
// ContentBlock format (see types/content.ts).
import { Schema, type Model, type Types } from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { CONTENT_BLOCK_TYPES, type ContentBlock } from "@/types/content";

export const CONTENT_DOCUMENT_TYPES = [
  "lecture_note",
  "chapter_summary",
  "topic_explainer",
] as const;
export type ContentDocumentType = (typeof CONTENT_DOCUMENT_TYPES)[number];

export interface IContentDocument {
  _id: Types.ObjectId;

  // Parent (Layer 1)
  materialId: Types.ObjectId;
  // Textbook summaries: which chapter
  chapterNumber?: number;
  chapterTitle?: string;
  // Optional link to the source textbook material
  sourceTextbookId?: Types.ObjectId;

  // Content
  documentType: ContentDocumentType;
  title: string;
  contentBlocks: ContentBlock[];

  // Authorship
  createdBy: Types.ObjectId;
  createdByUpid: string;
  lastEditedBy?: Types.ObjectId;
  lastEditedAt?: Date;

  // Verification
  verificationTier?: "tier1" | "tier2";
  tier1VerifiedBy?: Types.ObjectId;
  tier1VerifiedAt?: Date;
  tier2VerifiedBy?: Types.ObjectId;
  tier2VerifiedAt?: Date;

  viewCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IContentDocumentModel = Model<IContentDocument>;

// Same shape as the block schema the BlockEditor already writes
const ContentBlockSchema = new Schema<ContentBlock>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: CONTENT_BLOCK_TYPES, required: true },
    content: { type: String, default: "" },
    description: { type: String },
    imageDescription: { type: String },
  },
  { _id: false },
);

const ContentDocumentSchema = new Schema<IContentDocument, IContentDocumentModel>(
  {
    materialId: { type: Schema.Types.ObjectId, ref: "Material", required: true, index: true },
    chapterNumber: { type: Number, min: 0 },
    chapterTitle: { type: String, trim: true },
    sourceTextbookId: { type: Schema.Types.ObjectId, ref: "Material" },

    documentType: { type: String, enum: CONTENT_DOCUMENT_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    contentBlocks: { type: [ContentBlockSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByUpid: { type: String, required: true },
    lastEditedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastEditedAt: { type: Date },

    verificationTier: { type: String, enum: ["tier1", "tier2"] },
    tier1VerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    tier1VerifiedAt: { type: Date },
    tier2VerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    tier2VerifiedAt: { type: Date },

    viewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ContentDocumentSchema.index({ materialId: 1, documentType: 1 });
ContentDocumentSchema.index({ sourceTextbookId: 1 });

export async function getContentDocumentModel(): Promise<IContentDocumentModel> {
  const conn = await connectDB();
  return (
    (conn.models.ContentDocument as IContentDocumentModel | undefined) ??
    conn.model<IContentDocument, IContentDocumentModel>("ContentDocument", ContentDocumentSchema)
  );
}
