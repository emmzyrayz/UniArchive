// components/admin/broadcasts/AudiencePicker.tsx
// The Audience step: stacked criteria (all must match; none = everyone)
// with the values users actually have, and a live count + first 10
// recipients from the same resolver the send uses.
"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminAudiencePreview } from "@/types/admin";
import type { AudienceOptions } from "@/lib/broadcast/recipients";
import { INACTIVE_DAYS, type BroadcastAudience } from "@/lib/broadcast/audience";
import type { EmailKind } from "@/lib/emailPrefs";
import { ROLE_LABELS } from "@/components/profile/profileUi";
import type { UserRole } from "@/types/roles";
import { cardClass, inputClass } from "../adminUi";

const COUNT_DEBOUNCE_MS = 400;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckList({
  title,
  items,
  selected,
  onToggle,
  searchable,
}: {
  title: string;
  items: { value: string; label: string; count: number; hint?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const shown = filter.trim()
    ? items.filter((i) => `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase()))
    : items;
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-text-secondary">
        {title} {selected.length > 0 && <span className="text-xs text-primary">({selected.length} picked)</span>}
      </legend>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">No users have one set yet.</p>
      ) : (
        <>
          {searchable && items.length > 6 && (
            <input
              type="search"
              className={`mb-2 ${inputClass}`}
              placeholder={`Filter ${title.toLowerCase()}`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label={`Filter ${title.toLowerCase()}`}
            />
          )}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2">
            {shown.map((i) => (
              <label key={i.value} className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" checked={selected.includes(i.value)} onChange={() => onToggle(i.value)} />
                <span className="flex-1">
                  {i.label}
                  {i.hint && <span className="text-xs text-text-muted"> · {i.hint}</span>}
                </span>
                <span className="text-xs text-text-muted">{i.count}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}

export function AudiencePicker({
  audience,
  kind,
  onChange,
}: {
  audience: BroadcastAudience;
  kind: EmailKind;
  onChange: (audience: BroadcastAudience) => void;
}) {
  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminAudiencePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/broadcasts/audience-options", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as (AudienceOptions & { message?: string }) | null;
        if (!res.ok || !data) throw new Error(data?.message ?? `HTTP ${res.status}`);
        setOptions(data);
      })
      .catch((err: Error) => setOptionsError(err.message || "Couldn't load the options."));
  }, []);

  const key = useMemo(() => JSON.stringify({ audience, kind }), [audience, kind]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setCounting(true);
      fetch("/api/admin/broadcasts/audience", {
        method: "POST",
        signal: controller.signal,
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: key,
      })
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as (AdminAudiencePreview & { message?: string }) | null;
          if (!res.ok || !data) throw new Error(data?.message ?? `HTTP ${res.status}`);
          setPreview(data);
          setPreviewError(null);
        })
        .catch((err: Error) => {
          if (err.name !== "AbortError") setPreviewError(err.message || "Couldn't count recipients.");
        })
        .finally(() => setCounting(false));
    }, COUNT_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const set = (patch: Partial<BroadcastAudience>) => onChange({ ...audience, ...patch });

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className={`${cardClass} space-y-5`}>
        <p className="text-sm text-text-secondary">
          Every criterion you set must match. Leave everything empty to reach everyone who gets{" "}
          {kind === "newsletter" ? "the newsletter (opted in)" : "announcements (hasn't turned them off)"}.
        </p>
        {optionsError && <p className="text-sm text-red-600 dark:text-red-400">{optionsError}</p>}
        {options && (
          <>
            <CheckList
              title="Schools"
              searchable
              items={options.schools.map((s) => ({ value: s.value, label: s.value, count: s.count }))}
              selected={audience.schools}
              onToggle={(v) => set({ schools: toggle(audience.schools, v) })}
            />
            <CheckList
              title="Departments"
              searchable
              items={options.departments.map((d) => ({ value: d.id, label: d.name, hint: d.school, count: d.count }))}
              selected={audience.departmentIds}
              onToggle={(v) => set({ departmentIds: toggle(audience.departmentIds, v) })}
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <CheckList
                title="Levels"
                items={options.levels.map((l) => ({ value: l.value, label: l.value, count: l.count }))}
                selected={audience.levels}
                onToggle={(v) => set({ levels: toggle(audience.levels, v) })}
              />
              <CheckList
                title="Roles"
                items={options.roles.map((r) => ({ value: r.value, label: ROLE_LABELS[r.value as UserRole] ?? r.value, count: r.count }))}
                selected={audience.roles}
                onToggle={(v) => set({ roles: toggle(audience.roles, v as UserRole) })}
              />
            </div>
          </>
        )}
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-text-secondary">Only people who...</legend>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={audience.contributorsOnly} onChange={(e) => set({ contributorsOnly: e.target.checked })} />
            have at least one verified material (contributors)
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={audience.verifiedStudentsOnly} onChange={(e) => set({ verifiedStudentsOnly: e.target.checked })} />
            confirmed a school email (verified students)
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={audience.incompleteProfileOnly} onChange={(e) => set({ incompleteProfileOnly: e.target.checked })} />
            haven&apos;t finished their profile
          </label>
          <label className="flex flex-wrap items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={audience.inactiveDays !== null}
              onChange={(e) => set({ inactiveDays: e.target.checked ? 30 : null })}
            />
            haven&apos;t been active for
            <input
              type="number"
              min={INACTIVE_DAYS.min}
              max={INACTIVE_DAYS.max}
              disabled={audience.inactiveDays === null}
              value={audience.inactiveDays ?? 30}
              onChange={(e) => set({ inactiveDays: e.target.value === "" ? null : Number(e.target.value) })}
              className={`w-20 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:opacity-50`}
              aria-label="Inactive for how many days"
            />
            days ({INACTIVE_DAYS.min}-{INACTIVE_DAYS.max})
          </label>
        </fieldset>
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-medium text-text-secondary">Joined between (optional)</legend>
          <label className="text-xs text-text-muted">
            From
            <input type="date" className={`mt-1 ${inputClass}`} value={audience.joinedFrom ?? ""} onChange={(e) => set({ joinedFrom: e.target.value || null })} />
          </label>
          <label className="text-xs text-text-muted">
            To
            <input type="date" className={`mt-1 ${inputClass}`} value={audience.joinedTo ?? ""} onChange={(e) => set({ joinedTo: e.target.value || null })} />
          </label>
        </fieldset>
      </div>

      <div className={cardClass}>
        <h3 className="font-semibold text-text-primary">Recipients</h3>
        <p className="mt-1 text-3xl font-bold text-text-primary" aria-live="polite">
          {preview ? preview.total.toLocaleString() : "..."}
          {counting && <span className="ml-2 text-xs font-normal text-text-muted">updating</span>}
        </p>
        <p className="text-xs text-text-muted">Verified, active accounts that accept this kind of email.</p>
        {previewError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{previewError}</p>}
        {preview && preview.sample.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {preview.sample.map((r) => (
              <li key={r.id} className="py-2">
                <span className="font-medium text-text-primary">{r.name}</span>{" "}
                <span className="text-text-muted">@{r.upid}</span>
                <span className="block text-xs text-text-muted">
                  {[r.email, r.school, r.level].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
            {preview.total > preview.sample.length && (
              <li className="py-2 text-xs text-text-muted">and {(preview.total - preview.sample.length).toLocaleString()} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
