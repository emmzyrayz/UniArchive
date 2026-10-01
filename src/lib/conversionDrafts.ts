// src/lib/conversionDrafts.ts
// Server helpers for the conversion workspace's drafts (/api/conversions):
// who may convert what (the same rules as typed content today), loading a
// user's own draft, and the response shape.
import { isValidObjectId, Types } from "mongoose";
import type { SessionUser } from "@/lib/auth/session";
import { NOTE_CATEGORIES, QUESTION_CATEGORIES } from "@/lib/constants/layer2";
import { canEditNote, canWriteNotes, loadActiveMaterial, type Layer2Material } from "@/lib/layer2";
import { getContentDocumentModel, type IContentDocument } from "@/lib/models/contentDocumentModel";
import {
  getConversionDraftModel,
  type IConversionDraft,
} from "@/lib/models/conversionDraftModel";
import type { ConversionDraftDto, ConversionKind, DraftPayload } from "@/lib/conversions";

export type Access =
  | { ok: true; material: Layer2Material; targetDoc?: IContentDocument }
  | { ok: false; status: number; message: string };

/**
 * May this user convert this material? Questions: anyone signed in, on past
 * question materials. Notes: Collaborators and above, on notes and
 * textbooks; editing an existing note also needs to be its author (or
 * auditor+).
 */
export async function checkConversionAccess(
  session: SessionUser,
  materialId: string,
  kind: ConversionKind,
  targetDocId?: string,
): Promise<Access> {
  const material = await loadActiveMaterial(materialId);
  if (!material) return { ok: false, status: 404, message: "Material not found." };

  if (kind === "questions") {
    if (!QUESTION_CATEGORIES.includes(material.category)) {
      return { ok: false, status: 400, message: "Questions can only be typed out for past question materials." };
    }
    if (targetDocId) return { ok: false, status: 400, message: "targetDocId is only for notes." };
    return { ok: true, material };
  }

  if (!NOTE_CATEGORIES.includes(material.category)) {
    return { ok: false, status: 400, message: "Notes can only be written for notes and textbook materials." };
  }
  if (!canWriteNotes(session.role)) {
    return { ok: false, status: 403, message: "Typed notes can be written by Collaborators and above." };
  }
  if (!targetDocId) return { ok: true, material };
  if (!isValidObjectId(targetDocId)) return { ok: false, status: 404, message: "Note not found." };
  const Doc = await getContentDocumentModel();
  const targetDoc = await Doc.findOne({ _id: targetDocId, materialId: material._id, isActive: true }).lean<IContentDocument>();
  if (!targetDoc) return { ok: false, status: 404, message: "Note not found." };
  if (!canEditNote(session, targetDoc)) return { ok: false, status: 403, message: "You can only edit notes you wrote." };
  return { ok: true, material, targetDoc };
}

/** The user's own draft with this id, in any status; null otherwise. */
export async function loadOwnDraft(id: string, userId: string): Promise<IConversionDraft | null> {
  if (!isValidObjectId(id)) return null;
  const Draft = await getConversionDraftModel();
  return Draft.findOne({ _id: id, userId: new Types.ObjectId(userId) }).lean<IConversionDraft>();
}

/** A new draft's payload: empty, or the published note being edited. */
export function startingPayload(kind: ConversionKind, targetDoc?: IContentDocument): DraftPayload {
  if (kind === "questions") return { questions: [] };
  if (!targetDoc) return { note: { documentType: "lecture_note", title: "", contentBlocks: [] } };
  return {
    note: {
      documentType: targetDoc.documentType,
      title: targetDoc.title,
      ...(targetDoc.chapterNumber !== undefined ? { chapterNumber: targetDoc.chapterNumber } : {}),
      ...(targetDoc.chapterTitle ? { chapterTitle: targetDoc.chapterTitle } : {}),
      contentBlocks: (targetDoc.contentBlocks ?? []).map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
        ...(b.description ? { description: b.description } : {}),
        ...(b.imageDescription ? { imageDescription: b.imageDescription } : {}),
      })),
    },
  };
}

export function toDraftDto(d: IConversionDraft): ConversionDraftDto {
  return {
    id: String(d._id),
    materialId: String(d.materialId),
    kind: d.kind,
    ...(d.targetDocId ? { targetDocId: String(d.targetDocId) } : {}),
    payload: d.payload,
    revision: d.revision,
    ...(d.lastPage ? { lastPage: d.lastPage } : {}),
    status: d.status,
    updatedAt: new Date(d.updatedAt).toISOString(),
    ...(d.baseDocUpdatedAt ? { baseDocUpdatedAt: new Date(d.baseDocUpdatedAt).toISOString() } : {}),
  };
}
