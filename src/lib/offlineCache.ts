// src/lib/offlineCache.ts
// Encrypted IndexedDB cache for offline reading: page images of Cloudinary
// books (any browser), and whole PDFs saved by browsers that run pdf.js
// themselves (savePdfOffline: large Backblaze PDFs, no server rendering).
//
// Pages are encrypted with AES-GCM (random 12-byte IV per page) under one
// non-extractable key generated in this browser and kept in its own database.
// The raw key bytes can never be read back by script, so the stored pages are
// only readable through this module. If the key is lost (site data cleared),
// a new one is generated and old pages simply fail to decrypt: they are
// dropped and the user saves the book offline again.

const PAGES_DB = "uniarchive-offline";
const PAGES_DB_VERSION = 2; // 2: whole PDFs
const PAGES_STORE = "page-images";
const PDF_CHUNKS_STORE = "pdf-chunks";
const PDF_META_STORE = "pdf-meta";
/** PDFs are encrypted and stored in pieces this big */
const PDF_CHUNK_BYTES = 4 * 1024 * 1024;
const KEYS_DB = "uniarchive-crypto";
const KEYS_STORE = "keys";
const KEY_ID = "offline-key";

interface PageRecord {
  key: string; // `${bookId}:${pageNumber}`
  bookId: string;
  pageNumber: number;
  totalPages: number;
  /** Lets the offline fallback show the book without the server. */
  title?: string;
  mimeType: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  cachedAt: number;
}

interface PdfChunkRecord {
  key: string; // `${bookId}:${index}`
  bookId: string;
  index: number;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}

interface PdfMetaRecord {
  bookId: string;
  title?: string;
  size: number;
  chunks: number;
  /** false while saving; only complete copies are read */
  complete: boolean;
  savedAt: number;
}

function openDB(
  name: string,
  upgrade: (db: IDBDatabase) => void,
  version = 1,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => {
      // Let a newer version (another tab after a deploy) upgrade the database
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

const openPagesDB = () =>
  openDB(
    PAGES_DB,
    (db) => {
      if (!db.objectStoreNames.contains(PAGES_STORE)) {
        const store = db.createObjectStore(PAGES_STORE, { keyPath: "key" });
        store.createIndex("bookId", "bookId", { unique: false });
      }
      if (!db.objectStoreNames.contains(PDF_CHUNKS_STORE)) {
        const store = db.createObjectStore(PDF_CHUNKS_STORE, { keyPath: "key" });
        store.createIndex("bookId", "bookId", { unique: false });
      }
      if (!db.objectStoreNames.contains(PDF_META_STORE)) {
        db.createObjectStore(PDF_META_STORE, { keyPath: "bookId" });
      }
    },
    PAGES_DB_VERSION,
  );

const openKeysDB = () =>
  openDB(KEYS_DB, (db) => {
    if (!db.objectStoreNames.contains(KEYS_STORE)) {
      db.createObjectStore(KEYS_STORE);
    }
  });

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let keyPromise: Promise<CryptoKey> | null = null;

/** The browser's offline key, generated and stored on first use. */
function getKey(): Promise<CryptoKey> {
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    const db = await openKeysDB();
    const existing = await request<CryptoKey | undefined>(
      db.transaction(KEYS_STORE, "readonly").objectStore(KEYS_STORE).get(KEY_ID),
    );
    if (existing) return existing;

    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false, // non-extractable
      ["encrypt", "decrypt"],
    );
    await request(
      db.transaction(KEYS_STORE, "readwrite").objectStore(KEYS_STORE).put(key, KEY_ID),
    );
    return key;
  })().catch((error) => {
    keyPromise = null; // let the next call retry
    throw error;
  });
  return keyPromise;
}

async function getBookRecords(bookId: string): Promise<PageRecord[]> {
  const db = await openPagesDB();
  return request<PageRecord[]>(
    db
      .transaction(PAGES_STORE, "readonly")
      .objectStore(PAGES_STORE)
      .index("bookId")
      .getAll(bookId),
  );
}

/** Encrypts and stores one page image. Failures are logged, never thrown. */
export async function cachePageImage(
  bookId: string,
  pageNumber: number,
  totalPages: number,
  image: Blob,
  title?: string,
): Promise<void> {
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      await image.arrayBuffer(),
    );
    const record: PageRecord = {
      key: `${bookId}:${pageNumber}`,
      bookId,
      pageNumber,
      totalPages,
      title,
      mimeType: image.type || "image/jpeg",
      iv,
      ciphertext,
      cachedAt: Date.now(),
    };
    const db = await openPagesDB();
    await request(
      db.transaction(PAGES_STORE, "readwrite").objectStore(PAGES_STORE).put(record),
    );
  } catch (error) {
    console.warn("Failed to cache page:", error);
  }
}

/**
 * A decrypted cached page as an image Blob, or null when it isn't cached.
 * A page that no longer decrypts (the key was regenerated) is removed.
 */
export async function getCachedPageImage(
  bookId: string,
  pageNumber: number,
): Promise<Blob | null> {
  let db: IDBDatabase;
  let record: PageRecord | undefined;
  try {
    db = await openPagesDB();
    record = await request<PageRecord | undefined>(
      db
        .transaction(PAGES_STORE, "readonly")
        .objectStore(PAGES_STORE)
        .get(`${bookId}:${pageNumber}`),
    );
  } catch {
    return null;
  }
  if (!record) return null;

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: record.iv as Uint8Array<ArrayBuffer> },
      await getKey(),
      record.ciphertext,
    );
    return new Blob([plain], { type: record.mimeType });
  } catch {
    try {
      await request(
        db
          .transaction(PAGES_STORE, "readwrite")
          .objectStore(PAGES_STORE)
          .delete(record.key),
      );
    } catch {
      // stale page stays; it'll be overwritten on the next save
    }
    return null;
  }
}

export interface CachedBookInfo {
  cached: number;
  total: number;
  title?: string;
}

/** How many pages of a book are cached, how many it has, and its title. */
export async function getCachedPageCount(bookId: string): Promise<CachedBookInfo> {
  try {
    const records = await getBookRecords(bookId);
    return {
      cached: records.length,
      total: records[0]?.totalPages ?? 0,
      title: records.find((r) => r.title)?.title,
    };
  } catch {
    return { cached: 0, total: 0 };
  }
}

/** Whether every page of a book is cached. */
export async function isBookCached(bookId: string): Promise<boolean> {
  const { cached, total } = await getCachedPageCount(bookId);
  return total > 0 && cached >= total;
}

/** Removes a book's offline copy: its page images and its saved PDF. */
export async function removeCachedBook(bookId: string): Promise<void> {
  try {
    const db = await openPagesDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([PAGES_STORE, PDF_CHUNKS_STORE, PDF_META_STORE], "readwrite");
      for (const name of [PAGES_STORE, PDF_CHUNKS_STORE]) {
        const store = tx.objectStore(name);
        // Delete inside the callback so the transaction is still active
        const req = store.index("bookId").getAllKeys(bookId);
        req.onsuccess = () => req.result.forEach((key) => store.delete(key));
      }
      tx.objectStore(PDF_META_STORE).delete(bookId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn("Failed to remove cached book:", error);
  }
}

// --- Whole PDFs ------------------------------------------------------------------

/** A save that failed, with a message for the reader. */
export class OfflineSaveError extends Error {}

export interface SavedPdfInfo {
  title?: string;
  size: number;
  savedAt: number;
}

/** A completely saved PDF's details, or null. */
export async function getSavedPdfInfo(bookId: string): Promise<SavedPdfInfo | null> {
  try {
    const db = await openPagesDB();
    const meta = await request<PdfMetaRecord | undefined>(
      db.transaction(PDF_META_STORE, "readonly").objectStore(PDF_META_STORE).get(bookId),
    );
    return meta?.complete ? { title: meta.title, size: meta.size, savedAt: meta.savedAt } : null;
  } catch {
    return null;
  }
}

/**
 * Downloads `url` and stores it encrypted, chunk by chunk, so a large PDF
 * never sits whole in memory while saving. Throws OfflineSaveError with a
 * message for the reader; a failed or cancelled save leaves nothing behind.
 */
export async function savePdfOffline(
  bookId: string,
  url: string,
  options: {
    title?: string;
    expectedSize?: number;
    onProgress?: (saved: number, total: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<void> {
  if (navigator.storage?.estimate && options.expectedSize) {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota !== undefined && usage !== undefined && quota - usage < options.expectedSize * 1.1) {
      throw new OfflineSaveError("There isn't enough free space on this device to save it.");
    }
  }
  // Ask the browser not to clear saved books when space runs low
  await navigator.storage?.persist?.().catch(() => false);

  let res: Response;
  try {
    res = await fetch(url, { signal: options.signal });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") throw error;
    throw new OfflineSaveError("Couldn't download it. Check your connection and try again.");
  }
  if (!res.ok || !res.body) throw new OfflineSaveError(`Couldn't download it (HTTP ${res.status}).`);
  const total = Number(res.headers.get("content-length")) || options.expectedSize || 0;

  const key = await getKey();
  const db = await openPagesDB();
  const put = (store: string, value: unknown) =>
    request(db.transaction(store, "readwrite").objectStore(store).put(value));

  let saved = 0;
  let index = 0;
  let pending: Uint8Array[] = [];
  let pendingBytes = 0;
  const flush = async () => {
    if (pendingBytes === 0) return;
    const plain = new Uint8Array(pendingBytes);
    let offset = 0;
    for (const part of pending) {
      plain.set(part, offset);
      offset += part.length;
    }
    pending = [];
    pendingBytes = 0;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
    const record: PdfChunkRecord = { key: `${bookId}:${index}`, bookId, index, iv, ciphertext };
    await put(PDF_CHUNKS_STORE, record);
    index += 1;
  };

  try {
    const meta: PdfMetaRecord = { bookId, title: options.title, size: total, chunks: 0, complete: false, savedAt: Date.now() };
    await put(PDF_META_STORE, meta);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      pending.push(value);
      pendingBytes += value.length;
      saved += value.length;
      options.onProgress?.(saved, total);
      if (pendingBytes >= PDF_CHUNK_BYTES) await flush();
    }
    await flush();
    await put(PDF_META_STORE, { ...meta, size: saved, chunks: index, complete: true, savedAt: Date.now() });
  } catch (error) {
    await removeCachedBook(bookId);
    const name = (error as { name?: string }).name;
    if (name === "AbortError") throw error;
    throw new OfflineSaveError(
      name === "QuotaExceededError"
        ? "This device ran out of space while saving it."
        : "Saving stopped part-way. Check your connection and try again.",
    );
  }
}

/**
 * The saved PDF, decrypted, or null when it isn't saved. A copy that no
 * longer decrypts (site data cleared, so a new key) or is missing pieces
 * is removed.
 */
export async function getSavedPdf(bookId: string): Promise<Blob | null> {
  try {
    const db = await openPagesDB();
    const meta = await request<PdfMetaRecord | undefined>(
      db.transaction(PDF_META_STORE, "readonly").objectStore(PDF_META_STORE).get(bookId),
    );
    if (!meta?.complete) return null;
    const records = await request<PdfChunkRecord[]>(
      db.transaction(PDF_CHUNKS_STORE, "readonly").objectStore(PDF_CHUNKS_STORE).index("bookId").getAll(bookId),
    );
    if (records.length !== meta.chunks) throw new Error("incomplete");
    records.sort((a, b) => a.index - b.index);
    const key = await getKey();
    const parts: ArrayBuffer[] = [];
    for (const r of records) {
      parts.push(await crypto.subtle.decrypt({ name: "AES-GCM", iv: r.iv as Uint8Array<ArrayBuffer> }, key, r.ciphertext));
    }
    return new Blob(parts, { type: "application/pdf" });
  } catch {
    await removeCachedBook(bookId);
    return null;
  }
}
