// src/lib/drive/api.ts
// A small Google Drive v3 client over fetch (no googleapis dependency).
// Two kinds of access:
//  - { apiKey }: files shared "Anyone with the link" (public link import)
//  - { accessToken }: a person's own token (the Picker, drive.file) or the
//    platform inbox's (drive.readonly)
// DRIVE_API_URL points tests at a fake server (like BREVO_API_URL).

export type DriveAuth = { apiKey: string } | { accessToken: string };

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  /** Bytes; Drive leaves it out for Google Docs and folders. */
  size?: number;
  md5Checksum?: string;
  resourceKey?: string;
  /** Who shared it with the account (inbox listings) */
  sharingUser?: { displayName?: string; emailAddress?: string };
}

/** A Drive error with a message people can act on. */
export class DriveError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: string,
  ) {
    super(message);
    this.name = "DriveError";
  }
}

export const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
const FILE_FIELDS = "id,name,mimeType,size,md5Checksum,resourceKey,shortcutDetails,sharingUser(displayName,emailAddress)";
const TIMEOUT_MS = 20_000;

const base = () => (process.env.DRIVE_API_URL?.trim() || "https://www.googleapis.com/drive/v3").replace(/\/$/, "");

export const isPdf = (f: Pick<DriveFile, "mimeType" | "name">) =>
  f.mimeType === "application/pdf" || (f.mimeType === "application/octet-stream" && /\.pdf$/i.test(f.name));

interface RawFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  md5Checksum?: string;
  resourceKey?: string;
  shortcutDetails?: { targetId: string; targetMimeType: string; targetResourceKey?: string };
  sharingUser?: { displayName?: string; emailAddress?: string };
}

const toFile = (r: RawFile): DriveFile => ({
  id: r.id,
  name: r.name,
  mimeType: r.mimeType,
  ...(r.size !== undefined && { size: Number(r.size) }),
  ...(r.md5Checksum && { md5Checksum: r.md5Checksum }),
  ...(r.resourceKey && { resourceKey: r.resourceKey }),
  ...(r.sharingUser && { sharingUser: r.sharingUser }),
});

async function request(
  path: string,
  auth: DriveAuth,
  params: Record<string, string>,
  resourceKeys: { id: string; key?: string }[] = [],
  timeoutMs = TIMEOUT_MS,
): Promise<Response> {
  const query = new URLSearchParams({ supportsAllDrives: "true", ...params });
  if ("apiKey" in auth) query.set("key", auth.apiKey);
  const headers: Record<string, string> = {};
  if ("accessToken" in auth) headers.Authorization = `Bearer ${auth.accessToken}`;
  const keys = resourceKeys.filter((k) => k.key).map((k) => `${k.id}/${k.key}`);
  if (keys.length) headers["X-Goog-Drive-Resource-Keys"] = keys.join(",");

  let res: Response;
  try {
    res = await fetch(`${base()}${path}?${query}`, { headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new DriveError("Couldn't reach Google Drive. Try again in a moment.", 502);
  }
  if (res.ok) return res;

  const body = (await res.json().catch(() => null)) as { error?: { errors?: { reason?: string }[]; message?: string } } | null;
  const reason = body?.error?.errors?.[0]?.reason;
  if (res.status === 404) {
    throw new DriveError(
      "Google Drive says this doesn't exist or isn't shared. Check the link, and that it's shared as \"Anyone with the link\".",
      404,
      reason,
    );
  }
  if (res.status === 401) throw new DriveError("Google sign-in expired. Connect Google Drive again.", 401, reason);
  if (reason === "cannotDownloadAbusiveFile") {
    throw new DriveError("Google flagged this file as possibly harmful, so it can't be imported.", 403, reason);
  }
  if (res.status === 403 && /rate|quota|limit/i.test(reason ?? "")) {
    throw new DriveError("Google Drive is busy right now. Try again in a few minutes.", 429, reason);
  }
  if (res.status === 403) {
    throw new DriveError("Google Drive won't let us open this. Ask the owner to share it as \"Anyone with the link\".", 403, reason);
  }
  throw new DriveError(`Google Drive error (HTTP ${res.status}).`, 502, reason);
}

/** One file's or folder's details (shortcuts resolved to their target). */
export async function getMeta(id: string, auth: DriveAuth, resourceKey?: string): Promise<DriveFile> {
  const res = await request(`/files/${encodeURIComponent(id)}`, auth, { fields: FILE_FIELDS }, [{ id, key: resourceKey }]);
  const raw = (await res.json()) as RawFile;
  if (raw.mimeType === SHORTCUT_MIME && raw.shortcutDetails) {
    const { targetId, targetResourceKey } = raw.shortcutDetails;
    return getMeta(targetId, auth, targetResourceKey);
  }
  return toFile(raw);
}

/** A folder's direct children (one page of up to 1,000). */
async function listChildren(
  folderId: string,
  auth: DriveAuth,
  resourceKey: string | undefined,
  pageToken?: string,
): Promise<{ files: RawFile[]; nextPageToken?: string }> {
  const res = await request(
    "/files",
    auth,
    {
      q: `'${folderId.replace(/'/g, "")}' in parents and trashed = false`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: "1000",
      includeItemsFromAllDrives: "true",
      ...(pageToken && { pageToken }),
    },
    [{ id: folderId, key: resourceKey }],
  );
  return (await res.json()) as { files: RawFile[]; nextPageToken?: string };
}

export interface FolderListing {
  /** PDFs found, with the folder path they're in ("" for the top folder). */
  files: (DriveFile & { folderPath: string })[];
  /** Stopped at maxFiles or maxDepth: there may be more. */
  truncated: boolean;
}

/** Every PDF in a folder and its subfolders, breadth first. */
export async function listPdfs(
  folderId: string,
  auth: DriveAuth,
  options: { resourceKey?: string; maxDepth?: number; maxFiles?: number } = {},
): Promise<FolderListing> {
  const maxDepth = options.maxDepth ?? 3;
  const maxFiles = options.maxFiles ?? 500;
  const files: FolderListing["files"] = [];
  let truncated = false;
  const queue = [{ id: folderId, key: options.resourceKey, path: "", depth: 0 }];
  const seen = new Set<string>([folderId]);

  while (queue.length) {
    const folder = queue.shift()!;
    let pageToken: string | undefined;
    do {
      const page = await listChildren(folder.id, auth, folder.key, pageToken);
      pageToken = page.nextPageToken;
      for (const raw of page.files ?? []) {
        // A shortcut counts as what it points at
        const target =
          raw.mimeType === SHORTCUT_MIME && raw.shortcutDetails
            ? { ...raw, id: raw.shortcutDetails.targetId, mimeType: raw.shortcutDetails.targetMimeType, resourceKey: raw.shortcutDetails.targetResourceKey }
            : raw;
        if (target.mimeType === FOLDER_MIME) {
          if (seen.has(target.id)) continue;
          seen.add(target.id);
          if (folder.depth + 1 > maxDepth) truncated = true;
          else queue.push({ id: target.id, key: target.resourceKey, path: folder.path ? `${folder.path}/${target.name}` : target.name, depth: folder.depth + 1 });
        } else if (isPdf(target)) {
          if (files.length >= maxFiles) {
            truncated = true;
            return { files, truncated };
          }
          files.push({ ...toFile(target), folderPath: folder.path });
        }
      }
    } while (pageToken);
  }
  return { files, truncated };
}

/**
 * PDFs and folders shared with the signed-in account ("Shared with me"),
 * newest first (the platform inbox). Up to `max` items.
 */
export async function listSharedWithMe(auth: DriveAuth, max = 2000): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = await request("/files", auth, {
      q: `sharedWithMe = true and trashed = false and (mimeType = 'application/pdf' or mimeType = '${FOLDER_MIME}' or mimeType = 'application/octet-stream')`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: "1000",
      orderBy: "sharedWithMeTime desc",
      includeItemsFromAllDrives: "true",
      ...(pageToken && { pageToken }),
    });
    const page = (await res.json()) as { files?: RawFile[]; nextPageToken?: string };
    out.push(...(page.files ?? []).map(toFile));
    pageToken = page.nextPageToken;
  } while (pageToken && out.length < max);
  return out.slice(0, max);
}

/** The file's bytes as a stream (alt=media). Large files take a while. */
export async function download(id: string, auth: DriveAuth, resourceKey?: string): Promise<Response> {
  return request(`/files/${encodeURIComponent(id)}`, auth, { alt: "media" }, [{ id, key: resourceKey }], 10 * 60_000);
}
