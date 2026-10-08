// POST /api/admin/economy/adjust
// A staff correction: { target: "<upid>" | "treasury", currency: "AC" | "XP",
// amount (negative takes back), note }. Kept in the ledger with who did it
// and why. Permission: economy.manage.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { economyRouteError } from "@/lib/economy/http";
import { adjust } from "@/lib/economy/wallet";
import { SYSTEM_ACCOUNTS, userAccount, type Currency } from "@/lib/economy/currencies";
import { getUserModel } from "@/lib/models/userModel";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "economy.manage");
    await enforceRateLimit(request, "economyAdmin", `economy-admin:${session.userId}`);
    const body = await readJson<{ target: string; currency: string; amount: number; note: string }>(request);
    const target = typeof body?.target === "string" ? body.target.trim().replace(/^@/, "") : "";
    if (!target) return NextResponse.json({ message: "Say whose balance to adjust." }, { status: 400 });

    let account: string;
    if (target === "treasury") {
      if (body?.currency !== "AC") return NextResponse.json({ message: "The treasury only holds AC." }, { status: 400 });
      account = SYSTEM_ACCOUNTS.treasury;
    } else {
      const user = await (await getUserModel()).findOne({ upid: target }).select("_id").lean();
      if (!user) return NextResponse.json({ message: `No member has the id @${target}.` }, { status: 404 });
      account = userAccount(user._id);
    }
    const { entry } = await adjust({
      account,
      currency: body?.currency as Currency,
      amount: body?.amount as number,
      note: typeof body?.note === "string" ? body.note : "",
      actorId: session.userId,
    });
    return NextResponse.json({ entryId: String(entry._id) }, { status: 201 });
  } catch (error) {
    return economyRouteError(error, "POST /api/admin/economy/adjust");
  }
}
