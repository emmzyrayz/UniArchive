// POST /api/materials/[id]/report   { reason, note? }
// Report a UniLibrary material: signed in, once per person (sending again
// updates your reason). Counts toward the material's reportCount, which
// staff sort by in /admin/materials. An unverified PDF with REPORTS_TO_HIDE
// reports is hidden (hiddenByReports) until staff look; verified ones are
// only flagged.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { fail } from "@/lib/adminApi";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { PUBLIC_MATERIALS, REPORTS_TO_HIDE, getMaterialModel } from "@/lib/models/materialModel";
import {
  MATERIAL_REPORT_REASONS,
  getMaterialReportModel,
  type MaterialReportReason,
} from "@/lib/models/materialReportModel";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "materialReport", `material-report:${session.userId}`);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "Material not found.");

    const body = await readJson<{ reason: unknown; note: unknown }>(request);
    const reason = body?.reason as MaterialReportReason;
    if (!MATERIAL_REPORT_REASONS.some((r) => r.value === reason)) return fail(400, "Pick a reason.");
    const note = typeof body?.note === "string" ? body.note.replace(/\s+/g, " ").trim().slice(0, 500) : "";

    const Material = await getMaterialModel();
    const material = await Material.findOne({ _id: id, ...PUBLIC_MATERIALS }).select("_id status submittedBy").lean();
    if (!material) return fail(404, "Material not found.");

    const Report = await getMaterialReportModel();
    const result = await Report.updateOne(
      { materialId: material._id, userId: new Types.ObjectId(session.userId) },
      { $set: { reason, userUpid: session.upid, ...(note ? { note } : {}) }, ...(!note ? { $unset: { note: 1 } } : {}) },
      { upsert: true },
    );
    const firstReport = result.upsertedCount > 0;
    if (firstReport) {
      const updated = await Material.findByIdAndUpdate(
        material._id,
        { $inc: { reportCount: 1 } },
        { returnDocument: "after", timestamps: false },
      )
        .select("reportCount status hiddenByReports")
        .lean();
      if (updated && updated.status === "unverified" && updated.reportCount >= REPORTS_TO_HIDE && !updated.hiddenByReports) {
        await Material.updateOne({ _id: material._id }, { $set: { hiddenByReports: true } }, { timestamps: false });
        console.info(`moderation: unverified material ${id} hidden after ${updated.reportCount} reports`);
      }
    }
    return NextResponse.json({ reported: true, alreadyReported: !firstReport });
  } catch (error) {
    return handleRouteError(error, "POST /api/materials/[id]/report");
  }
}
