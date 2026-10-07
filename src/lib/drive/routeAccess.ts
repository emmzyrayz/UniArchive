// src/lib/drive/routeAccess.ts
// What the Drive import routes (/api/drive/*) share: the import target and
// who may use it, the server API key for public links, and the daily limits.
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { requirePermission, type SessionUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { getDriveImportModel } from "@/lib/models/driveImportModel";

export type DriveTarget = "library" | "platform";

/** Students may import this much into their library per 24 hours. */
export const LIBRARY_DAILY_BYTES = 2 * 1024 * 1024 * 1024;

const ID = /^[A-Za-z0-9_-]{10,100}$/;
const KEY = /^[A-Za-z0-9_-]{1,100}$/;

function fail(status: number, message: string): never {
  throw NextResponse.json({ message }, { status });
}

export const isDriveId = (v: unknown): v is string => typeof v === "string" && ID.test(v);
export const isResourceKey = (v: unknown): v is string => typeof v === "string" && KEY.test(v);
/** A Google OAuth access token (opaque; "ya29." and friends). */
export const isAccessToken = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9._~+/=-]{20,4096}$/.test(v);

/** "library" (anyone who may upload) or "platform" (staff with material.ingest). */
export async function authorizeTarget(
  request: NextRequest,
  target: unknown,
): Promise<{ session: SessionUser; target: DriveTarget }> {
  if (target !== "library" && target !== "platform") fail(400, 'target must be "library" or "platform".');
  const session = await requirePermission(request, target === "platform" ? "material.ingest" : "upload");
  return { session, target };
}

/** The server key for "Anyone with the link" files; 503 until it's set. */
export function publicLinkKey(): string {
  const key = process.env.GOOGLE_DRIVE_API_KEY?.trim();
  if (!key) fail(503, "Importing from Google Drive links isn't set up yet.");
  return key;
}

/** Per-user limits on imports: files per day, and bytes per day for students. */
export async function enforceImportLimits(request: NextRequest, session: SessionUser, target: DriveTarget) {
  await enforceRateLimit(
    request,
    target === "platform" ? "driveImportStaff" : "driveImport",
    `drive-import:${target}:${session.userId}`,
  );
  if (target !== "library") return;
  const DriveImport = await getDriveImportModel();
  const [used] = await DriveImport.aggregate<{ bytes: number }>([
    {
      $match: {
        importedBy: new Types.ObjectId(session.userId),
        target: "library",
        status: "imported",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    },
    { $group: { _id: null, bytes: { $sum: { $ifNull: ["$size", 0] } } } },
  ]);
  if ((used?.bytes ?? 0) >= LIBRARY_DAILY_BYTES) {
    fail(429, "You've imported 2 GB from Google Drive today. Try again tomorrow.");
  }
}

/** Drive file ids this owner has imported before (or skipped as duplicates). */
export async function importedBefore(owner: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const DriveImport = await getDriveImportModel();
  const found = await DriveImport.distinct("driveFileId", {
    owner,
    driveFileId: { $in: ids },
    status: { $in: ["imported", "duplicate"] },
  });
  return new Set(found.map(String));
}
