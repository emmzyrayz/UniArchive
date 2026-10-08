// components/admin/EconomyAdmin.tsx
// /admin/economy: the credits economy. Totals of the system accounts, the
// overall daily AC cap, every module with its earn sources and products
// (change rewards, caps and prices, switch things off, back to defaults),
// staff adjustments to a member or the treasury, and the recent ones.
"use client";

import { useState } from "react";
import type { EconomyOverview } from "@/lib/economy/admin";
import {
  ActionError,
  AdminPageShell,
  ListState,
  adminRequest,
  cardClass,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
  useAdminList,
} from "./adminUi";
import { timeAgo } from "./reviewShared";

type Module = EconomyOverview["modules"][number];
type Source = Module["sources"][number];
type Product = Module["products"][number];

// The shared input is full width; number boxes here are narrow
const smallInput = inputClass.replace("w-full ", "");

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const fmt = (n: number) => n.toLocaleString("en");

function useSave(reload: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await adminRequest("/api/admin/economy/settings", "PUT", { id, ...body });
      reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, error, save };
}

function Toggle({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-primary" : "bg-border"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function SourceRow({ s, save, busy }: { s: Source; save: ReturnType<typeof useSave>["save"]; busy: boolean }) {
  const [ac, setAc] = useState(String(s.rewards.AC ?? 0));
  const [xp, setXp] = useState(String(s.rewards.XP ?? 0));
  const [cap, setCap] = useState(s.dailyCap === null ? "" : String(s.dailyCap));
  const changed = ac !== String(s.rewards.AC ?? 0) || xp !== String(s.rewards.XP ?? 0) || cap !== (s.dailyCap === null ? "" : String(s.dailyCap));
  const flags = [s.capped && "counts toward the daily cap", s.streakBoost && "streak boost", s.countsForBoards && "leaderboards"].filter(Boolean);
  return (
    <li className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">
          {s.title} <span className="font-mono text-xs text-text-muted">{s.id}</span>
        </p>
        <p className="text-xs text-text-muted">
          Default {s.defaults.rewards.AC ?? 0} AC / {s.defaults.rewards.XP ?? 0} XP
          {s.defaults.dailyCap !== null && `, ${s.defaults.dailyCap} AC a day`}
          {flags.length > 0 && ` · ${flags.join(", ")}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-text-secondary">
          AC <input value={ac} onChange={(e) => setAc(e.target.value)} inputMode="numeric" className={`${smallInput} w-16`} />
        </label>
        <label className="flex items-center gap-1 text-xs text-text-secondary">
          XP <input value={xp} onChange={(e) => setXp(e.target.value)} inputMode="numeric" className={`${smallInput} w-16`} />
        </label>
        <label className="flex items-center gap-1 text-xs text-text-secondary">
          Cap/day <input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="none" inputMode="numeric" className={`${smallInput} w-20`} />
        </label>
        <button type="button" className={primaryButton} disabled={!changed || busy}
          onClick={() => save(s.id, { rewards: { AC: num(ac) ?? 0, XP: num(xp) ?? 0 }, dailyCap: num(cap) })}>
          Save
        </button>
        {s.overridden && (
          <button type="button" className={secondaryButton} disabled={busy} onClick={() => save(s.id, { reset: true })}>
            Defaults
          </button>
        )}
        <Toggle on={s.enabled} disabled={busy} label={`${s.title} on`} onChange={(v) => save(s.id, { enabled: v })} />
      </div>
    </li>
  );
}

function ProductRow({ p, save, busy }: { p: Product; save: ReturnType<typeof useSave>["save"]; busy: boolean }) {
  const [price, setPrice] = useState(String(p.price));
  return (
    <li className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">
          {p.title} <span className="font-mono text-xs text-text-muted">{p.id}</span>
        </p>
        <p className="text-xs text-text-muted">
          {p.description} Default {p.defaultPrice} AC{p.minLevel ? `, level ${p.minLevel}+` : ""}
          {p.perDay ? `, ${p.perDay} a day` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-text-secondary">
          Price <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className={`${smallInput} w-20`} />
        </label>
        <button type="button" className={primaryButton} disabled={price === String(p.price) || busy} onClick={() => save(p.id, { price: num(price) })}>
          Save
        </button>
        {p.overridden && (
          <button type="button" className={secondaryButton} disabled={busy} onClick={() => save(p.id, { reset: true })}>
            Defaults
          </button>
        )}
        <Toggle on={p.enabled} disabled={busy} label={`${p.title} on`} onChange={(v) => save(p.id, { enabled: v })} />
      </div>
    </li>
  );
}

function AdjustForm({ onDone }: { onDone: () => void }) {
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState<"AC" | "XP">("AC");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    const who = target.trim() === "treasury" ? "the treasury" : `@${target.trim().replace(/^@/, "")}`;
    if (!window.confirm(`${n > 0 ? "Give" : "Take"} ${fmt(Math.abs(n))} ${currency} ${n > 0 ? "to" : "from"} ${who}?`)) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await adminRequest("/api/admin/economy/adjust", "POST", { target, currency, amount: n, note });
      setDone(`Done: ${n > 0 ? "+" : ""}${fmt(n)} ${currency} for ${who}.`);
      setAmount("");
      setNote("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't adjust.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_8rem]">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Member id (@upid) or treasury" className={inputClass} required />
        <select value={currency} onChange={(e) => setCurrency(e.target.value as "AC" | "XP")} className={selectClass}>
          <option value="AC">AC</option>
          <option value="XP">XP</option>
        </select>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+50 or -50" inputMode="numeric" className={inputClass} required />
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why (kept in the ledger and shown to them)" className={inputClass} required minLength={3} maxLength={500} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={busy || !amount || !target || note.trim().length < 3}>
          {busy ? "Saving…" : "Adjust"}
        </button>
        {done && <p className="text-sm text-green-700 dark:text-green-400">{done}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </form>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </div>
  );
}

export function EconomyAdmin() {
  const { data, loading, error, reload } = useAdminList<EconomyOverview>("/api/admin/economy");
  const { busy, error: saveError, save } = useSave(reload);
  const [cap, setCap] = useState<string | null>(null);

  return (
    <AdminPageShell
      title="Credits economy"
      subtitle="Archive Credits (AC) and XP: what each module pays and charges, and staff adjustments. Changes apply within about 30 seconds everywhere."
      loading={loading}
      onRefresh={reload}
    >
      <ActionError message={saveError} />
      <ListState loading={loading && !data} error={error} empty={false} emptyText="">
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="AC created" value={fmt(-data.totals.mint.AC)} hint="Everything ever earned or given" />
              <Stat label="AC spent" value={fmt(data.totals.burn.AC)} hint="Purchases and fees, gone for good" />
              <Stat label="Treasury" value={fmt(data.totals.treasury.AC)} hint="Budget for events and partners" />
              <Stat label="XP issued" value={fmt(-data.totals.mint.XP)} hint="Drives levels and leaderboards" />
            </div>

            <section className={cardClass}>
              <h2 className="font-semibold text-text-primary">Daily AC cap</h2>
              <p className="mt-1 text-sm text-text-secondary">
                The most AC one person can earn in a day from task-style sources (Lagos time). XP is never capped. Default{" "}
                {data.dailyAcCap.default}.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={cap ?? String(data.dailyAcCap.value)}
                  onChange={(e) => setCap(e.target.value)}
                  inputMode="numeric"
                  className={`${smallInput} w-28`}
                  aria-label="Daily AC cap"
                />
                <button
                  type="button"
                  className={primaryButton}
                  disabled={cap === null || cap === String(data.dailyAcCap.value) || busy === "core"}
                  onClick={async () => {
                    if (await save("core", { dailyCap: num(cap ?? "") })) setCap(null);
                  }}
                >
                  Save
                </button>
              </div>
            </section>

            {data.modules.map((m) => (
              <section key={m.id} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-text-primary">
                      {m.title} <span className="font-mono text-xs text-text-muted">{m.id}</span>
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">{m.description}</p>
                  </div>
                  {m.id !== "core" && (
                    <Toggle on={m.enabled} disabled={busy === m.id} label={`${m.title} module on`} onChange={(v) => save(m.id, { enabled: v })} />
                  )}
                </div>
                {m.sources.length > 0 && (
                  <>
                    <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Earn</h3>
                    <ul className="divide-y divide-border">
                      {m.sources.map((s) => (
                        <SourceRow key={`${s.id}:${JSON.stringify(s.rewards)}:${s.dailyCap}`} s={s} save={save} busy={busy === s.id} />
                      ))}
                    </ul>
                  </>
                )}
                {m.products.length > 0 && (
                  <>
                    <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Shop</h3>
                    <ul className="divide-y divide-border">
                      {m.products.map((p) => (
                        <ProductRow key={`${p.id}:${p.price}`} p={p} save={save} busy={busy === p.id} />
                      ))}
                    </ul>
                  </>
                )}
                {m.sources.length === 0 && m.products.length === 0 && (
                  <p className="mt-3 text-sm text-text-muted">Nothing to earn or buy here yet.</p>
                )}
              </section>
            ))}

            <section className={cardClass}>
              <h2 className="font-semibold text-text-primary">Adjust a balance</h2>
              <p className="mb-3 mt-1 text-sm text-text-secondary">
                Give or take back credits (a negative amount takes back and may leave them below zero), or top up the
                treasury. Every adjustment is kept with your name and the reason.
              </p>
              <AdjustForm onDone={reload} />
            </section>

            <section className={cardClass}>
              <h2 className="font-semibold text-text-primary">Recent adjustments</h2>
              {data.adjustments.length === 0 ? (
                <p className="mt-2 text-sm text-text-muted">None yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {data.adjustments.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                      <span className="min-w-0 text-text-primary">
                        <span className={a.amount > 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {a.amount > 0 ? "+" : ""}
                          {fmt(a.amount)} {a.currency}
                        </span>{" "}
                        {a.target} <span className="text-text-secondary">: {a.note}</span>
                      </span>
                      <span className="text-xs text-text-muted">
                        {a.by} · {timeAgo(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </ListState>
    </AdminPageShell>
  );
}
