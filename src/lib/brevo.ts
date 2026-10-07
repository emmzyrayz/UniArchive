// src/lib/brevo.ts
// Minimal Brevo API client for bulk email (broadcasts). Transactional email
// stays on ZeptoMail (lib/mailConfig.ts): ZeptoMail's terms forbid bulk mail.
//
//   BREVO_API_KEY    the API key (server only)
//   BREVO_API_URL    optional, defaults to https://api.brevo.com/v3 (tests
//                    point it at a local fake)
const DEFAULT_URL = "https://api.brevo.com/v3";
const TIMEOUT_MS = 15_000;

export class BrevoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BrevoError";
  }
}

export function brevoConfigured(): boolean {
  return !!process.env.BREVO_API_KEY?.trim();
}

/** One Brevo API call; throws BrevoError with Brevo's message on failure. */
export async function brevoRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) throw new BrevoError("BREVO_API_KEY is not set", 503);
  const base = (process.env.BREVO_API_URL?.trim() || DEFAULT_URL).replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "api-key": key,
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    if (res.ok) throw new BrevoError(`Brevo ${method} ${path}: response wasn't JSON`, 502);
  }
  if (!res.ok) {
    const message = (data as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new BrevoError(`Brevo ${method} ${path}: ${message}`, res.status);
  }
  return data as T;
}

/** Lifts Brevo's block on an address (the user opted back in). */
export async function unblockBrevoContact(email: string): Promise<void> {
  try {
    await brevoRequest("PUT", `/contacts/${encodeURIComponent(email)}`, { emailBlacklisted: false });
  } catch (error) {
    // Not a Brevo contact yet: nothing is blocked
    if (error instanceof BrevoError && error.status === 404) return;
    throw error;
  }
}

// --- Broadcast building blocks (lib/broadcast/send.ts) ------------------------

/** The contact attributes broadcasts fill in (FIRSTNAME/LASTNAME are built in). */
export const BROADCAST_ATTRIBUTES = ["UPID", "SCHOOL", "LEVEL", "ROLE", "PREFS_URL"] as const;

let attributesReady = false;

/** Creates any missing custom attributes (text), once per server process. */
export async function ensureContactAttributes(): Promise<void> {
  if (attributesReady) return;
  const { attributes = [] } = await brevoRequest<{ attributes?: { name: string; category: string }[] }>(
    "GET",
    "/contacts/attributes",
  );
  const existing = new Set(attributes.filter((a) => a.category === "normal").map((a) => a.name.toUpperCase()));
  for (const name of BROADCAST_ATTRIBUTES) {
    if (existing.has(name)) continue;
    try {
      await brevoRequest("POST", `/contacts/attributes/normal/${name}`, { type: "text" });
    } catch (error) {
      // Created meanwhile (another send): fine
      if (!(error instanceof BrevoError && error.status === 400 && /exist/i.test(error.message))) throw error;
    }
  }
  attributesReady = true;
}

const FOLDER_NAME = "UniArchive broadcasts";

/** The contact folder broadcast lists live in, or null if there isn't one yet. */
export async function findBroadcastFolderId(): Promise<number | null> {
  const { folders = [] } = await brevoRequest<{ folders?: { id: number; name: string }[] }>(
    "GET",
    "/contacts/folders?limit=50&offset=0",
  );
  return folders.find((f) => f.name === FOLDER_NAME)?.id ?? null;
}

/** The contact folder broadcast lists live in (created on first use). */
export async function broadcastFolderId(): Promise<number> {
  const found = await findBroadcastFolderId();
  if (found !== null) return found;
  const { id } = await brevoRequest<{ id: number }>("POST", "/contacts/folders", { name: FOLDER_NAME });
  return id;
}

/** Every list in a folder (Brevo pages them 50 at a time). */
export async function folderLists(folderId: number): Promise<{ id: number; name: string }[]> {
  const all: { id: number; name: string }[] = [];
  for (let offset = 0; ; offset += 50) {
    const { lists = [], count = 0 } = await brevoRequest<{ lists?: { id: number; name: string }[]; count?: number }>(
      "GET",
      `/contacts/folders/${folderId}/lists?limit=50&offset=${offset}`,
    );
    all.push(...lists.map((l) => ({ id: l.id, name: l.name })));
    if (lists.length < 50 || all.length >= count) return all;
  }
}

/** Deletes a contact list (its contacts stay in Brevo). Gone already is fine. */
export async function deleteContactList(listId: number): Promise<void> {
  try {
    await brevoRequest("DELETE", `/contacts/lists/${listId}`);
  } catch (error) {
    if (error instanceof BrevoError && error.status === 404) return;
    throw error;
  }
}

export async function createContactList(name: string, folderId: number): Promise<number> {
  const { id } = await brevoRequest<{ id: number }>("POST", "/contacts/lists", { name, folderId });
  return id;
}

export interface BrevoContact {
  email: string;
  attributes: Record<string, string>;
}

/** Starts an import of contacts into a list; returns the process id. */
export async function importContacts(listId: number, contacts: BrevoContact[]): Promise<number> {
  const { processId } = await brevoRequest<{ processId: number }>("POST", "/contacts/import", {
    jsonBody: contacts,
    listIds: [listId],
    updateExistingContacts: true,
    // Keep attributes we don't send rather than blanking them
    emptyContactsAttributes: false,
  });
  return processId;
}

/** Waits for a background process (an import) to finish. */
export async function waitForProcess(processId: number, timeoutMs: number): Promise<"completed" | "timeout"> {
  const deadline = Date.now() + timeoutMs;
  let delay = 1000;
  while (Date.now() < deadline) {
    const { status } = await brevoRequest<{ status: string }>("GET", `/processes/${processId}`);
    if (status === "completed") return "completed";
    if (status === "failed" || status === "cancelled") {
      throw new BrevoError(`Brevo contact import ${status}`, 502);
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 4000);
  }
  return "timeout";
}

export async function createEmailCampaign(campaign: {
  name: string;
  subject: string;
  sender: { name: string; email: string };
  replyTo: string;
  htmlContent: string;
  listId: number;
  scheduledAt?: Date;
}): Promise<number> {
  const { id } = await brevoRequest<{ id: number }>("POST", "/emailCampaigns", {
    name: campaign.name,
    subject: campaign.subject,
    sender: campaign.sender,
    replyTo: campaign.replyTo,
    htmlContent: campaign.htmlContent,
    recipients: { listIds: [campaign.listId] },
    ...(campaign.scheduledAt && { scheduledAt: campaign.scheduledAt.toISOString() }),
  });
  return id;
}

export async function sendCampaignNow(campaignId: number): Promise<void> {
  await brevoRequest("POST", `/emailCampaigns/${campaignId}/sendNow`);
}

/** Stops a scheduled campaign (Brevo won't delete a scheduled one). */
export async function cancelCampaign(campaignId: number): Promise<void> {
  await brevoRequest("PUT", `/emailCampaigns/${campaignId}/status`, { status: "cancel" });
}

export interface BrevoCampaignStatus {
  status: string;
  scheduledAt?: string;
  sentDate?: string;
  stats: { delivered: number; opened: number; clicked: number; unsubscribed: number; bounced: number };
}

export async function getCampaignStats(campaignId: number): Promise<BrevoCampaignStatus> {
  const data = await brevoRequest<{
    status: string;
    scheduledAt?: string;
    sentDate?: string;
    statistics?: {
      globalStats?: Partial<
        Record<"delivered" | "uniqueViews" | "uniqueClicks" | "unsubscriptions" | "hardBounces" | "softBounces", number>
      >;
    };
  }>("GET", `/emailCampaigns/${campaignId}?statistics=globalStats`);
  const g = data.statistics?.globalStats ?? {};
  return {
    status: data.status,
    ...(data.scheduledAt && { scheduledAt: data.scheduledAt }),
    ...(data.sentDate && { sentDate: data.sentDate }),
    stats: {
      delivered: g.delivered ?? 0,
      opened: g.uniqueViews ?? 0,
      clicked: g.uniqueClicks ?? 0,
      unsubscribed: g.unsubscriptions ?? 0,
      bounced: (g.hardBounces ?? 0) + (g.softBounces ?? 0),
    },
  };
}

/** Removes a contact from Brevo entirely (account deletion). */
export async function deleteBrevoContact(email: string): Promise<void> {
  try {
    await brevoRequest("DELETE", `/contacts/${encodeURIComponent(email)}`);
  } catch (error) {
    // Never was a contact (no broadcast reached them): nothing to remove
    if (error instanceof BrevoError && error.status === 404) return;
    throw error;
  }
}
