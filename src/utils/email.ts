import nodemailer, { Transporter } from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback for clients that don't render HTML. */
  text?: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

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

class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      throw new Error("Email credentials are not properly configured");
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPass },
    });

    return this.transporter;
  }

  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      const emailUser = process.env.EMAIL_USER;

      await transporter.sendMail({
        from: `"UniArchive" <${emailUser}>`,
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
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth?view=verify&token=${encodeURIComponent(resetToken)}`;

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

function appUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return `${origin}${path}`;
}

/** Shared frame for the review emails; `bodyHtml` must already be escaped. */
function reviewEmailHtml(title: string, heading: string, bodyHtml: string): string {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">UniArchive</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">${escapeHtml(heading)}</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          ${bodyHtml}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
}

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
