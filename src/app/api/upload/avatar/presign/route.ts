// POST /api/upload/avatar/presign
// Signs a direct browser upload of the caller's avatar to Cloudinary. The
// browser POSTs the file with `fields` to `uploadUrl`, then sends the
// returned secure_url to PATCH /api/user/profile as `profilePhoto`.
// The API key in `fields` is a public identifier; the secret never leaves
// the server, and the signature pins the folder, public ID and transformation.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { createSignedAvatarUpload } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "upload", `avatar-presign:${session.userId}`);

    return NextResponse.json(createSignedAvatarUpload(session.userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(error, "upload/avatar/presign");
  }
}
