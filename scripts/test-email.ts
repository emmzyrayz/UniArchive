// scripts/test-email.ts
// Sends ONE test email with the current mail settings (src/lib/mailConfig.ts).
//
//   pnpm email:test you@example.com
//
// Reads .env.local. Variables already set in the shell win, so ZeptoMail can
// be tried without editing the file, e.g. in PowerShell:
//
//   $env:SMTP_HOST="smtp.zeptomail.com"; $env:SMTP_PORT="587"
//   $env:SMTP_USER="emailapikey"; $env:SMTP_PASS="<Send Mail token>"
//   $env:MAIL_FROM="UniArchive <noreply@uniarchive.com.ng>"
//   pnpm email:test you@example.com
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

async function main(): Promise<void> {
  const to = process.argv[2]?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error("Usage: pnpm email:test <recipient@example.com>");
    process.exit(1);
  }

  // Imported after the env is loaded: these read it when first used
  const { resolveMailConfig } = await import("../src/lib/mailConfig");
  const { getMailTransport } = await import("../src/utils/email");

  const resolved = resolveMailConfig();
  if ("problem" in resolved) {
    console.error(`Mail is not configured: ${resolved.problem}`);
    process.exit(1);
  }
  const { config } = resolved;
  const t = config.transport;
  console.log("Settings (password not shown):");
  console.log(`  source:   ${config.source}`);
  if ("host" in t) {
    console.log(`  server:   ${t.host}:${t.port} (${t.secure ? "SSL/TLS" : "STARTTLS"})`);
  } else {
    console.log("  server:   Gmail");
  }
  console.log(`  user:     ${t.auth.user}`);
  console.log(`  from:     ${config.from}`);
  console.log(`  reply-to: ${config.replyTo}`);

  const { transporter } = getMailTransport();
  await transporter.verify();
  console.log("✓ Connected and authenticated");

  const sentAt = new Date().toISOString();
  const info = await transporter.sendMail({
    from: config.from,
    replyTo: config.replyTo,
    to,
    subject: "UniArchive test email",
    text: `This is a test email from UniArchive (${config.source}), sent ${sentAt}.\nReplies should go to ${config.replyTo}.`,
    html: `<p>This is a test email from UniArchive (<strong>${config.source}</strong>), sent ${sentAt}.</p><p>Replies should go to ${config.replyTo}.</p>`,
  });
  console.log(`✓ Sent to ${to} (message id ${info.messageId})`);
}

main().catch((error: unknown) => {
  console.error("✗ Test email failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
