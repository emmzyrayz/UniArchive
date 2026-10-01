// src/lib/draftSync.ts
// Autosave for the conversion workspace (browser only). Work is written to
// IndexedDB first (~500ms after typing stops), then synced to the server
// (/api/conversions/drafts) every ~10s, when the page is hidden, when the
// connection comes back, and on "Sync now". So a reload, a crash or a
// dropped connection loses nothing, and the work follows the user to
// other devices.
//
// Each save sends the server revision it builds on. If another device or
// tab saved first, the server refuses (409) and returns its copy; the two
// are merged (mergePayload) and saved again. Question items merge by
// clientItemId; for a note, this device's text wins and the other version
// is offered in the UI.
//
// Only one tab edits a draft at a time (Web Locks). Another tab with the
// same draft shows it read-only, kept current over a BroadcastChannel, and
// can take over.
//
// Signed out mid-session (401): the local copy is kept and syncs once the
// user signs back in. Signing out on purpose clears this user's local
// drafts, after warning about any that haven't synced (unsyncedDrafts).
import {
  DRAFT_LIMITS,
  emptyPayload,
  type ConversionDraftDto,
  type ConversionKind,
  type DraftNote,
  type DraftPayload,
  type DraftQuestion,
} from "@/lib/conversions";

// ─── Local store ─────────────────────────────────────────────────────────────

const DB_NAME = "uniarchive-drafts";
const STORE = "drafts";

export interface LocalDraft {
  /** `${upid}:${materialId}:${kind}:${targetKey}` */
  key: string;
  upid: string;
  materialId: string;
  kind: ConversionKind;
  /** The note being edited, or "new". */
  targetKey: string;
  draftId?: string;
  /** The server revision this copy builds on (0: never synced). */
  baseRevision: number;
  payload: DraftPayload;
  /** Question items removed here since the last sync (so a merge doesn't bring them back). */
  deleted: string[];
  /** Changed here since the last sync. */
  dirty: boolean;
  lastPage?: number;
  baseDocUpdatedAt?: string;
  localUpdatedAt: number;
  syncedAt?: number;
}

export const draftKey = (upid: string, materialId: string, kind: ConversionKind, targetDocId?: string) =>
  `${upid}:${materialId}:${kind}:${targetDocId || "new"}`;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "key" });
      store.createIndex("upid", "upid", { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const getLocalDraft = (key: string) => run<LocalDraft | undefined>("readonly", (s) => s.get(key));
export const putLocalDraft = (rec: LocalDraft) => run("readwrite", (s) => s.put(rec)).then(() => undefined);
export const deleteLocalDraft = (key: string) => run("readwrite", (s) => s.delete(key)).then(() => undefined);
export const listLocalDrafts = (upid: string) =>
  run<LocalDraft[]>("readonly", (s) => s.index("upid").getAll(IDBKeyRange.only(upid)));

// ─── Merging ─────────────────────────────────────────────────────────────────

/**
 * Both copies' question items, matched by clientItemId. Local edits win,
 * except that an item submitted elsewhere takes the submitted copy (it's
 * what was published). Items only on the server are added unless they
 * were deleted here.
 */
export function mergeQuestions(local: DraftQuestion[], server: DraftQuestion[], deleted: string[] = []): DraftQuestion[] {
  const gone = new Set(deleted);
  const serverById = new Map(server.map((q) => [q.clientItemId, q]));
  const merged = local.map((q) => {
    const s = serverById.get(q.clientItemId);
    return s?.submittedId && !q.submittedId ? s : q;
  });
  const have = new Set(local.map((q) => q.clientItemId));
  for (const s of server) {
    if (!have.has(s.clientItemId) && (!gone.has(s.clientItemId) || s.submittedId)) merged.push(s);
  }
  return merged.slice(0, DRAFT_LIMITS.questions);
}

const noteIsEmpty = (n: DraftNote) => !n.title.trim() && n.contentBlocks.every((b) => !b.content.trim());

/**
 * Merges the server's copy into this device's. For a note, this device's
 * version is kept and the server's is returned as otherVersion when it
 * differs (and isn't empty), so the user can choose.
 */
export function mergePayload(
  local: DraftPayload,
  server: DraftPayload,
  deleted: string[] = [],
): { payload: DraftPayload; otherVersion?: DraftNote } {
  if ("questions" in local && "questions" in server) {
    return { payload: { questions: mergeQuestions(local.questions, server.questions, deleted) } };
  }
  if ("note" in local && "note" in server) {
    const differs = JSON.stringify(local.note) !== JSON.stringify(server.note);
    return { payload: local, ...(differs && !noteIsEmpty(server.note) ? { otherVersion: server.note } : {}) };
  }
  return { payload: local };
}

/** This device's copy after seeing the server's draft (on open). */
export function reconcile(
  local: LocalDraft,
  server: ConversionDraftDto,
): { rec: LocalDraft; changed: boolean; otherVersion?: DraftNote } {
  const fromServer = {
    draftId: server.id,
    baseRevision: server.revision,
    ...(server.baseDocUpdatedAt ? { baseDocUpdatedAt: server.baseDocUpdatedAt } : {}),
  };
  if (!local.dirty) {
    return {
      rec: {
        ...local,
        ...fromServer,
        payload: server.payload,
        deleted: [],
        lastPage: server.lastPage ?? local.lastPage,
        syncedAt: Date.now(),
      },
      changed: JSON.stringify(local.payload) !== JSON.stringify(server.payload),
    };
  }
  if (local.draftId === server.id && local.baseRevision === server.revision) {
    return { rec: { ...local, ...fromServer }, changed: false };
  }
  const { payload, otherVersion } = mergePayload(local.payload, server.payload, local.deleted);
  return {
    rec: { ...local, ...fromServer, payload },
    changed: JSON.stringify(payload) !== JSON.stringify(local.payload),
    ...(otherVersion ? { otherVersion } : {}),
  };
}

// ─── Server ──────────────────────────────────────────────────────────────────

export type PushFailure = { ok: false; reason: "offline" | "signed-out" | "retry" | "rejected"; message?: string };
export type PushResult =
  | { ok: true; rec: LocalDraft; server?: ConversionDraftDto; merged: boolean; otherVersion?: DraftNote }
  | PushFailure;

type FetchLike = typeof fetch;

async function call(
  f: FetchLike,
  url: string,
  init: RequestInit,
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  try {
    const res = await f(url, { credentials: "same-origin", ...init });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, body };
  } catch {
    return null; // network
  }
}

function failure(r: { status: number; body: Record<string, unknown> } | null): PushFailure {
  if (!r) return { ok: false, reason: "offline" };
  const message = typeof r.body.message === "string" ? r.body.message : undefined;
  if (r.status === 401) return { ok: false, reason: "signed-out" };
  if (r.status === 429 || r.status >= 500) return { ok: false, reason: "retry", message };
  return { ok: false, reason: "rejected", message };
}

/** Get-or-create the server draft for this record. */
export async function openServerDraft(
  rec: Pick<LocalDraft, "materialId" | "kind" | "targetKey">,
  f: FetchLike = fetch,
): Promise<{ ok: true; draft: ConversionDraftDto } | PushFailure> {
  const r = await call(f, "/api/conversions/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      materialId: rec.materialId,
      kind: rec.kind,
      ...(rec.targetKey !== "new" ? { targetDocId: rec.targetKey } : {}),
    }),
  });
  if (r && (r.status === 200 || r.status === 201)) return { ok: true, draft: r.body.draft as ConversionDraftDto };
  return failure(r);
}

// keepalive requests (sent as the page closes) are limited to 64 KB
const KEEPALIVE_MAX = 60_000;

/**
 * Saves a local record to the server: opens the draft if it has none yet,
 * merges and retries on a revision conflict, and starts a new draft if the
 * old one was finished or discarded elsewhere. On success the record is
 * clean and at the server's revision.
 */
export async function pushRecord(
  rec: LocalDraft,
  { deviceId, keepalive = false, fetchImpl = fetch }: { deviceId?: string; keepalive?: boolean; fetchImpl?: FetchLike } = {},
): Promise<PushResult> {
  let cur = rec;
  let merged = false;
  let otherVersion: DraftNote | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!cur.draftId) {
      const opened = await openServerDraft(cur, fetchImpl);
      if (!opened.ok) return opened;
      const r = reconcile(cur, opened.draft);
      cur = r.rec;
      merged ||= r.changed;
      otherVersion = r.otherVersion ?? otherVersion;
      if (!cur.dirty) return { ok: true, rec: cur, server: opened.draft, merged, otherVersion };
    }
    const body = JSON.stringify({
      payload: cur.payload,
      baseRevision: cur.baseRevision,
      ...(deviceId ? { deviceId } : {}),
      ...(cur.lastPage ? { lastPage: cur.lastPage } : {}),
    });
    const r = await call(fetchImpl, `/api/conversions/drafts/${cur.draftId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: keepalive && body.length < KEEPALIVE_MAX,
    });
    if (r?.status === 200) {
      const server = r.body.draft as ConversionDraftDto;
      return {
        ok: true,
        rec: { ...cur, baseRevision: server.revision, dirty: false, deleted: [], syncedAt: Date.now() },
        server,
        merged,
        otherVersion,
      };
    }
    if (r?.status === 409 && r.body.conflict) {
      const server = r.body.draft as ConversionDraftDto;
      const m = mergePayload(cur.payload, server.payload, cur.deleted);
      merged ||= JSON.stringify(m.payload) !== JSON.stringify(cur.payload);
      otherVersion = m.otherVersion ?? otherVersion;
      cur = { ...cur, payload: m.payload, baseRevision: server.revision };
      continue;
    }
    if (r?.status === 409 || r?.status === 404) {
      // Finished, discarded or expired elsewhere: carry on in a new draft
      cur = { ...cur, draftId: undefined, baseRevision: 0 };
      continue;
    }
    return failure(r);
  }
  return { ok: false, reason: "retry" };
}

// ─── Sign-out ────────────────────────────────────────────────────────────────

const CHANNEL = "uniarchive-drafts";

type ChannelMessage =
  | { type: "changed"; key: string; rec: LocalDraft; tabId: string }
  | { type: "takeover"; key: string; tabId: string }
  | { type: "cleared"; upid: string };

function channel(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
}

/**
 * Tries to sync this user's unsynced drafts (with a time limit) and returns
 * the ones that still aren't on the server. Call before signing out.
 */
export async function unsyncedDrafts(upid: string, { timeoutMs = 6000, fetchImpl = fetch } = {}): Promise<LocalDraft[]> {
  let records: LocalDraft[];
  try {
    records = (await listLocalDrafts(upid)).filter((r) => r.dirty);
  } catch {
    return [];
  }
  if (records.length === 0) return [];
  const attempt = Promise.all(
    records.map(async (rec) => {
      const result = await pushRecord(rec, { fetchImpl });
      if (!result.ok) return rec;
      const latest = await getLocalDraft(rec.key);
      // Edited meanwhile in an open tab: that tab syncs it
      if (latest && latest.localUpdatedAt !== rec.localUpdatedAt) return latest;
      await putLocalDraft(result.rec);
      return null;
    }),
  ).then((left) => left.filter((r): r is LocalDraft => r !== null));
  const timeout = new Promise<LocalDraft[]>((resolve) => setTimeout(() => resolve(records), timeoutMs));
  return Promise.race([attempt, timeout]);
}

/** Removes this user's drafts from this device and closes any open workspace's copy. */
export async function clearLocalDrafts(upid: string): Promise<void> {
  const ch = channel();
  ch?.postMessage({ type: "cleared", upid } satisfies ChannelMessage);
  ch?.close();
  try {
    const records = await listLocalDrafts(upid);
    await Promise.all(records.map((r) => deleteLocalDraft(r.key)));
  } catch {
    // IndexedDB unavailable: nothing stored
  }
}

// ─── The workspace's draft ───────────────────────────────────────────────────

export type SyncStatus =
  | "loading"
  | "saving" // typing; not yet written to this device
  | "local" // on this device; not yet synced
  | "syncing"
  | "synced"
  | "offline" // on this device; no connection
  | "signed-out" // on this device; sign in to sync
  | "error";

export interface DraftState {
  status: SyncStatus;
  payload: DraftPayload;
  /** Bumped when the payload changes from outside the editor (merge, other tab): re-read it. */
  externalVersion: number;
  draftId?: string;
  revision: number;
  lastPage?: number;
  baseDocUpdatedAt?: string;
  lastSyncedAt?: number;
  /** Another tab is editing this draft; this one is read-only. */
  readOnly: boolean;
  /** For a note: the version from another device, when it differs. */
  otherVersion?: DraftNote;
  /** Why the server refused (status "error"), or a problem with this device's storage. */
  message?: string;
  /** The server refused this draft outright (no access, too many drafts): stop retrying. */
  blocked: boolean;
  /** IndexedDB isn't available: work is only kept while the page is open, until synced. */
  noLocalStore: boolean;
}

export interface DraftSessionOptions {
  upid: string;
  materialId: string;
  kind: ConversionKind;
  targetDocId?: string;
  fetchImpl?: FetchLike;
  /** Timings, overridable for tests. */
  timings?: Partial<typeof TIMINGS>;
}

const TIMINGS = {
  localDebounceMs: 500,
  syncIntervalMs: 10_000,
  minBackoffMs: 5_000,
  maxBackoffMs: 60_000,
  signedOutRetryMs: 30_000,
};

function deviceId(): string {
  try {
    let id = localStorage.getItem("uniarchive-device-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("uniarchive-device-id", id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/**
 * One draft open in the workspace. Plain TypeScript (React uses it through
 * useDraftSession): subscribe/getSnapshot fit useSyncExternalStore.
 */
export class DraftSession {
  private readonly key: string;
  private readonly lockName: string;
  private readonly tabId = crypto.randomUUID();
  private readonly t: typeof TIMINGS;
  private readonly f: FetchLike;
  private rec: LocalDraft;
  private state: DraftState;
  private listeners = new Set<() => void>();
  private ch: BroadcastChannel | null = null;
  private running = false;
  /** Bumped by start and stop, so a stale start (React remounts) bails out. */
  private gen = 0;
  private holder = false;
  private releaseLock: (() => void) | null = null;
  private lockAbort: AbortController | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private editSeq = 0;
  private backoff = 0;
  private nextAttemptAt = 0;
  private cleanup: (() => void)[] = [];

  constructor(private readonly opts: DraftSessionOptions) {
    this.key = draftKey(opts.upid, opts.materialId, opts.kind, opts.targetDocId);
    this.lockName = `uniarchive-draft:${this.key}`;
    this.t = { ...TIMINGS, ...opts.timings };
    this.f = opts.fetchImpl ?? ((...args) => fetch(...args));
    this.rec = this.blankRecord();
    this.state = {
      status: "loading",
      payload: this.rec.payload,
      externalVersion: 0,
      revision: 0,
      readOnly: false,
      blocked: false,
      noLocalStore: false,
    };
  }

  // ── public API

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const gen = ++this.gen;
    const alive = () => this.running && gen === this.gen;
    this.rec = this.blankRecord();
    this.set({ status: "loading", readOnly: false, blocked: false, message: undefined });

    this.ch = channel();
    if (this.ch) {
      const onMessage = (e: MessageEvent<ChannelMessage>) => this.onChannel(e.data);
      this.ch.addEventListener("message", onMessage);
    }
    this.listen(window, "online", () => void this.syncNow());
    this.listen(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden") void this.flush({ keepalive: true });
      else if (this.state.status === "signed-out") void this.syncNow();
    });
    this.listen(window, "pagehide", () => void this.flush({ keepalive: true }));

    // This device's copy first, so the editor fills in at once
    try {
      const local = await getLocalDraft(this.key);
      if (local) this.rec = local;
    } catch {
      this.set({ noLocalStore: true });
    }
    if (!alive()) return;
    this.set({ ...this.fromRecord(), externalVersion: this.state.externalVersion + 1 });

    await this.acquireLock(false, gen);
    if (!alive()) return;
    if (!this.holder) {
      this.set({ status: this.rec.dirty ? "local" : this.rec.draftId ? "synced" : "local", readOnly: true });
      return;
    }
    await this.openAndSync();
    this.syncTimer = setInterval(() => void this.tick(), this.t.syncIntervalMs);
  }

  stop({ save = true }: { save?: boolean } = {}): void {
    if (!this.running) return;
    if (save) void this.flush({ keepalive: true });
    else if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = null;
    this.running = false;
    this.gen++;
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.syncTimer = this.retryTimer = null;
    for (const off of this.cleanup) off();
    this.cleanup = [];
    this.ch?.close();
    this.ch = null;
    this.lockAbort?.abort();
    this.releaseLock?.();
    this.releaseLock = null;
    this.holder = false;
  }

  /** The editor's new content (and optionally the PDF page in view). */
  update(payload: DraftPayload, lastPage?: number): void {
    if (this.state.readOnly || !this.running) return;
    const removed =
      "questions" in this.rec.payload && "questions" in payload
        ? this.rec.payload.questions
            .map((q) => q.clientItemId)
            .filter((id) => !payload.questions.some((q) => q.clientItemId === id))
        : [];
    this.editSeq++;
    this.rec = {
      ...this.rec,
      payload,
      deleted: removed.length ? [...new Set([...this.rec.deleted, ...removed])] : this.rec.deleted,
      dirty: true,
      localUpdatedAt: Date.now(),
      ...(lastPage ? { lastPage } : {}),
    };
    this.set({ payload, status: "saving", ...(lastPage ? { lastPage } : {}) });
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => void this.writeLocal(), this.t.localDebounceMs);
  }

  /** Remembers the PDF page in view, without counting as an edit. */
  setLastPage(page: number): void {
    if (this.state.readOnly || page === this.rec.lastPage) return;
    this.rec = { ...this.rec, lastPage: page };
    this.set({ lastPage: page });
    if (!this.writeTimer) this.writeTimer = setTimeout(() => void this.writeLocal(), this.t.localDebounceMs);
  }

  /** Sync now (the "Sync now" button, coming back online, signing back in). */
  async syncNow(): Promise<void> {
    if (!this.holder) return;
    this.backoff = 0;
    this.nextAttemptAt = 0;
    if (!this.rec.draftId || this.state.status === "signed-out" || this.state.blocked) {
      await this.openAndSync();
    } else {
      await this.sync();
    }
  }

  /** Writes pending edits locally and syncs; resolves once the attempt is over. */
  async flush({ keepalive = false } = {}): Promise<void> {
    if (!this.holder) return;
    await this.writeLocal();
    await this.sync({ keepalive });
  }

  /** Replace this device's note with the other device's version. */
  takeOtherVersion(): void {
    const other = this.state.otherVersion;
    if (!other || this.opts.kind !== "note") return;
    this.update({ note: other });
    this.set({ otherVersion: undefined, externalVersion: this.state.externalVersion + 1 });
  }

  dismissOtherVersion(): void {
    this.set({ otherVersion: undefined });
  }

  /** Edit here instead of the other tab. */
  async takeOver(): Promise<void> {
    if (this.holder || !this.running) return;
    this.ch?.postMessage({ type: "takeover", key: this.key, tabId: this.tabId } satisfies ChannelMessage);
    const gen = this.gen;
    await this.acquireLock(true, gen);
    if (!this.running || gen !== this.gen || !this.holder) return;
    try {
      const local = await getLocalDraft(this.key);
      if (local) this.rec = local;
    } catch {
      // keep what this tab has
    }
    this.set({ ...this.fromRecord(), readOnly: false, externalVersion: this.state.externalVersion + 1 });
    await this.openAndSync();
    if (!this.syncTimer) this.syncTimer = setInterval(() => void this.tick(), this.t.syncIntervalMs);
  }

  /**
   * Done with this draft (its work is published): syncs, marks it finished
   * on the server and forgets it here. False if the server couldn't be
   * reached; the draft stays.
   */
  async finish(): Promise<boolean> {
    await this.flush();
    if (!this.rec.draftId || this.rec.dirty) return false;
    const r = await call(this.f, `/api/conversions/drafts/${this.rec.draftId}/finish`, { method: "POST" });
    if (r?.status !== 200) return false;
    await this.forget();
    return true;
  }

  /** Throws this draft away, here and on the server. False if offline. */
  async discard(): Promise<boolean> {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = null;
    if (this.rec.draftId) {
      const r = await call(this.f, `/api/conversions/drafts/${this.rec.draftId}`, { method: "DELETE" });
      if (r?.status !== 200 && r?.status !== 404) return false;
    }
    await this.forget();
    return true;
  }

  /** Applies a change to the payload made outside update() (e.g. marking a question submitted). */
  patchPayload(fn: (p: DraftPayload) => DraftPayload): void {
    const next = fn(this.rec.payload);
    this.update(next);
    this.set({ externalVersion: this.state.externalVersion + 1 });
  }

  // ── internals

  private blankRecord(): LocalDraft {
    const { upid, materialId, kind, targetDocId } = this.opts;
    return {
      key: this.key,
      upid,
      materialId,
      kind,
      targetKey: targetDocId || "new",
      baseRevision: 0,
      payload: emptyPayload(kind),
      deleted: [],
      dirty: false,
      localUpdatedAt: 0,
    };
  }

  private fromRecord(): Partial<DraftState> {
    return {
      payload: this.rec.payload,
      draftId: this.rec.draftId,
      revision: this.rec.baseRevision,
      lastPage: this.rec.lastPage,
      baseDocUpdatedAt: this.rec.baseDocUpdatedAt,
      lastSyncedAt: this.rec.syncedAt,
    };
  }

  private set(patch: Partial<DraftState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private listen(target: EventTarget, type: string, fn: () => void): void {
    target.addEventListener(type, fn);
    this.cleanup.push(() => target.removeEventListener(type, fn));
  }

  private async writeLocal(): Promise<void> {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = null;
    if (!this.running || !this.holder) return;
    const rec = this.rec;
    try {
      await putLocalDraft(rec);
      if (this.state.noLocalStore) this.set({ noLocalStore: false });
    } catch {
      if (!this.state.noLocalStore) this.set({ noLocalStore: true });
    }
    this.ch?.postMessage({ type: "changed", key: this.key, rec, tabId: this.tabId } satisfies ChannelMessage);
    if (this.state.status === "saving") this.set({ status: this.offlineish() ?? "local" });
  }

  /** The status to show while unsynced, when the last attempt failed. */
  private offlineish(): SyncStatus | null {
    const s = this.state.status;
    return s === "offline" || s === "signed-out" || s === "error" ? s : null;
  }

  private async acquireLock(wait: boolean, gen: number): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.locks) {
      this.holder = true;
      return;
    }
    this.lockAbort = new AbortController();
    await new Promise<void>((resolveAcquire) => {
      navigator.locks
        .request(
          this.lockName,
          wait ? { signal: this.lockAbort!.signal } : { ifAvailable: true },
          (lock) => {
            if (!lock || !this.running || gen !== this.gen) {
              resolveAcquire();
              return undefined;
            }
            this.holder = true;
            resolveAcquire();
            // Held until released (stop, or another tab takes over)
            return new Promise<void>((release) => {
              this.releaseLock = release;
            });
          },
        )
        .catch(() => resolveAcquire()); // aborted
    });
  }

  private onChannel(msg: ChannelMessage): void {
    if (msg.type === "cleared") {
      if (msg.upid !== this.opts.upid) return;
      // Signed out on purpose in another tab: stop without writing anything back
      this.stop({ save: false });
      this.set({ status: "signed-out", readOnly: true });
      return;
    }
    if (msg.key !== this.key || msg.tabId === this.tabId) return;
    if (msg.type === "changed" && !this.holder) {
      this.rec = msg.rec;
      this.set({ ...this.fromRecord(), status: msg.rec.dirty ? "local" : "synced", externalVersion: this.state.externalVersion + 1 });
    }
    if (msg.type === "takeover" && this.holder) {
      void (async () => {
        await this.flush();
        this.holder = false;
        if (this.syncTimer) clearInterval(this.syncTimer);
        this.syncTimer = null;
        this.releaseLock?.();
        this.releaseLock = null;
        this.set({ readOnly: true });
      })();
    }
  }

  private async tick(): Promise<void> {
    if (!this.holder || !this.rec.dirty || Date.now() < this.nextAttemptAt) return;
    if (this.state.blocked || this.state.status === "signed-out") return;
    await this.sync();
  }

  private scheduleRetry(ms: number): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void (this.rec.draftId ? this.sync() : this.openAndSync());
    }, ms);
  }

  private failed(result: PushFailure): void {
    if (result.reason === "signed-out") {
      this.set({ status: "signed-out" });
      this.scheduleRetry(this.t.signedOutRetryMs);
      return;
    }
    if (result.reason === "rejected") {
      this.set({ status: "error", message: result.message ?? "This draft couldn't be saved to your account.", blocked: !this.rec.draftId });
      return;
    }
    this.backoff = Math.min(this.backoff ? this.backoff * 2 : this.t.minBackoffMs, this.t.maxBackoffMs);
    this.nextAttemptAt = Date.now() + this.backoff;
    this.set({ status: result.reason === "offline" ? "offline" : this.rec.dirty ? "local" : "synced", message: result.message });
    this.scheduleRetry(this.backoff);
  }

  /** Opens the server draft, reconciles this device's copy with it and pushes if needed. */
  private async openAndSync(): Promise<void> {
    if (!this.holder || !this.running) return;
    this.set({ status: "syncing", blocked: false, message: undefined });
    const opened = await openServerDraft(this.rec, this.f);
    if (!this.running) return;
    if (!opened.ok) return this.failed(opened);
    const seqAtOpen = this.editSeq;
    const r = reconcile(this.rec, opened.draft);
    if (seqAtOpen !== this.editSeq) {
      // Typed while the request was out: keep it, merged with the server's
      const m = mergePayload(this.rec.payload, opened.draft.payload, this.rec.deleted);
      this.rec = { ...this.rec, draftId: opened.draft.id, baseRevision: opened.draft.revision, payload: m.payload };
    } else {
      this.rec = r.rec;
    }
    this.set({
      ...this.fromRecord(),
      ...(r.changed ? { externalVersion: this.state.externalVersion + 1 } : {}),
      ...(r.otherVersion ? { otherVersion: r.otherVersion } : {}),
    });
    await this.writeLocal();
    if (this.rec.dirty) await this.sync();
    else this.set({ status: "synced", lastSyncedAt: Date.now() });
  }

  private sync({ keepalive = false } = {}): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (!this.holder || !this.running || !this.rec.dirty) return Promise.resolve();
    this.inFlight = this.doSync(keepalive).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async doSync(keepalive: boolean): Promise<void> {
    // On this device before the server
    if (this.writeTimer) await this.writeLocal();
    const seq = this.editSeq;
    const sent = this.rec;
    this.set({ status: "syncing" });
    const result = await pushRecord(sent, { deviceId: deviceId(), keepalive, fetchImpl: this.f });
    if (!result.ok) return this.failed(result);
    this.backoff = 0;
    this.nextAttemptAt = 0;

    if (seq === this.editSeq) {
      this.rec = result.rec;
    } else {
      // Typed while saving: keep the newer text, on top of the saved revision
      const m = result.merged ? mergePayload(this.rec.payload, result.rec.payload, this.rec.deleted) : { payload: this.rec.payload };
      this.rec = {
        ...this.rec,
        draftId: result.rec.draftId,
        baseRevision: result.rec.baseRevision,
        baseDocUpdatedAt: result.rec.baseDocUpdatedAt,
        payload: m.payload,
        syncedAt: result.rec.syncedAt,
      };
    }
    this.set({
      ...this.fromRecord(),
      status: this.rec.dirty ? "local" : "synced",
      message: undefined,
      ...(result.merged && seq === this.editSeq ? { externalVersion: this.state.externalVersion + 1 } : {}),
      ...(result.otherVersion ? { otherVersion: result.otherVersion } : {}),
    });
    try {
      await putLocalDraft(this.rec);
    } catch {
      // noted by writeLocal
    }
    this.ch?.postMessage({ type: "changed", key: this.key, rec: this.rec, tabId: this.tabId } satisfies ChannelMessage);
  }

  private async forget(): Promise<void> {
    this.rec = { ...this.blankRecord() };
    this.set({ ...this.fromRecord(), status: "synced", externalVersion: this.state.externalVersion + 1 });
    try {
      await deleteLocalDraft(this.key);
    } catch {
      // nothing stored
    }
    this.ch?.postMessage({ type: "changed", key: this.key, rec: this.rec, tabId: this.tabId } satisfies ChannelMessage);
  }
}
