// GET  /api/role-application - the signed-in user's latest role application
//                              ({ application: null } if they never applied)
// POST /api/role-application - apply for the next role
//                              Body: { supportingNote?: string }
//
// Only students (-> collaborator) and collaborators (-> auditor) can apply;
// every other role is admin-managed. The user must meet every condition in
// src/lib/auth/roleEligibility.ts, and may have one pending application.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";
import { buildSnapshot, loadEligibility, toRoleApplicationDto } from "@/lib/roleApplications";

const NOTE_MAX_LENGTH = 1000;
const NO_STORE = { "Cache-Control": "private, no-store" };

const isDuplicateKey = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const RoleApplication = await getRoleApplicationModel();
    const application = await RoleApplication.findOne({
      applicantId: new Types.ObjectId(session.userId),
    })
      .sort({ appliedAt: -1 })
      .lean();
    return NextResponse.json(
      { application: application ? toRoleApplicationDto(application) : null },
      { headers: NO_STORE },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/role-application");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `role-application:${session.userId}`);

    const body = await readJson<{ supportingNote: string }>(request);
    if (body?.supportingNote !== undefined && typeof body.supportingNote !== "string") {
      return NextResponse.json({ message: "supportingNote must be text." }, { status: 400 });
    }
    const supportingNote = asTrimmedString(body?.supportingNote, NOTE_MAX_LENGTH) || undefined;

    const loaded = await loadEligibility(session.userId);
    if (!loaded) return NextResponse.json({ message: "User not found." }, { status: 404 });
    if (!loaded.result) {
      return NextResponse.json({ message: "Your role is managed by admins." }, { status: 403 });
    }

    const RoleApplication = await getRoleApplicationModel();
    const applicantId = new Types.ObjectId(loaded.userId);
    const pending = await RoleApplication.exists({ applicantId, status: "pending" });
    if (pending) {
      return NextResponse.json(
        { message: "You already have a pending application." },
        { status: 409 },
      );
    }

    if (!loaded.result.eligible) {
      return NextResponse.json(
        {
          message: "You don't meet every requirement yet.",
          conditions: loaded.result.conditions,
        },
        { status: 403 },
      );
    }

    try {
      const created = await RoleApplication.create({
        applicantId,
        applicantUpid: loaded.upid,
        applicantName: loaded.fullName,
        currentRole: loaded.role,
        targetRole: loaded.result.targetRole,
        supportingNote,
        eligibilitySnapshot: buildSnapshot(loaded.input),
        status: "pending",
        appliedAt: new Date(),
      });
      return NextResponse.json(
        { application: toRoleApplicationDto(created.toObject()) },
        { status: 201, headers: NO_STORE },
      );
    } catch (error) {
      // Two submits at once: the partial unique index lets only one through
      if (isDuplicateKey(error)) {
        return NextResponse.json(
          { message: "You already have a pending application." },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/role-application");
  }
}
