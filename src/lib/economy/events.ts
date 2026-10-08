// src/lib/economy/events.ts
// After every ledger entry, listeners run (notifications, badges,
// leaderboard caches...). Modules subscribe in their manifest; the core
// never calls them directly. Listeners run after the response is sent and
// never fail the entry: their errors are logged.
import { after } from "next/server";
import type { ILedgerEntry } from "@/lib/models/ledgerEntryModel";

export type LedgerListener = (entry: ILedgerEntry) => void | Promise<void>;

const listeners: LedgerListener[] = [];

export function onLedgerEvent(listener: LedgerListener): () => void {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i >= 0) listeners.splice(i, 1);
  };
}

async function run(entry: ILedgerEntry) {
  for (const listener of [...listeners]) {
    try {
      await listener(entry);
    } catch (error) {
      console.error(`[economy] listener failed for ${entry.sourceKey}:`, error);
    }
  }
}

export function emitLedgerEvent(entry: ILedgerEntry): void {
  if (listeners.length === 0) return;
  try {
    after(() => run(entry));
  } catch {
    // Outside a request (scripts, tests): run now, without blocking the caller
    void run(entry);
  }
}
