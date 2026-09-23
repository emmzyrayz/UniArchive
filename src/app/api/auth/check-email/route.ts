// POST /api/auth/check-email
// Tells the signup wizard which branch to take. The response itself reveals
// whether an account exists (the UI needs that), so the defences here are the
// rate limit and a fixed minimum response time.
import { NextResponse, type NextRequest } from "next/server";
import { getUserModel } from "@/lib/models/userModel";
import { hashForSearch } from "@/lib/encryption";
import { EMAIL_REGEX, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { normaliseEmail, withMinimumDuration } from "@/lib/auth/tokens";

type EmailStatus = "new" | "existing" | "pending";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "check-email", 10);

    const body = await readJson<{ email: string }>(request);
    const email =
      typeof body?.email === "string" ? normaliseEmail(body.email) : "";
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const status = await withMinimumDuration(
      (async (): Promise<EmailStatus> => {
        const User = await getUserModel();
        const user = await User.findOne({ emailHash: hashForSearch(email) })
          .select("isVerified")
          .lean();
        if (!user) return "new";
        return user.isVerified ? "existing" : "pending";
      })(),
    );

    return NextResponse.json({ status });
  } catch (error) {
    return handleRouteError(error, "check-email");
  }
}
