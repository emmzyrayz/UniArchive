// src/lib/drive/urls.ts
// Turns what people paste (a Drive share link, or just an id) into the
// Drive id to import. Pure and client-safe: the import dialog checks links
// before sending them, and the API checks them again.

export interface DriveRef {
  /** "any" when the link doesn't say (open?id=, a bare id): the API decides. */
  kind: "folder" | "file" | "any";
  id: string;
  /** Older link-shared files need it to be opened (Drive "resource key"). */
  resourceKey?: string;
}

const ID = /^[A-Za-z0-9_-]{10,100}$/;
const HOSTS = new Set(["drive.google.com", "docs.google.com"]);

/** The Drive file or folder a link points at, or null when it isn't one. */
export function parseDriveUrl(input: string): DriveRef | null {
  const text = input.trim();
  if (ID.test(text)) return { kind: "any", id: text };

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  const resourceKey = url.searchParams.get("resourcekey") ?? undefined;
  const withKey = (ref: DriveRef): DriveRef => (resourceKey ? { ...ref, resourceKey } : ref);
  const path = url.pathname;

  // /drive/folders/<id>, /drive/u/0/folders/<id>, /drive/mobile/folders/<id>
  const folder = /\/folders\/([A-Za-z0-9_-]+)/.exec(path);
  if (folder && ID.test(folder[1])) return withKey({ kind: "folder", id: folder[1] });

  // /file/d/<id>/view, /file/u/0/d/<id>, docs.google.com/file/d/<id>
  const file = /\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/.exec(path);
  if (file && ID.test(file[1])) return withKey({ kind: "file", id: file[1] });

  // /open?id=<id>, /uc?id=<id>&export=download
  const id = url.searchParams.get("id");
  if (id && ID.test(id)) {
    return withKey({ kind: path.startsWith("/uc") ? "file" : "any", id });
  }
  return null;
}
