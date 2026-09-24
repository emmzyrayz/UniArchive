// src/utils/uploadQueue.ts
// Background sync queue for uploads — uses IndexedDB to persist pending uploads
// across sessions. processQueue() uploads them once the app is back online:
// on opening the library, on the "online" event, and when the service worker's
// 'sync' event (public/sw-sync.js) asks open pages to.
import { uploadBook, UploadError } from "@/utils/uploadBook";

const DB_NAME = "uniarchive-upload-queue";
const STORE_NAME = "pending-uploads";
const DB_VERSION = 1;

export interface PendingUpload {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  queuedAt: string;
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueUpload(upload: PendingUpload): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(upload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Request a background sync if the API is available
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      // Background Sync isn't in the TypeScript DOM lib yet.
      await (
        reg as ServiceWorkerRegistration & {
          sync: { register(tag: string): Promise<void> };
        }
      ).sync.register("upload-sync");
    } catch {
      // Sync not supported — upload will be retried on next app open
    }
  }
}

export async function getPendingUploads(): Promise<PendingUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeUpload(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * The server rejected the upload itself (bad file, too large), so retrying
 * can't help. Auth errors, server errors and network failures stay queued.
 */
function isPermanentFailure(error: unknown): boolean {
  return (
    error instanceof UploadError &&
    (error.status === 400 || error.status === 413 || error.status === 415)
  );
}

let running: Promise<{ processed: number; failed: number }> | null = null;

async function runQueue(): Promise<{ processed: number; failed: number }> {
  const pending = await getPendingUploads();
  let processed = 0;
  let failed = 0;

  // One at a time: uploads are large and the connection may have just returned
  for (const upload of pending) {
    try {
      const file = new File([upload.fileData], upload.fileName, {
        type: upload.fileType,
      });
      await uploadBook(file, upload, () => {});
      await removeUpload(upload.id);
      processed++;
    } catch (error) {
      console.error(`Failed to process queued upload ${upload.id}:`, error);
      failed++;
      if (isPermanentFailure(error)) await removeUpload(upload.id);
    }
  }

  return { processed, failed };
}

/**
 * Uploads everything in the queue. Safe to call often: calls made while a
 * run is in progress share it, and other tabs wait their turn (Web Locks,
 * where supported) so no upload is sent twice.
 */
export function processQueue(): Promise<{ processed: number; failed: number }> {
  if (running) return running;
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  const run: Promise<{ processed: number; failed: number }> = locks
    ? // The lock resolves with the callback's own promise; the DOM typings
      // don't unwrap it
      (locks.request("uniarchive-upload-queue", runQueue) as unknown as Promise<{
        processed: number;
        failed: number;
      }>)
    : runQueue();
  running = run.finally(() => {
    running = null;
  });
  return running;
}
