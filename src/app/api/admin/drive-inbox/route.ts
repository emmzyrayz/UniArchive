// /api/admin/drive-inbox — the platform Drive inbox (lib/drive/inbox.ts).
// Permission: "material.drive_inbox" (com_admin, dev).
// GET: the connection (account, who connected it, last check) and the 50
//      most recent inbox imports with who shared each file.
// DELETE: disconnect (revokes the token at Google, forgets it).
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { decryptSensitiveData } from "@/lib/encryption";
import { disconnectInbox, expectedInboxEmail } from "@/lib/drive/inbox";
import { getDriveImportModel, type IDriveImport } from "@/lib/models/driveImportModel";
import {
  getPlatformDriveConnectionModel,
  type IPlatformDriveConnection,
} from "@/lib/models/platformDriveConnectionModel";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "material.drive_inbox");
    const [Connection, DriveImport] = await Promise.all([getPlatformDriveConnectionModel(), getDriveImportModel()]);
    const [conn, recent] = await Promise.all([
      Connection.findOne({ key: "inbox" }).lean<IPlatformDriveConnection>(),
      DriveImport.find({ owner: "platform", via: "inbox" }).sort({ createdAt: -1 }).limit(50).lean<IDriveImport[]>(),
    ]);
    const decrypt = (v?: string) => {
      try {
        return v ? decryptSensitiveData(v) : undefined;
      } catch {
        return undefined;
      }
    };
    return NextResponse.json(
      {
        configured: !!(process.env.DRIVE_INBOX_CLIENT_ID?.trim() && process.env.DRIVE_INBOX_CLIENT_SECRET?.trim()),
        expectedEmail: expectedInboxEmail(),
        connection: conn
          ? {
              accountEmail: conn.accountEmail,
              connectedByUpid: conn.connectedBy.upid,
              connectedAt: conn.connectedAt,
              status: conn.status,
              lastError: conn.lastError ?? null,
              lastCheck: conn.lastCheck ?? null,
              running: !!conn.lockUntil && new Date(conn.lockUntil).getTime() > Date.now(),
            }
          : null,
        recent: recent.map((r) => ({
          id: String(r._id),
          name: r.name,
          status: r.status,
          message: r.message ?? null,
          sharedByName: r.sharedByName ?? null,
          sharedByEmail: decrypt(r.sharedByEmail) ?? null,
          bookId: r.bookId ? String(r.bookId) : null,
          createdAt: r.createdAt,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/drive-inbox");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requirePermission(request, "material.drive_inbox");
    await disconnectInbox();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/drive-inbox");
  }
}
