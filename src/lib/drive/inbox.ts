// src/lib/drive/inbox.ts
// The platform Drive inbox: people who'd rather not join share PDFs (or
// folders) with UniArchive's Gmail, and this imports them into the staff
// queue as unidentified uploads (source "drive_inbox", who shared them
// noted, no credit). An admin connects the account once
// (/admin/materials/drive-inbox: OAuth with drive.readonly and offline
// access, a separate OAuth client from sign-in); the refresh token is kept
// encrypted in PlatformDriveConnection. The daily cron and "Check now" run
// runInboxCheck within a time budget; whatever's left waits for the next run.
import crypto from "node:crypto";
import { Types } from "mongoose";
import { absoluteUrl } from "@/lib/seo";
import { decryptSensitiveData, encryptSensitiveData } from "@/lib/encryption";
import { DriveError, FOLDER_MIME, isPdf, listPdfs, listSharedWithMe, type DriveFile } from "@/lib/drive/api";
import { importDriveFile } from "@/lib/drive/importFile";
import { getDriveImportModel } from "@/lib/models/driveImportModel";
import {
  getPlatformDriveConnectionModel,
  type InboxCheckSummary,
  type IPlatformDriveConnection,
} from "@/lib/models/platformDriveConnectionModel";

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/drive.readonly"];
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// Tests point these at a fake
const tokenUrl = () => process.env.DRIVE_OAUTH_TOKEN_URL?.trim() || "https://oauth2.googleapis.com/token";
const revokeUrl = () => process.env.DRIVE_OAUTH_REVOKE_URL?.trim() || "https://oauth2.googleapis.com/revoke";
/** A file that failed this many times isn't tried again. */
const MAX_FAILURES = 3;

export const STATE_COOKIE = "ua_drive_inbox_state";
export const REDIRECT_PATH = "/api/admin/drive-inbox/callback";

export class InboxError extends Error {}

function clientConfig() {
  const clientId = process.env.DRIVE_INBOX_CLIENT_ID?.trim();
  const clientSecret = process.env.DRIVE_INBOX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new InboxError("The Drive inbox isn't set up (DRIVE_INBOX_CLIENT_ID and _SECRET).");
  return { clientId, clientSecret };
}

/** The address the inbox must be connected with, if one is set. */
export const expectedInboxEmail = () => process.env.PLATFORM_DRIVE_EMAIL?.trim().toLowerCase() || null;

/** Where to send the admin to connect the account, and the state to check on return. */
export function inboxAuthUrl(): { url: string; state: string } {
  const { clientId } = clientConfig();
  const state = crypto.randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: absoluteUrl(REDIRECT_PATH),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Always ask, so Google always returns a refresh token
    prompt: "consent",
    state,
    ...(expectedInboxEmail() && { login_hint: expectedInboxEmail()! }),
  });
  return { url: `${AUTH_URL}?${params}`, state };
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
    error?: string;
  };
  return { ok: res.ok, data };
}

/** The email in an id_token from Google's token endpoint (received directly over TLS). */
function idTokenEmail(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as {
      email?: string;
      email_verified?: boolean;
    };
    return payload.email && payload.email_verified !== false ? payload.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Finishes connecting: trades the code for tokens and stores the connection. */
export async function connectInbox(code: string, by: { userId: string; upid: string }): Promise<string> {
  const { clientId, clientSecret } = clientConfig();
  const { ok, data } = await tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: absoluteUrl(REDIRECT_PATH),
    grant_type: "authorization_code",
  });
  if (!ok || !data.access_token) throw new InboxError("Google didn't accept the sign-in. Try connecting again.");
  if (!data.refresh_token) throw new InboxError("Google didn't give lasting access. Remove UniArchive from the account's third-party access and connect again.");
  if (!data.scope?.split(" ").includes("https://www.googleapis.com/auth/drive.readonly")) {
    throw new InboxError("Drive access wasn't allowed. Connect again and tick the Google Drive permission.");
  }
  const email = idTokenEmail(data.id_token);
  if (!email) throw new InboxError("Couldn't read which Google account this is. Try again.");
  const expected = expectedInboxEmail();
  if (expected && email !== expected) {
    throw new InboxError(`That's ${email}. Connect the UniArchive account (${expected}).`);
  }
  const Connection = await getPlatformDriveConnectionModel();
  await Connection.findOneAndUpdate(
    { key: "inbox" },
    {
      $set: {
        accountEmail: email,
        refreshToken: encryptSensitiveData(data.refresh_token),
        connectedBy: { userId: new Types.ObjectId(by.userId), upid: by.upid },
        connectedAt: new Date(),
        status: "ok",
      },
      $unset: { lastError: 1, lockUntil: 1 },
    },
    { upsert: true },
  );
  return email;
}

/** Disconnects: revokes the token at Google (best effort) and forgets it. */
export async function disconnectInbox(): Promise<void> {
  const Connection = await getPlatformDriveConnectionModel();
  const conn = await Connection.findOne({ key: "inbox" }).lean<IPlatformDriveConnection>();
  if (!conn) return;
  try {
    await fetch(`${revokeUrl()}?token=${encodeURIComponent(decryptSensitiveData(conn.refreshToken))}`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Revoking is a courtesy; the token is forgotten either way
  }
  await Connection.deleteOne({ key: "inbox" });
}

async function accessToken(conn: IPlatformDriveConnection): Promise<string> {
  const { clientId, clientSecret } = clientConfig();
  const { ok, data } = await tokenRequest({
    refresh_token: decryptSensitiveData(conn.refreshToken),
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  if (ok && data.access_token) return data.access_token;
  throw new InboxError(
    data.error === "invalid_grant"
      ? "Google withdrew access (the password changed or access was removed). Connect the account again."
      : "Couldn't get access from Google. The next check will try again.",
  );
}

type Candidate = { file: DriveFile; sharedBy?: { name?: string; email?: string } };

/** Every PDF shared with the account, directly or inside shared folders. */
async function listInbox(auth: { accessToken: string }): Promise<Candidate[]> {
  const shared = await listSharedWithMe(auth);
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const item of shared) {
    const sharedBy = item.sharingUser
      ? { name: item.sharingUser.displayName, email: item.sharingUser.emailAddress }
      : undefined;
    if (item.mimeType === FOLDER_MIME) {
      const listing = await listPdfs(item.id, auth, { resourceKey: item.resourceKey });
      for (const f of listing.files) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        out.push({ file: f, sharedBy });
      }
    } else if (isPdf(item) && !seen.has(item.id)) {
      seen.add(item.id);
      out.push({ file: item, sharedBy });
    }
  }
  return out;
}

/** Drops files already imported (same md5), or that failed too often. */
async function notYetImported(candidates: Candidate[]): Promise<Candidate[]> {
  if (candidates.length === 0) return [];
  const DriveImport = await getDriveImportModel();
  const rows = await DriveImport.find({ owner: "platform", driveFileId: { $in: candidates.map((c) => c.file.id) } })
    .select("driveFileId md5 status")
    .lean<{ driveFileId: string; md5?: string; status: string }[]>();
  return candidates.filter(({ file }) => {
    const mine = rows.filter((r) => r.driveFileId === file.id);
    const done = mine.some((r) => r.status !== "failed" && (!file.md5Checksum || !r.md5 || r.md5 === file.md5Checksum));
    return !done && mine.filter((r) => r.status === "failed").length < MAX_FAILURES;
  });
}

export type InboxRunResult =
  | { status: "not_connected" }
  | { status: "busy" }
  | { status: "done"; summary: InboxCheckSummary };

/**
 * Imports new PDFs shared with the inbox account, until `budgetMs` runs
 * out. One run at a time (a lease on the connection).
 */
export async function runInboxCheck(budgetMs: number): Promise<InboxRunResult> {
  const started = Date.now();
  const Connection = await getPlatformDriveConnectionModel();
  const conn = await Connection.findOneAndUpdate(
    { key: "inbox", $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lt: new Date() } }] },
    { $set: { lockUntil: new Date(started + budgetMs + 60_000) } },
    { returnDocument: "after" },
  ).lean<IPlatformDriveConnection>();
  if (!conn) {
    return (await Connection.exists({ key: "inbox" })) ? { status: "busy" } : { status: "not_connected" };
  }

  const summary: InboxCheckSummary = { at: new Date(), found: 0, imported: 0, duplicate: 0, failed: 0, remaining: 0 };
  let broken = false;
  try {
    const token = await accessToken(conn).catch((error) => {
      broken = error instanceof InboxError && /withdrew/.test(error.message);
      throw error;
    });
    const auth = { accessToken: token };
    const todo = await notYetImported(await listInbox(auth));
    summary.found = todo.length;
    const uploader = { userId: String(conn.connectedBy.userId), upid: conn.connectedBy.upid };
    for (const [i, c] of todo.entries()) {
      if (Date.now() - started > budgetMs) {
        summary.remaining = todo.length - i;
        break;
      }
      const result = await importDriveFile(
        { kind: "platform", uploader, source: "drive_inbox", sharedBy: c.sharedBy },
        { fileId: c.file.id, resourceKey: c.file.resourceKey },
        auth,
        "inbox",
        { known: c.file },
      );
      summary[result.status]++;
    }
  } catch (error) {
    summary.error =
      error instanceof InboxError || error instanceof DriveError ? error.message : "The check failed. It will try again.";
    if (!(error instanceof InboxError || error instanceof DriveError)) console.error("[drive-inbox] check failed:", error);
  }
  await Connection.updateOne(
    { key: "inbox" },
    {
      $set: { lastCheck: summary, ...(broken ? { status: "broken", lastError: summary.error } : summary.error ? {} : { status: "ok" }) },
      $unset: { lockUntil: 1, ...(summary.error ? {} : { lastError: 1 }) },
    },
  );
  if (summary.imported) console.info(`[drive-inbox] imported ${summary.imported} PDF(s); ${summary.remaining} left for next run`);
  return { status: "done", summary };
}
