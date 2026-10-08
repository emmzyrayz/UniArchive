// components/scouts/ScoutShop.tsx
// /scouts/shop: everything credits can buy, from every economy module
// (GET /api/economy/shop), grouped by kind. Buying asks to confirm on the
// card itself, sends an Idempotency-Key (a retry never charges twice), then
// reloads the list and the balance.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import type { ShopItem } from "@/lib/economy/shop";
import type { WalletSummary } from "@/lib/economy/wallet";

const KIND_TITLES: Record<string, { title: string; icon: string }> = {
  streak: { title: "Streak protection", icon: "❄️" },
};
const kindTitle = (kind: string) => KIND_TITLES[kind] ?? { title: kind.charAt(0).toUpperCase() + kind.slice(1), icon: "🛍️" };
const fmt = (n: number) => n.toLocaleString("en");

function newKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function ItemCard({ item, onBought }: { item: ShopItem; onBought: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);

  const buy = async () => {
    // The same key for retries of this purchase; a new one for the next
    const idem = key ?? newKey();
    setKey(idem);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/economy/shop/${encodeURIComponent(item.id)}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem },
        body: "{}",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Couldn't buy that.");
      setConfirming(false);
      setKey(null);
      onBought(`${item.title}: done. ${fmt(item.price)} AC spent.`);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You seem to be offline. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col rounded-2xl border border-border bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-text-primary">{item.title}</h3>
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-semibold text-primary">{fmt(item.price)} AC</span>
      </div>
      <p className="mt-1 flex-1 text-sm text-text-secondary">{item.description}</p>
      {item.detail && <p className="mt-2 text-sm font-medium text-text-primary">{item.detail}</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-4">
        {item.blocked ? (
          <p className="rounded-lg border border-dashed border-border py-2 text-center text-sm text-text-muted">{item.blocked}</p>
        ) : confirming ? (
          <div className="flex gap-2">
            <button type="button" onClick={buy} disabled={busy} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Buying…" : `Spend ${fmt(item.price)} AC`}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90">
            Buy
          </button>
        )}
      </div>
    </li>
  );
}

export function ScoutShop() {
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const get = async <T,>(url: string) => {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? "Couldn't load the shop.");
      return body as T;
    };
    Promise.all([get<{ items: ShopItem[] }>("/api/economy/shop"), get<WalletSummary>("/api/economy/wallet")])
      .then(([shop, w]) => {
        setItems(shop.items);
        setWallet(w);
      })
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => controller.abort();
  }, [round]);

  const reload = useCallback((msg: string) => {
    setMessage(msg);
    setRound((r) => r + 1);
  }, []);

  const kinds = [...new Set((items ?? []).map((i) => i.kind))];

  return (
    <main className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/scouts" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <FiArrowLeft aria-hidden /> Scouts
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Scouts shop</h1>
            <p className="mt-1 text-text-secondary">Spend the Archive Credits you earn. Reading and studying stay free for everyone.</p>
          </div>
          {wallet && (
            <p className="rounded-xl border border-border bg-surface-raised px-4 py-2 text-lg font-bold text-text-primary">
              {fmt(wallet.AC)} <span className="text-sm font-semibold text-text-secondary">AC</span>
            </p>
          )}
        </header>

        {message && (
          <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-300">
            {message}
          </p>
        )}
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        {!items && !error && <p className="text-sm text-text-muted">Loading…</p>}
        {items?.length === 0 && <p className="text-sm text-text-muted">Nothing on sale right now. Check back soon.</p>}

        {kinds.map((kind) => {
          const k = kindTitle(kind);
          return (
            <section key={kind}>
              <h2 className="mb-3 text-lg font-semibold text-text-primary">
                <span aria-hidden>{k.icon}</span> {k.title}
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items!
                  .filter((i) => i.kind === kind)
                  .map((item) => (
                    <ItemCard key={`${item.id}:${round}`} item={item} onBought={reload} />
                  ))}
              </ul>
            </section>
          );
        })}

        <p className="text-xs text-text-muted">
          Credits have no cash value and can&apos;t be refunded for money. If something you bought can&apos;t be delivered,
          the credits go straight back.
        </p>
      </div>
    </main>
  );
}
