// GET /api/admin/users
// Permission: "manage_users" (com_admin, webmaster, dev).
//
// Filters: role, status ("active" default, "suspended", "all"), search
// (name, username or upid; a full email address matches exactly, since
// emails are stored encrypted). sort: "newest" (default), "oldest", "name".
// page, limit (max 50). Emails come back masked.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { fail, pagination, totalPages } from "@/lib/adminApi";
import { escapeRegex } from "@/lib/escapeRegex";
import { getUserModel, hashForSearch } from "@/lib/models/userModel";
import { normaliseEmail } from "@/lib/auth/tokens";
import { ADMIN_USER_FIELDS, toAdminUserDto, type AdminUserDoc } from "@/lib/adminUsers";
import { roleHierarchy, type UserRole } from "@/types/roles";
import type { AdminUsersResponse } from "@/types/admin";

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { fullName: 1, _id: 1 },
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "manage_users");
    const params = request.nextUrl.searchParams;

    const role = params.get("role");
    if (role && !(role in roleHierarchy)) return fail(400, "Unknown role.");
    const status = params.get("status") ?? "active";
    if (!["active", "suspended", "all"].includes(status)) {
      return fail(400, 'status must be "active", "suspended" or "all".');
    }
    const sort = params.get("sort") ?? "newest";
    if (!SORTS[sort]) return fail(400, 'sort must be "newest", "oldest" or "name".');
    const search = params.get("search")?.trim().slice(0, 100);
    const { page, limit, skip } = pagination(params);

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role as UserRole;
    // Older accounts have no isSuspended field at all
    if (status === "active") filter.isSuspended = { $ne: true };
    if (status === "suspended") filter.isSuspended = true;
    if (search) {
      if (search.includes("@")) {
        filter.emailHash = hashForSearch(normaliseEmail(search));
      } else {
        const pattern = { $regex: escapeRegex(search), $options: "i" };
        filter.$or = [{ fullName: pattern }, { username: pattern }, { upid: pattern }];
      }
    }

    const User = await getUserModel();
    const [docs, total] = await Promise.all([
      User.find(filter)
        .sort(SORTS[sort])
        .skip(skip)
        .limit(limit)
        .select(ADMIN_USER_FIELDS)
        .lean<AdminUserDoc[]>(),
      User.countDocuments(filter),
    ]);

    const body: AdminUsersResponse = {
      users: docs.map(toAdminUserDto),
      total,
      page,
      totalPages: totalPages(total, limit),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/users");
  }
}
