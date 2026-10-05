// src/lib/emailLayout.ts
// The HTML frame every UniArchive email uses, and the renderer for messages
// staff write by hand. Pure string functions with no server imports, so the
// /admin/mail preview renders exactly what will be sent.

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const AUTOMATED_FOOTER = "This is an automated email. Please do not reply to this message.";

/**
 * The shared frame. `bodyHtml` must already be escaped. `footer` is plain
 * text (defaults to the "do not reply" line of automated emails) or
 * { html } already escaped, for footers with links.
 */
export function emailFrame(
  title: string,
  heading: string,
  bodyHtml: string,
  footer: string | { html: string } = AUTOMATED_FOOTER,
): string {
  const footerHtml = typeof footer === "string" ? escapeHtml(footer) : footer.html;
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
            <p>${footerHtml}</p>
          </div>
        </div>
      </body>
      </html>
    `;
}

// --- Messages written by staff (/admin/mail) --------------------------------

export const STAFF_MESSAGE_LIMITS = { subject: 150, body: 5000 } as const;

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

/** Escapes text and turns http(s) links into anchors. */
export function linkify(text: string): string {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0];
    const index = match.index ?? 0;
    html += escapeHtml(text.slice(last, index));
    html += `<a href="${escapeHtml(url)}" style="color: #667eea;">${escapeHtml(url)}</a>`;
    last = index + url.length;
  }
  return html + escapeHtml(text.slice(last));
}

/** Plain text -> paragraphs (blank lines) with line breaks and links. */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${para.split("\n").map(linkify).join("<br>")}</p>`)
    .join("\n          ");
}

export interface StaffMessage {
  recipientName: string;
  senderName: string;
  subject: string;
  body: string;
}

const STAFF_FOOTER =
  "You're receiving this because you have a UniArchive account. Reply to this email to reach the UniArchive team.";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

/** The email for a message written in /admin/mail: greeting, body, sign-off. */
export function renderStaffMessage(message: StaffMessage): { html: string; text: string } {
  const greeting = `Hi ${firstName(message.recipientName)},`;
  const signOff = `${message.senderName.trim() || "The UniArchive team"}\nUniArchive team`;
  const body = message.body.replace(/\r\n?/g, "\n").trim();
  const html = emailFrame(
    message.subject,
    "A message from the UniArchive team",
    `
          <p style="margin-top: 0;">${escapeHtml(greeting)}</p>
          ${plainTextToHtml(body)}
          <p>${signOff.split("\n").map(escapeHtml).join("<br>")}</p>`,
    STAFF_FOOTER,
  );
  const text = [greeting, "", body, "", signOff, "", "--", STAFF_FOOTER].join("\n");
  return { html, text };
}
