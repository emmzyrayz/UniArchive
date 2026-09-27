// DELETE /api/role-application/[id]
// The applicant withdraws their own pending application. The record is kept
// (status "withdrawn"), so they can apply again straight away.
import { NextResponse, type NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { getRoleApplicationModel } from "@/lib/models/roleApplicationModel";

type Context = { params: Promise<{ id: string }> };

const notFound = () =>
  NextResponse.json({ message: "Application not found." }, { status: 404 });

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return notFound();

    const RoleApplication = await getRoleApplicationModel();
    const applicantId = new Types.ObjectId(session.userId);
    const withdrawn = await RoleApplication.findOneAndUpdate(
      { _id: id, applicantId, status: "pending" },
      { $set: { status: "withdrawn" } },
      { returnDocument: "after" },
    ).lean();
    if (withdrawn) return NextResponse.json({ success: true });

    // Someone else's (or no such) application looks the same as missing
    const own = await RoleApplication.findOne({ _id: id, applicantId }).select("status").lean();
    if (!own) return notFound();
    return NextResponse.json(
      { message: `This application is already ${own.status}.` },
      { status: 409 },
    );
  } catch (error) {
    return handleRouteError(error, "DELETE /api/role-application/[id]");
  }
}
