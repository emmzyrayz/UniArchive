// GET /api/admin/comments
// The reported comments queue. Permission: "admin.view_submissions".
// status: "reported" (default: flagged at 5+ reports) or "all". sort:
// "most_reported" (default) or "newest". page, limit (max 50). Each comment
// carries its material's title (and reader link), and for replies the
// author of the comment being replied to.
import { NextResponse, type NextRequest } from "next/server";
import type { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import { getCommentModel, type IComment } from "@/lib/models/commentModel";
import { getMaterialModel } from "@/lib/models/materialModel";
import type { AdminCommentsResponse } from "@/types/admin";

const SORTS: Record<string, Record<string, 1 | -1>> = {
  most_reported: { reportCount: -1, createdAt: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "admin.view_submissions");
    const params = request.nextUrl.searchParams;
    const status = params.get("status") ?? "reported";
    if (status !== "reported" && status !== "all") return fail(400, 'status must be "reported" or "all".');
    const sort = params.get("sort") ?? "most_reported";
    if (!SORTS[sort]) return fail(400, 'sort must be "most_reported" or "newest".');
    const { page, limit, skip } = pagination(params);

    const filter = status === "reported" ? { isReported: true } : {};
    const Comment = await getCommentModel();
    const [docs, total, reportedCount] = await Promise.all([
      Comment.find(filter).sort(SORTS[sort]).skip(skip).limit(limit).lean<IComment[]>(),
      Comment.countDocuments(filter),
      Comment.countDocuments({ isReported: true }),
    ]);

    // Material titles and parent authors, one query each
    const Material = await getMaterialModel();
    const parentIds = docs.map((d) => d.parentId).filter((id): id is Types.ObjectId => !!id);
    const [materials, parents] = await Promise.all([
      Material.find({ _id: { $in: [...new Set(docs.map((d) => String(d.materialId)))] } })
        .select("title courseCode bookId")
        .lean<{ _id: Types.ObjectId; title: string; courseCode?: string; bookId: Types.ObjectId }[]>(),
      parentIds.length
        ? Comment.find({ _id: { $in: parentIds } }).select("authorUpid isDeleted").lean<IComment[]>()
        : Promise.resolve([] as IComment[]),
    ]);
    const materialById = new Map(materials.map((m) => [String(m._id), m]));
    const parentById = new Map(parents.map((p) => [String(p._id), p]));

    const body: AdminCommentsResponse = {
      comments: docs.map((c) => {
        const material = materialById.get(String(c.materialId));
        const parent = c.parentId ? parentById.get(String(c.parentId)) : undefined;
        return {
          id: String(c._id),
          text: c.text,
          authorUpid: c.authorUpid,
          authorName: c.authorName,
          materialId: String(c.materialId),
          materialTitle: material
            ? `${material.courseCode ? `${material.courseCode} — ` : ""}${material.title}`
            : "(material removed)",
          bookId: material ? String(material.bookId) : undefined,
          reportCount: c.reportCount ?? 0,
          isDeleted: !!c.isDeleted,
          isReported: !!c.isReported,
          createdAt: new Date(c.createdAt).toISOString(),
          ...(c.parentId
            ? {
                parentId: String(c.parentId),
                parentAuthorUpid: parent && !parent.isDeleted ? parent.authorUpid : undefined,
              }
            : {}),
        };
      }),
      total,
      page,
      totalPages: totalPages(total, limit),
      reportedCount,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/comments");
  }
}
