// components/admin/adminUi.tsx
// Building blocks shared by the admin panel pages: the page frame, status
// tabs, pager, a list-fetching hook and a JSON request helper.
"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40";
export const selectClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
export const cardClass = "rounded-xl border border-border bg-surface-raised p-5";
export const primaryButton =
  "rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50";
export const secondaryButton =
  "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50";
export const dangerButton =
  "rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400";

/**
 * Calls an admin API route and returns the parsed JSON, or throws an Error
 * carrying the server's message.
 */
export async function adminRequest<T>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) throw new Error(data?.message ?? `Request failed (HTTP ${res.status}).`);
  return data as T;
}

type Loaded<T> = { key: string; data: T } | { key: string; error: string };

/**
 * Fetches `url` whenever it changes (or reload() is called). `data` keeps the
 * last good result while a new one loads, so lists don't flash empty.
 */
export function useAdminList<T>(url: string) {
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [lastData, setLastData] = useState<T | null>(null);
  const requestKey = `${url}#${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        return data as T;
      })
      .then((data) => {
        setLoaded({ key: requestKey, data });
        setLastData(data);
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setLoaded({ key: requestKey, error: error.message || "Could not load." });
      });
    return () => controller.abort();
  }, [url, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  /** Replace the current data locally (after an update the server confirmed). */
  const patch = useCallback((update: (data: T) => T) => {
    setLastData((prev) => (prev ? update(prev) : prev));
  }, []);

  return {
    data: lastData,
    loading: loaded?.key !== requestKey,
    error: loaded && "error" in loaded && loaded.key === requestKey ? loaded.error : null,
    reload,
    patch,
  };
}

export function AdminPageShell({
  title,
  subtitle,
  actions,
  loading,
  onRefresh,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <FiArrowLeft aria-hidden /> Admin
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg border border-border p-2 text-text-secondary hover:text-text-primary"
                aria-label="Refresh"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden />
              </button>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            active === tab.id
              ? "border-primary text-text-primary"
              : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={secondaryButton}>
        Previous
      </button>
      <span className="text-text-muted">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className={secondaryButton}
      >
        Next
      </button>
    </div>
  );
}

/** Loading / error / empty states around a list. */
export function ListState({
  loading,
  error,
  empty,
  emptyText,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }
  if (loading && empty) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-surface-raised" />
        ))}
      </div>
    );
  }
  if (empty) {
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
        {emptyText}
      </p>
    );
  }
  return <div className={loading ? "opacity-60 transition-opacity" : ""}>{children}</div>;
}

/** Inline error line under an action. */
export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
