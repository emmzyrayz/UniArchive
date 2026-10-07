// src/lib/cronAuth.ts
// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Returns a
// response to send back when the request may not run the job, or null.
import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";

export function cronDenied(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ message: "CRON_SECRET is not set." }, { status: 503 });
  const given = request.headers.get("authorization") ?? "";
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(`Bearer ${secret}`).digest();
  return crypto.timingSafeEqual(a, b) ? null : NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
