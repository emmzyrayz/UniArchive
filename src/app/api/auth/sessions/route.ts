// GET /api/auth/sessions
// The signed-in user's active sessions (device, IP, location, last active)
// and their recent login history, for Settings > Privacy.
//
// DELETE /api/auth/sessions?scope=others|all
//  - others: signs out every other session and forgets the other trusted
//    devices; this browser stays signed in.
//  - all: signs out everywhere including here, bumps tokenVersion so every
//    outstanding session JWT is rejected too, and forgets all trusted
//    devices (the next sign-in anywhere asks for an emailed code).
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCacheModel } from "@/lib/models/sessionCacheModel";
import { getLoginEventModel } from "@/lib/models/loginEventModel";
import { getUserModel } from "@/lib/models/userModel";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { hashForSearch } from "@/lib/encryption";
import {
  SESSION_COOKIE,
  readSessionToken,
  requireAuth,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { SESSION_JWT_COOKIE, sessionJwtCookieOptions } from "@/lib/auth/jwt";
import { cacheTokenVersion } from "@/lib/auth/tokenVersionCache";
import {
  clearDeviceCookie,
  readDeviceToken,
  revokeTrustedDevices,
} from "@/lib/auth/deviceRecognition";

const HISTORY_LIMIT = 30;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "standard", `sessions:${session.userId}`);
    const currentHash = hashForSearch(readSessionToken(request) ?? "");

    const SessionCache = await getSessionCacheModel();
    const LoginEvent = await getLoginEventModel();
    const [active, events] = await Promise.all([
      SessionCache.find({
        userId: session.userId,
        isActive: true,
        isSignedIn: true,
        expiresAt: { $gt: new Date() },
      })
        .select("uuid sessionTokenHash deviceInfo deviceType ipAddress location createdAt lastActivity")
        .sort({ lastActivity: -1 })
        .limit(50)
        .lean(),
      LoginEvent.find({ userId: session.userId })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean(),
    ]);

    const activeUuids = new Set(active.map((s) => s.uuid));
    return NextResponse.json(
      {
        sessions: active.map((s) => ({
          id: s.uuid,
          device: s.deviceInfo ?? "Unknown device",
          deviceType: s.deviceType ?? "desktop",
          ipAddress: s.ipAddress ?? "unknown",
          location: s.location ?? null,
          signedInAt: s.createdAt,
          lastActiveAt: s.lastActivity,
          current: s.sessionTokenHash === currentHash,
        })),
        history: events.map((e) => ({
          id: String(e._id),
          method: e.method,
          viaEmailCode: e.viaEmailCode,
          device: e.device,
          deviceType: e.deviceType,
          ipAddress: e.ipAddress,
          location: e.location ?? null,
          at: e.createdAt,
          stillSignedIn: activeUuids.has(e.sessionUuid),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "sessions");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "auth", `sessions-revoke:${session.userId}`);

    const scope = request.nextUrl.searchParams.get("scope");
    if (scope !== "others" && scope !== "all") {
      return NextResponse.json({ message: "Unknown scope." }, { status: 400 });
    }
    const rawToken = readSessionToken(request);
    const SessionCache = await getSessionCacheModel();

    if (scope === "others") {
      const result = await SessionCache.updateMany(
        {
          userId: session.userId,
          isSignedIn: true,
          sessionTokenHash: { $ne: hashForSearch(rawToken ?? "") },
        },
        { isActive: false, isSignedIn: false, updatedAt: new Date() },
      );
      await revokeTrustedDevices(session.userId, readDeviceToken(request));
      return NextResponse.json({ success: true, signedOut: result.modifiedCount ?? 0 });
    }

    // Everywhere: also revoke the JWTs the proxy trusts for up to 15 minutes
    const User = await getUserModel();
    const bumped = await User.findByIdAndUpdate(
      session.userId,
      { $inc: { tokenVersion: 1 } },
      { returnDocument: "after", projection: { tokenVersion: 1 } },
    ).lean();
    if (bumped) await cacheTokenVersion(session.userId, bumped.tokenVersion ?? 0);
    const { modifiedCount } = await SessionCache.invalidateAllUserSessions(session.userId);
    await revokeTrustedDevices(session.userId);

    const response = NextResponse.json({ success: true, signedOut: modifiedCount });
    response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    response.cookies.set(SESSION_JWT_COOKIE, "", sessionJwtCookieOptions(0));
    clearDeviceCookie(response);
    return response;
  } catch (error) {
    return handleRouteError(error, "sessions-revoke");
  }
}
