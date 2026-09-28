// GET /api/materials/[id]
// One UniLibrary material for its detail page (/materials/[id]): the same
// public fields as the feed, plus how much typed content it has. No sign-in
// needed. The PDF itself is opened through /read/[bookId], which checks
// access and signs the file URL; this route never hands out file URLs.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getClientIp, handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { fail } from "@/lib/adminApi";
import { getMaterialModel } from "@/lib/models/materialModel";
import { getTypedQuestionModel } from "@/lib/models/typedQuestionModel";
import { getContentDocumentModel } from "@/lib/models/contentDocumentModel";
import {
  PUBLIC_MATERIAL_FIELDS,
  toMaterialSummaries,
  type PublicMaterialDoc,
} from "@/lib/publicMaterials";
import type { MaterialDetail } from "@/types/layer2";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await enforceRateLimit(request, "public", `material:${getClientIp(request)}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Material not found.");

    const Material = await getMaterialModel();
    const doc = await Material.findOne({ _id: id, isActive: true })
      .select(PUBLIC_MATERIAL_FIELDS)
      .lean<PublicMaterialDoc>();
    if (!doc) return fail(404, "Material not found.");

    const [Question, Doc] = await Promise.all([getTypedQuestionModel(), getContentDocumentModel()]);
    const [[summary], typedQuestionCount, typedNoteCount] = await Promise.all([
      toMaterialSummaries([doc]),
      Question.countDocuments({ materialId: doc._id }),
      Doc.countDocuments({ materialId: doc._id, isActive: true }),
    ]);

    const body: MaterialDetail = { ...summary, typedQuestionCount, typedNoteCount };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/materials/[id]");
  }
}
