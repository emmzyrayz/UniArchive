// PATCH /api/admin/users/[id]
// Body (any of): { role?, isSuspended?, suspensionReason?, violationCount? }
//
// Permission: "manage_users" (com_admin, webmaster, dev). Changing a role
// also needs "assign_role" (webmaster, dev). Guards against lockouts and
// peer takeovers:
//  - never your own account
//  - never a webmaster or dev, and nobody can be made one (database only)
//  - only users ranked below you, and only to roles ranked below you
//
// A role change applies on the user's next request (sessions re-read the
// role every time) and closes any pending role application. Suspending
// signs the user out everywhere and blocks sign-in until reactivated.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { fail, optionalString } from "@/lib/adminApi";
import { getUserModel } from "@/lib/models/userModel";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";
import { ADMIN_USER_FIELDS, toAdminUserDto, type AdminUserDoc } from "@/lib/adminUsers";
import { ASSIGNABLE_ROLES, PROTECTED_ROLES, outranks } from "@/lib/constants/roles";
import type { UserRole } from "@/types/roles";

type Context = { params: Promise<{ id: string }> };

const MAX_VIOLATIONS = 1000;

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_users");
    enforceRateLimit(request, `admin-users:${session.userId}`, 60);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "User not found.");
    if (id === session.userId) return fail(403, "You can't change your own account here.");

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");

    const User = await getUserModel();
    const target = await User.findById(id).select("role upid isSuspended").lean();
    if (!target) return fail(404, "User not found.");
    if (PROTECTED_ROLES.includes(target.role)) {
      return fail(403, "Webmaster and dev accounts can only be changed in the database.");
    }
    if (!outranks(session.role, target.role)) {
      return fail(403, "You can only manage users ranked below you.");
    }

    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};
    let bumpTokenVersion = false;
    const changes: string[] = [];

    // --- Role ---------------------------------------------------------------
    let newRole: UserRole | undefined;
    if (body.role !== undefined && body.role !== target.role) {
      if (!can(session.role, "assign_role")) {
        return fail(403, "Only a webmaster or dev can change roles.");
      }
      if (typeof body.role !== "string" || !ASSIGNABLE_ROLES.includes(body.role as UserRole)) {
        return fail(400, `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}.`);
      }
      newRole = body.role as UserRole;
      if (!outranks(session.role, newRole)) {
        return fail(403, "You can only assign roles ranked below your own.");
      }
      set.role = newRole;
      set.previousRole = target.role;
      set.roleUpgradedAt = new Date();
      bumpTokenVersion = true;
      changes.push(`role ${target.role} -> ${newRole}`);
    }

    // --- Suspension ---------------------------------------------------------
    let suspending = false;
    if (body.isSuspended !== undefined) {
      if (typeof body.isSuspended !== "boolean") {
        return fail(400, "isSuspended must be true or false.");
      }
      if (body.isSuspended && !target.isSuspended) {
        const reason = optionalString(body.suspensionReason, 500);
        if (!reason) return fail(400, "A reason (up to 500 characters) is required to suspend.");
        Object.assign(set, {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedBy: session.userId,
          suspensionReason: reason,
        });
        suspending = true;
        bumpTokenVersion = true;
        changes.push("suspended");
      } else if (!body.isSuspended && target.isSuspended) {
        set.isSuspended = false;
        Object.assign(unset, { suspendedAt: "", suspendedBy: "", suspensionReason: "" });
        bumpTokenVersion = true;
        changes.push("reactivated");
      }
    }

    // --- Violations ---------------------------------------------------------
    if (body.violationCount !== undefined) {
      const n = body.violationCount;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_VIOLATIONS) {
        return fail(400, `violationCount must be a whole number from 0 to ${MAX_VIOLATIONS}.`);
      }
      set.violationCount = n;
      changes.push(`violationCount = ${n}`);
    }

    if (changes.length === 0) return fail(400, "Nothing to change.");

    // Conditional on the role we checked, so a concurrent change can't be
    // overwritten with stale permission checks
    const updated = await User.findOneAndUpdate(
      { _id: id, role: target.role },
      {
        $set: set,
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
        ...(bumpTokenVersion ? { $inc: { tokenVersion: 1 } } : {}),
      },
      { returnDocument: "after" },
    )
      .select(ADMIN_USER_FIELDS)
      .lean<AdminUserDoc>();
    if (!updated) return fail(409, "This user changed while you were editing. Reload and try again.");

    if (suspending) {
      const SessionCache = await getSessionCacheModel();
      await SessionCache.invalidateAllUserSessions(id);
    }
    if (newRole) {
      // Their application was for a promotion from the old role
      const RoleApplication = await getRoleApplicationModel();
      await RoleApplication.updateMany(
        { applicantId: new Types.ObjectId(id), status: "pending" },
        {
          $set: {
            status: "withdrawn",
            autoWithdrawnReason: `Your role was changed to ${newRole} by an admin.`,
          },
        },
      );
    }

    // No audit log model yet; the server log is the trail for now
    console.info(`admin: @${session.upid} changed @${target.upid}: ${changes.join("; ")}`);
    return NextResponse.json({ user: toAdminUserDto(updated) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/users/[id]");
  }
}
