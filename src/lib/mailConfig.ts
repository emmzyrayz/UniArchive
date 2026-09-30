// src/lib/mailConfig.ts
// Which SMTP server outgoing email uses, from env. Transactional email goes
// through ZeptoMail (smtp.zeptomail.com:587, user "emailapikey", password =
// the Mail Agent's SMTP token) from no-reply@uniarchive.com.ng; any other
// SMTP host works too, so switching providers is an env change only.
//
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true" for port 465), SMTP_USER,
//   SMTP_PASS, MAIL_FROM (defaults to "UniArchive <no-reply@...>"),
//   MAIL_REPLY_TO (defaults to SUPPORT_EMAIL)
//
// Until SMTP_* is set, the older Gmail settings (EMAIL_USER / EMAIL_PASS)
// are used, so production keeps sending during the switch. Remove them from
// the environment once ZeptoMail is live.
//
// No nodemailer import here: src/instrumentation.ts checks this at startup.
import { NO_REPLY_EMAIL, SUPPORT_EMAIL } from "@/lib/site";

export const DEFAULT_MAIL_FROM = `UniArchive <${NO_REPLY_EMAIL}>`;

export interface MailConfig {
  source: "smtp" | "gmail";
  transport:
    | { host: string; port: number; secure: boolean; auth: { user: string; pass: string } }
    | { service: "gmail"; auth: { user: string; pass: string } };
  /** Sender for every email, e.g. "UniArchive <no-reply@uniarchive.com.ng>". */
  from: string;
  /** Where replies go unless a message sets its own (the contact form does). */
  replyTo: string;
}

const env = (name: string) => process.env[name]?.trim() || undefined;

/** The mail settings, or a description of what's missing (no secrets). */
export function resolveMailConfig(): { config: MailConfig } | { problem: string } {
  const replyTo = env("MAIL_REPLY_TO") ?? SUPPORT_EMAIL;
  const mailFrom = env("MAIL_FROM");

  const host = env("SMTP_HOST");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  if (host || user || pass) {
    const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASS"].filter(
      Boolean,
    );
    if (missing.length > 0) {
      return { problem: `SMTP settings are incomplete: set ${missing.join(", ")}.` };
    }
    const secureSetting = env("SMTP_SECURE")?.toLowerCase();
    const port = Number(env("SMTP_PORT") ?? (secureSetting === "true" ? 465 : 587));
    if (!Number.isInteger(port) || port <= 0) {
      return { problem: "SMTP_PORT must be a port number, e.g. 587 or 465." };
    }
    return {
      config: {
        source: "smtp",
        // 465 is implicit TLS; 587 upgrades with STARTTLS (secure: false)
        transport: {
          host: host!,
          port,
          secure: secureSetting ? secureSetting === "true" : port === 465,
          auth: { user: user!, pass: pass! },
        },
        from: mailFrom ?? DEFAULT_MAIL_FROM,
        replyTo,
      },
    };
  }

  // Legacy: Gmail with an app password
  const gmailUser = env("EMAIL_USER");
  const gmailPass = env("EMAIL_PASS");
  if (gmailUser && gmailPass) {
    return {
      config: {
        source: "gmail",
        transport: { service: "gmail", auth: { user: gmailUser, pass: gmailPass } },
        from: mailFrom ?? `"UniArchive" <${gmailUser}>`,
        replyTo,
      },
    };
  }

  return {
    problem:
      "No email settings: set SMTP_HOST, SMTP_USER and SMTP_PASS (or the legacy EMAIL_USER and EMAIL_PASS).",
  };
}

let warned = false;

/** Logs once, server-side, when email can't be sent. Never logs values. */
export function warnIfMailUnconfigured(): void {
  if (warned) return;
  const result = resolveMailConfig();
  if ("problem" in result) {
    warned = true;
    console.warn(`[email] ${result.problem} Outgoing email will not be delivered.`);
  }
}
