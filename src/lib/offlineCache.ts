// src/lib/offlineCache.ts
// Encrypted IndexedDB cache of Cloudinary page images, for offline reading.
//
// Pages are encrypted with AES-GCM (random 12-byte IV per page) under one
// non-extractable key generated in this browser and kept in its own database.
// The raw key bytes can never be read back by script, so the stored pages are
// only readable through this module. If the key is lost (site data cleared),
// a new one is generated and old pages simply fail to decrypt: they are
// dropped and the user saves the book offline again.

const PAGES_DB = "uniarchive-offline";
const PAGES_STORE = "page-images";
const KEYS_DB = "uniarchive-crypto";
const KEYS_STORE = "keys";
const KEY_ID = "offline-key";

interface PageRecord {
  key: string; // `${bookId}:${pageNumber}`
  bookId: string;
  pageNumber: number;
  totalPages: number;
  mimeType: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  cachedAt: number;
}

function openDB(
  name: string,
  upgrade: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const openPagesDB = () =>
  openDB(PAGES_DB, (db) => {
    if (!db.objectStoreNames.contains(PAGES_STORE)) {
      const store = db.createObjectStore(PAGES_STORE, { keyPath: "key" });
      store.createIndex("bookId", "bookId", { unique: false });
    }
  });

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

/** How many pages of a book are cached, and how many it has. */
export async function getCachedPageCount(
  bookId: string,
): Promise<{ cached: number; total: number }> {
  try {
    const records = await getBookRecords(bookId);
    return {
      cached: records.length,
      total: records[0]?.totalPages ?? 0,
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

/** Removes every cached page of a book. */
export async function removeCachedBook(bookId: string): Promise<void> {
  try {
    const db = await openPagesDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PAGES_STORE, "readwrite");
      const store = tx.objectStore(PAGES_STORE);
      // Delete inside the callback so the transaction is still active
      const req = store.index("bookId").getAllKeys(bookId);
      req.onsuccess = () => req.result.forEach((key) => store.delete(key));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn("Failed to remove cached book:", error);
  }
}
