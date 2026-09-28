// POST /api/contact
// The public contact form. No sign-in needed.
// Body: { name, email, subject, message, website? }
//
// `website` is a honeypot the form hides from people; a bot that fills it
// gets the normal success response and nothing is sent. Real messages go to
// CONTACT_EMAIL (or EMAIL_USER) with Reply-To set to the sender, and the
// sender gets a confirmation. 3 sent messages per IP per hour.
import { NextResponse, type NextRequest } from "next/server";
import { EMAIL_REGEX, getClientIp, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimitRedis";
import { sendContactConfirmationEmail, sendContactMessageEmail } from "@/utils/email";

const LIMITS = { name: 100, email: 254, subject: 200, message: 2000 } as const;
const SENT = { success: true, message: "Message sent" };

const fail = (status: number, message: string) => NextResponse.json({ message }, { status });

/** One line of text: trimmed, with line breaks (header injection) removed. */
const oneLine = (value: unknown) =>
  typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim() : "";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request.");

    // Don't tell bots they were caught
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json(SENT);
    }

    const name = oneLine(body.name);
    const email = oneLine(body.email).toLowerCase();
    const subject = oneLine(body.subject);
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || name.length > LIMITS.name) {
      return fail(400, `Please enter your name (up to ${LIMITS.name} characters).`);
    }
    if (!EMAIL_REGEX.test(email) || email.length > LIMITS.email) {
      return fail(400, "Please enter a valid email address.");
    }
    if (!subject || subject.length > LIMITS.subject) {
      return fail(400, `Please choose a subject (up to ${LIMITS.subject} characters).`);
    }
    if (!message || message.length > LIMITS.message) {
      return fail(400, `Please enter a message (up to ${LIMITS.message} characters).`);
    }

    // Only messages that would actually be sent count toward the limit
    await enforceRateLimit(request, "contact", `contact:${getClientIp(request)}`);

    const sent = await sendContactMessageEmail({
      name,
      email,
      subject,
      message,
      ip: getClientIp(request),
      submittedAt: new Date(),
    });
    if (!sent) {
      return fail(502, "We couldn't send your message right now. Please try again later.");
    }

    // The team has the message; a failed confirmation shouldn't say otherwise
    await sendContactConfirmationEmail({ toEmail: email, toName: name, subject }).catch((error) =>
      console.error("contact: confirmation email failed:", error),
    );

    return NextResponse.json(SENT);
  } catch (error) {
    return handleRouteError(error, "POST /api/contact");
  }
}
