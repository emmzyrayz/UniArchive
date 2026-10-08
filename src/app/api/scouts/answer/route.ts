// POST /api/scouts/answer
// Answers a voted Scout task: { token, answer, note? }. The token comes
// with the task (GET /api/scouts/next) and ties the answer to this person
// and subject; it's refused if sent too soon (the task wasn't looked at) or
// after an hour. 201 with whether it counted and, if this answer settled
// the subject, the result and whether they were paid.
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { economyRouteError } from "@/lib/economy/http";
import { submitAnswer } from "@/lib/scouts/engine";
import { checkTaskToken } from "@/lib/scouts/token";

const TOKEN_ERRORS = {
  invalid: "This task isn't valid any more. Load the next one.",
  too_soon: "Take a moment to look at it first.",
  expired: "This task expired. Load the next one.",
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    await enforceRateLimit(request, "scoutAnswer", `scout-answer:${session.userId}`);
    const body = await readJson<{ token: unknown; answer: unknown; note: unknown }>(request);
    const check = checkTaskToken(body?.token, session.userId);
    if (!check.ok) {
      return NextResponse.json({ message: TOKEN_ERRORS[check.reason], code: check.reason }, { status: check.reason === "too_soon" ? 425 : 400 });
    }
    const result = await submitAnswer(session.userId, {
      task: check.task,
      subjectId: check.subjectId,
      answer: typeof body?.answer === "string" ? body.answer : "",
      note: typeof body?.note === "string" ? body.note : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return economyRouteError(error, "POST /api/scouts/answer");
  }
}
