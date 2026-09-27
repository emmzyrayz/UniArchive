// GET /api/admin/role-applications
// The role application queue. Permission: "admin.view_submissions" (the same
// reviewers who see the submissions queue); deciding needs more, see
// canDecideRoleApplications. Filters: status (default "pending", or "all"),
// page, limit (max 50). Pending is oldest first, everything else newest
// first. Every response carries per-status counts for the tabs.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import {
  ROLE_APPLICATION_STATUSES,
  getRoleApplicationModel,
  type RoleApplicationStatus,
} from "@/lib/models/roleApplicationModel";
import { loadApplicantsNow, toAdminRoleApplicationDto } from "@/lib/roleApplications";

const MAX_LIMIT = 50;

function positiveInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "admin.view_submissions");
    const params = request.nextUrl.searchParams;

    const status = params.get("status") ?? "pending";
    if (status !== "all" && !ROLE_APPLICATION_STATUSES.includes(status as RoleApplicationStatus)) {
      return NextResponse.json(
        { message: `status must be one of: ${ROLE_APPLICATION_STATUSES.join(", ")}, all.` },
        { status: 400 },
      );
    }
    const page = positiveInt(params.get("page"), 1);
    const limit = Math.min(positiveInt(params.get("limit"), 20), MAX_LIMIT);

    const filter = status === "all" ? {} : { status: status as RoleApplicationStatus };
    const direction = status === "pending" ? 1 : -1;

    const RoleApplication = await getRoleApplicationModel();
    const [docs, total, grouped] = await Promise.all([
      RoleApplication.find(filter)
        .sort({ appliedAt: direction, _id: direction })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RoleApplication.countDocuments(filter),
      RoleApplication.aggregate<{ _id: RoleApplicationStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const counts = Object.fromEntries(ROLE_APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
      RoleApplicationStatus,
      number
    >;
    for (const g of grouped) counts[g._id] = g.count;

    const applicantsNow = await loadApplicantsNow(docs.map((d) => d.applicantId));
    return NextResponse.json(
      {
        applications: docs.map((d) =>
          toAdminRoleApplicationDto(d, applicantsNow.get(String(d.applicantId))),
        ),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        counts,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/role-applications");
  }
}
