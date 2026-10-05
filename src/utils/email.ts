import nodemailer, { Transporter } from "nodemailer";
import { absoluteUrl } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/site";
import { resolveMailConfig, warnIfMailUnconfigured, type MailConfig } from "@/lib/mailConfig";
import { emailFrame, escapeHtml } from "@/lib/emailLayout";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback for clients that don't render HTML. */
  text?: string;
  /** Where replies go, e.g. the sender of a contact form message. */
  replyTo?: string;
}


// Outside production, print the email instead of failing silently, so codes
// and links can be read from the server console without SMTP configured.
function logEmailForDevelopment({ to, subject, html }: EmailOptions) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  console.info(`[email:dev] to=${to} subject="${subject}"\n${text}`);
}

// One transporter per server process, built from src/lib/mailConfig.ts on
// first use (not per send, so SMTP connections can be reused)
let cachedMail: { transporter: Transporter; config: MailConfig } | null = null;

/** The shared transporter and settings (also used by scripts/test-email.ts). */
export function getMailTransport(): { transporter: Transporter; config: MailConfig } {
  if (cachedMail) return cachedMail;
  const result = resolveMailConfig();
  if ("problem" in result) {
    warnIfMailUnconfigured();
    throw new Error(`Email is not configured: ${result.problem}`);
  }
  cachedMail = {
    transporter: nodemailer.createTransport(result.config.transport),
    config: result.config,
  };
  return cachedMail;
}

class EmailService {
  /**
   * Every email goes out from MAIL_FROM (no-reply@). Replies go to MAIL_REPLY_TO
   * (support) unless the message names its own, like a contact form message
   * replying to the person who wrote in.
   */
  async sendEmail({ to, subject, html, text, replyTo }: EmailOptions): Promise<boolean> {
    try {
      const { transporter, config } = getMailTransport();
      await transporter.sendMail({
        from: config.from,
        replyTo: replyTo ?? config.replyTo,
        to,
        subject,
        html,
        text,
      });
      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Email sending failed; printing it instead:", error);
        logEmailForDevelopment({ to, subject, html });
        return true;
      }
      console.error("Email sending failed:", error);
      return false;
    }
  }

  generateVerificationEmail(name: string, verificationCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - UniArchive</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">UniArchive</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${escapeHtml(name)}!</h2>
          <p>Thank you for signing up with UniArchive. To complete your registration, please verify your email address.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #667eea;">Your Verification Code</h3>
            <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px; font-family: monospace;">
              ${verificationCode}
            </div>
          </div>
          
          <p>This code will expire in 15 minutes. If you didn't create an account with UniArchive, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetEmail(
    name: string,
    resetToken: string,
    resetCode: string,
  ): string {
    const resetUrl = absoluteUrl(`/auth?view=verify&token=${encodeURIComponent(resetToken)}`);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - UniArchive</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">UniArchive</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${escapeHtml(name)}!</h2>
          <p>We received a request to reset your password for your UniArchive account.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #667eea;">Your Reset Code</h3>
            <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px; font-family: monospace;">
              ${resetCode}
            </div>
            <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">Enter this code on the reset page, or use the button below.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${resetUrl}
          </p>
          
          <p>The code expires in 15 minutes and the link in 1 hour. If you didn't request a password reset, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationCode: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: "Verify Your Email - UniArchive",
      html: this.generateVerificationEmail(name, verificationCode),
    });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
    resetCode: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: "Reset Your Password - UniArchive",
      html: this.generatePasswordResetEmail(name, resetToken, resetCode),
    });
  }
}

export const emailService = new EmailService();

// ---------------------------------------------------------------------------
// UniLibrary submission review
// ---------------------------------------------------------------------------

// Links in emails always use the canonical site URL (src/lib/seo.ts)
const appUrl = absoluteUrl;

/** Shared frame for the review emails; `bodyHtml` must already be escaped. */
const reviewEmailHtml = (title: string, heading: string, bodyHtml: string) =>
  emailFrame(title, heading, bodyHtml);

export async function sendSubmissionVerifiedEmail(params: {
  toEmail: string;
  toName: string;
  materialTitle: string;
  tier: 1 | 2;
  note?: string;
  materialUrl: string; // app path, e.g. /unilibrary
}): Promise<void> {
  const { toEmail, toName, materialTitle, tier, note, materialUrl } = params;
  const subject =
    tier === 1
      ? "Your material has been verified on UniArchive 🎉"
      : "Your material received a lecturer endorsement on UniArchive ⭐";
  const lead =
    tier === 1
      ? `Your material "${materialTitle}" has been verified on UniArchive.`
      : `Your material "${materialTitle}" has been endorsed on UniArchive.`;
  const detail =
    tier === 1
      ? "It's now visible in the UniLibrary with a verified badge."
      : "A lecturer has endorsed this material as academically accurate.";
  const link = appUrl(materialUrl);

  const text = [
    `Hi ${toName},`,
    "",
    lead,
    "",
    detail,
    ...(note ? ["", `Reviewer note: ${note}`] : []),
    "",
    `View it here: ${link}`,
    "",
    "Thank you for contributing to UniArchive!",
  ].join("\n");

  const html = reviewEmailHtml(
    subject,
    tier === 1 ? "Material Verified" : "Lecturer Endorsement",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>${escapeHtml(lead)}</p>
          <p>${escapeHtml(detail)}</p>
          ${
            note
              ? `<div style="background: white; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <strong>Reviewer note:</strong> ${escapeHtml(note)}
          </div>`
              : ""
          }
          <div style="text-align: center; margin: 30px 0;">
            <a href="${escapeHtml(link)}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Open the UniLibrary
            </a>
          </div>
          <p>Thank you for contributing to UniArchive!</p>`,
  );

  await emailService.sendEmail({ to: toEmail, subject, html, text });
}

export async function sendSubmissionRejectedEmail(params: {
  toEmail: string;
  toName: string;
  materialTitle: string;
  reason: string;
}): Promise<void> {
  const { toEmail, toName, materialTitle, reason } = params;
  const subject = "Your UniArchive submission needs attention";
  const link = appUrl("/home");

  const text = [
    `Hi ${toName},`,
    "",
    `Your submission "${materialTitle}" could not be verified at this time.`,
    "",
    `Reason: ${reason}`,
    "",
    "You can update your submission and resubmit it from your library:",
    link,
  ].join("\n");

  const html = reviewEmailHtml(
    subject,
    "Submission Update",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>Your submission "${escapeHtml(materialTitle)}" could not be verified at this time.</p>
          <div style="background: white; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <strong>Reason:</strong> ${escapeHtml(reason)}
          </div>
          <p>You can update your submission and resubmit it from your library.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${escapeHtml(link)}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Go to my library
            </a>
          </div>`,
  );

  await emailService.sendEmail({ to: toEmail, subject, html, text });
}

// ---------------------------------------------------------------------------
// Role applications
// ---------------------------------------------------------------------------

export async function sendRoleApplicationApprovedEmail(params: {
  toEmail: string;
  toName: string;
  newRole: string; // display label, e.g. "Collaborator"
}): Promise<void> {
  const { toEmail, toName, newRole } = params;
  const subject = `You've been promoted to ${newRole} on UniArchive 🎉`;
  const link = appUrl("/dashboard");

  const text = [
    `Hi ${toName},`,
    "",
    `Congratulations! You are now a ${newRole} on UniArchive.`,
    "",
    "You've been signed out on your devices so your new permissions take effect. Sign in again to use them.",
    "",
    `Open your dashboard: ${link}`,
    "",
    "Thank you for contributing to UniArchive!",
  ].join("\n");

  const html = reviewEmailHtml(
    subject,
    "Role Application Approved",
    `
          <h2 style="color: #333; margin-top: 0;">Congratulations ${escapeHtml(toName)}!</h2>
          <p>You are now a <strong>${escapeHtml(newRole)}</strong> on UniArchive.</p>
          <p>You've been signed out on your devices so your new permissions take effect. Sign in again to use them.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${escapeHtml(link)}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Open my dashboard
            </a>
          </div>
          <p>Thank you for contributing to UniArchive!</p>`,
  );

  await emailService.sendEmail({ to: toEmail, subject, html, text });
}

export async function sendRoleApplicationRejectedEmail(params: {
  toEmail: string;
  toName: string;
  targetRole: string; // display label, e.g. "Collaborator"
  reviewNote: string;
}): Promise<void> {
  const { toEmail, toName, targetRole, reviewNote } = params;
  const subject = "Your UniArchive role application was reviewed";
  const link = appUrl("/dashboard");

  const text = [
    `Hi ${toName},`,
    "",
    `Your application for ${targetRole} was not approved at this time.`,
    "",
    `Reason: ${reviewNote}`,
    "",
    "You can apply again from your dashboard once you've addressed the feedback:",
    link,
  ].join("\n");

  const html = reviewEmailHtml(
    subject,
    "Role Application Update",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>Your application for <strong>${escapeHtml(targetRole)}</strong> was not approved at this time.</p>
          <div style="background: white; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <strong>Reason:</strong> ${escapeHtml(reviewNote)}
          </div>
          <p>You can apply again from your dashboard once you've addressed the feedback.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${escapeHtml(link)}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Open my dashboard
            </a>
          </div>`,
  );

  await emailService.sendEmail({ to: toEmail, subject, html, text });
}

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

/**
 * Where contact form messages go: the support address, which the domain's
 * mail forwarder delivers to the team's Gmail inbox. CONTACT_EMAIL overrides
 * it (e.g. to test locally without the forwarder).
 */
function contactInbox(): string {
  return process.env.CONTACT_EMAIL?.trim() || SUPPORT_EMAIL;
}

/**
 * Forwards a contact form message to the team. Replies go straight to the
 * sender. Returns false when it couldn't be sent.
 */
export async function sendContactMessageEmail(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
  ip: string;
  submittedAt: Date;
}): Promise<boolean> {
  const to = contactInbox();
  const { name, email, subject, message, ip, submittedAt } = params;
  const stamp = submittedAt.toISOString();

  const text = [
    "New contact form submission from UniArchive",
    "",
    `From: ${name} <${email}>`,
    `Subject: ${subject}`,
    "",
    "Message:",
    message,
    "",
    `Submitted at: ${stamp}`,
    `IP: ${ip}`,
  ].join("\n");

  const html = reviewEmailHtml(
    "New contact message",
    "Contact Form",
    `
          <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <div style="background: white; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; white-space: pre-wrap;">${escapeHtml(message)}</div>
          <p style="font-size: 12px; color: #666;">Submitted at ${escapeHtml(stamp)} · IP ${escapeHtml(ip)}</p>`,
  );

  return emailService.sendEmail({
    to,
    subject: `[UniArchive Contact] ${subject}`,
    html,
    text,
    replyTo: email,
  });
}

/** Tells the sender their message arrived. */
export async function sendContactConfirmationEmail(params: {
  toEmail: string;
  toName: string;
  subject: string;
}): Promise<boolean> {
  const { toEmail, toName, subject } = params;
  const text = [
    `Hi ${toName},`,
    "",
    "Thanks for reaching out. We'll get back to you within 48 hours.",
    "",
    `Your message: ${subject}`,
  ].join("\n");
  const html = reviewEmailHtml(
    "We received your message",
    "Message Received",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>Thanks for reaching out. We'll get back to you within 48 hours.</p>
          <p><strong>Your message:</strong> ${escapeHtml(subject)}</p>`,
  );
  return emailService.sendEmail({
    to: toEmail,
    subject: "We received your message — UniArchive",
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// Sign-in security: Google account linking and new-device codes
// ---------------------------------------------------------------------------

function codeBlockHtml(label: string, code: string): string {
  return `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #667eea;">${escapeHtml(label)}</h3>
            <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px; font-family: monospace;">
              ${escapeHtml(code)}
            </div>
          </div>`;
}

/** Code confirming that a Google account may be linked to this account. */
export async function sendLinkConfirmationEmail(params: {
  toEmail: string;
  toName: string;
  otp: string;
  googleEmail: string;
}): Promise<boolean> {
  const { toEmail, toName, otp, googleEmail } = params;
  const text = [
    `Hi ${toName},`,
    "",
    `Someone is trying to link the Google account ${googleEmail} to your UniArchive account. If this was you, enter this code:`,
    "",
    `    ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "If you didn't request this, ignore this email. Your account is safe.",
  ].join("\n");
  const html = reviewEmailHtml(
    "Confirm linking Google to your UniArchive account",
    "Link Google Account",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>Someone is trying to link the Google account <strong>${escapeHtml(googleEmail)}</strong> to your UniArchive account. If this was you, enter this code:</p>
          ${codeBlockHtml("Your Confirmation Code", otp)}
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this, ignore this email. Your account is safe.</p>`,
  );
  return emailService.sendEmail({
    to: toEmail,
    subject: "Confirm linking Google to your UniArchive account",
    html,
    text,
  });
}

/** Code for a sign-in from a device the user hasn't trusted yet. */
export async function sendDeviceVerificationEmail(params: {
  toEmail: string;
  toName: string;
  otp: string;
  deviceName: string;
}): Promise<boolean> {
  const { toEmail, toName, otp, deviceName } = params;
  const resetUrl = appUrl("/auth?view=forgot-password");
  const text = [
    `Hi ${toName},`,
    "",
    "A sign-in was attempted from a new device:",
    `Device: ${deviceName}`,
    "",
    "Enter this code to complete sign-in:",
    "",
    `    ${otp}`,
    "",
    "This code expires in 10 minutes.",
    `If this wasn't you, your password may be compromised. Change it immediately: ${resetUrl}`,
  ].join("\n");
  const html = reviewEmailHtml(
    "New sign-in attempt on UniArchive",
    "New Sign-in",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>A sign-in was attempted from a new device:</p>
          <p><strong>Device:</strong> ${escapeHtml(deviceName)}</p>
          <p>Enter this code to complete sign-in:</p>
          ${codeBlockHtml("Your Sign-in Code", otp)}
          <p>This code expires in 10 minutes.</p>
          <p>If this wasn't you, your password may be compromised. <a href="${escapeHtml(resetUrl)}" style="color: #667eea;">Change it immediately</a>.</p>`,
  );
  return emailService.sendEmail({
    to: toEmail,
    subject: "New sign-in attempt on UniArchive",
    html,
    text,
  });
}

/** Code proving a student can read their school email (signup). */
export async function sendSchoolEmailCode(params: {
  toEmail: string;
  school: string;
  otp: string;
}): Promise<boolean> {
  const { toEmail, school, otp } = params;
  const text = [
    "Hi,",
    "",
    `Someone is signing up to UniArchive as a student of ${school} with this school email. If this was you, enter this code:`,
    "",
    `    ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "If you didn't request this, ignore this email. Nothing will be linked to your address.",
  ].join("\n");
  const html = reviewEmailHtml(
    "Your UniArchive school email code",
    "Verify Your School Email",
    `
          <h2 style="color: #333; margin-top: 0;">Hi,</h2>
          <p>Someone is signing up to UniArchive as a student of <strong>${escapeHtml(school)}</strong> with this school email. If this was you, enter this code:</p>
          ${codeBlockHtml("Your School Email Code", otp)}
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this, ignore this email. Nothing will be linked to your address.</p>`,
  );
  return emailService.sendEmail({
    to: toEmail,
    subject: "Your UniArchive school email code",
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// Messages written by staff in /admin/mail
// ---------------------------------------------------------------------------

/**
 * Sends a staff-written message (rendered by lib/emailLayout.ts). Unlike the
 * automatic emails it reports what happened, so /admin/mail can log the
 * provider's message id or the failure; nothing is printed instead outside
 * production. Replies go to support@.
 */
export async function sendStaffMessageEmail(params: {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    const { transporter, config } = getMailTransport();
    const info = await transporter.sendMail({
      from: config.from,
      replyTo: config.replyTo,
      to: params.toEmail,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { ok: true, messageId: String(info.messageId ?? "") };
  } catch (error) {
    console.error("[email] staff message failed:", error);
    // A short reason for the admin log (SMTP replies carry no secrets)
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: reason.slice(0, 200) };
  }
}

// ---------------------------------------------------------------------------
// Account deletion (lib/account/deletion.ts)
// ---------------------------------------------------------------------------

/** Code confirming the account owner wants it deleted. */
export async function sendAccountDeletionCode(params: { toEmail: string; toName: string; otp: string }): Promise<boolean> {
  const { toEmail, toName, otp } = params;
  const text = [
    `Hi ${toName},`,
    "",
    "Someone asked to delete your UniArchive account. If this was you, enter this code to confirm:",
    "",
    `    ${otp}`,
    "",
    "This code expires in 10 minutes. Your account is kept for 7 days after you confirm; signing in during that time cancels the deletion.",
    "If you didn't ask for this, ignore this email and consider changing your password.",
  ].join("\n");
  const html = reviewEmailHtml(
    "Confirm deleting your UniArchive account",
    "Delete Your Account",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>Someone asked to delete your UniArchive account. If this was you, enter this code to confirm:</p>
          ${codeBlockHtml("Your Confirmation Code", otp)}
          <p>This code expires in 10 minutes. Your account is kept for 7 days after you confirm; signing in during that time cancels the deletion.</p>
          <p>If you didn't ask for this, ignore this email and consider changing your password.</p>`,
  );
  return emailService.sendEmail({ to: toEmail, subject: "Confirm deleting your UniArchive account", html, text });
}

/** The deletion is confirmed: when it happens and how to stop it. */
export async function sendAccountDeletionScheduled(params: { toEmail: string; toName: string; purgeAfter: Date }): Promise<boolean> {
  const { toEmail, toName, purgeAfter } = params;
  const when = purgeAfter.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const signIn = appUrl("/auth?view=signin");
  const text = [
    `Hi ${toName},`,
    "",
    `Your UniArchive account will be deleted on ${when}. You've been signed out everywhere.`,
    "",
    `Changed your mind? Sign in before then and the deletion is cancelled: ${signIn}`,
    "",
    "Materials you published in the UniLibrary stay there for other students, credited to a former member; everything else is erased.",
  ].join("\n");
  const html = reviewEmailHtml(
    "Your UniArchive account will be deleted",
    "Account Deletion Scheduled",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>Your UniArchive account will be deleted on <strong>${escapeHtml(when)}</strong>. You've been signed out everywhere.</p>
          <p>Changed your mind? <a href="${escapeHtml(signIn)}" style="color: #667eea;">Sign in</a> before then and the deletion is cancelled.</p>
          <p>Materials you published in the UniLibrary stay there for other students, credited to a former member; everything else is erased.</p>`,
  );
  return emailService.sendEmail({ to: toEmail, subject: "Your UniArchive account will be deleted", html, text });
}

/** Signing in during the grace period cancelled the deletion. */
export async function sendAccountDeletionCancelled(params: { toEmail: string; toName: string }): Promise<boolean> {
  const { toEmail, toName } = params;
  const text = [
    `Hi ${toName},`,
    "",
    "Welcome back. You signed in, so your account is no longer scheduled for deletion. Everything is as you left it.",
    "If that sign-in wasn't you, change your password now.",
  ].join("\n");
  const html = reviewEmailHtml(
    "Your UniArchive account won't be deleted",
    "Deletion Cancelled",
    `
          <h2 style="color: #333; margin-top: 0;">Hi ${escapeHtml(toName)},</h2>
          <p>Welcome back. You signed in, so your account is no longer scheduled for deletion. Everything is as you left it.</p>
          <p>If that sign-in wasn't you, <a href="${escapeHtml(appUrl("/auth?view=forgot-password"))}" style="color: #667eea;">change your password</a> now.</p>`,
  );
  return emailService.sendEmail({ to: toEmail, subject: "Your UniArchive account won't be deleted", html, text });
}
