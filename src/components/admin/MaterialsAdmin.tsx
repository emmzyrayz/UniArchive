// components/admin/MaterialsAdmin.tsx
// /admin/materials: every UniLibrary material, with inline metadata editing
// and deactivate / reactivate.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/constants/materialCategories";
import { SUBMISSION_LEVELS, SUBMISSION_SEMESTERS } from "@/lib/constants/submissions";
import { levelLabel } from "@/components/unilibrary/materialLabels";
import type { AdminMaterialDto, AdminMaterialsResponse } from "@/types/admin";
import { categoryLabel, timeAgo } from "./reviewShared";
import { useStaffArea } from "./staffArea";
import { outlineKindFor } from "@/lib/outline";
import {
  ActionError,
  AdminPageShell,
  ListState,
  Pager,
  StatusTabs,
  adminRequest,
  cardClass,
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
  useAdminList,
} from "./adminUi";

export interface UniversityOption {
  id: string;
  name: string;
  abbr?: string;
}

type Status = "active" | "inactive" | "all";
type Sort = "recent" | "popular" | "reported";

const SEARCH_DEBOUNCE_MS = 300;

function EditPanel({
  material,
  onSaved,
  onCancel,
}: {
  material: AdminMaterialDto;
  onSaved: (m: AdminMaterialDto) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: material.title,
    courseCode: material.courseCode ?? "",
    level: material.level ?? "",
    semester: material.semester ?? "",
    academicYear: material.academicYear ?? "",
    tags: material.tags.join(", "),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { material: updated } = await adminRequest<{ material: AdminMaterialDto }>(
        `/api/admin/materials/${material.id}`,
        "PATCH",
        {
          title: form.title,
          courseCode: form.courseCode,
          level: form.level,
          semester: form.semester,
          academicYear: form.academicYear,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        },
      );
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
      <label className="text-xs text-text-secondary sm:col-span-2">
        Title
        <input className={`mt-1 ${inputClass}`} value={form.title} maxLength={300} required onChange={(e) => set("title")(e.target.value)} />
      </label>
      <label className="text-xs text-text-secondary">
        Course code
        <input className={`mt-1 ${inputClass}`} value={form.courseCode} maxLength={20} placeholder="MTH301" onChange={(e) => set("courseCode")(e.target.value)} />
      </label>
      <label className="text-xs text-text-secondary">
        Academic year
        <input className={`mt-1 ${inputClass}`} value={form.academicYear} maxLength={9} placeholder="2023/2024" onChange={(e) => set("academicYear")(e.target.value)} />
      </label>
      <label className="text-xs text-text-secondary">
        Level
        <select className={`mt-1 w-full ${selectClass}`} value={form.level} onChange={(e) => set("level")(e.target.value)}>
          <option value="">—</option>
          {SUBMISSION_LEVELS.map((l) => (
            <option key={l} value={l}>
              {levelLabel(l)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-text-secondary">
        Semester
        <select className={`mt-1 w-full ${selectClass}`} value={form.semester} onChange={(e) => set("semester")(e.target.value)}>
          <option value="">—</option>
          {SUBMISSION_SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-text-secondary sm:col-span-2">
        Tags (comma separated)
        <input className={`mt-1 ${inputClass}`} value={form.tags} onChange={(e) => set("tags")(e.target.value)} placeholder="calculus, integration" />
      </label>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <ActionError message={error} />
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function MaterialRow({
  material,
  onUpdated,
}: {
  material: AdminMaterialDto;
  onUpdated: (m: AdminMaterialDto) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { base } = useStaffArea();
  const m = material;
  const outlineKind = outlineKindFor(m.subcategory);

  const update = async (body: { isActive: boolean } | { clearReports: true }) => {
    setBusy(true);
    setError(null);
    try {
      const { material: updated } = await adminRequest<{ material: AdminMaterialDto }>(
        `/api/admin/materials/${m.id}`,
        "PATCH",
        body,
      );
      setConfirming(false);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  const place = [
    m.universityAbbr || m.universityName,
    m.facultyName,
    m.departmentName,
    m.level && levelLabel(m.level),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary">
            {m.courseCode ? `${m.courseCode} — ` : ""}
            {m.title}
            {m.academicYear && <span className="font-normal text-text-secondary"> {m.academicYear}</span>}
          </p>
          {place && <p className="mt-0.5 truncate text-xs text-text-secondary">{place}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {m.status === "unverified" && (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Unverified
            </span>
          )}
          {m.hiddenByReports && (
            <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
              Hidden by reports
            </span>
          )}
          {!m.isActive && (
            <span className="rounded-full bg-neutral-500/10 px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
              Inactive
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {m.status === "unverified" ? "Waiting for review" : m.verificationTier === "tier2" ? "Tier 2 ⭐" : "Tier 1 ✓"} · {categoryLabel(m.category, m.subcategory)} ·{" "}
        {m.viewCount.toLocaleString()} views ·{" "}
        <span className={m.reportCount ? "font-semibold text-red-600 dark:text-red-400" : ""}>
          {m.reportCount} report{m.reportCount === 1 ? "" : "s"}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-text-muted">
        by {m.submittedByUpid ? `@${m.submittedByUpid}` : "a former member"}
        {m.tier1VerifiedAt ? ` · verified ${timeAgo(m.tier1VerifiedAt)} by @${m.tier1VerifiedByUpid}` : ` · listed ${timeAgo(m.createdAt)}`}
      </p>
      {m.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.tags.map((t) => (
            <span key={t} className="rounded-full bg-neutral-500/10 px-2 py-0.5 text-xs text-text-secondary">
              {t}
            </span>
          ))}
        </div>
      )}

      {editing ? (
        <EditPanel
          material={m}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
          }}
        />
      ) : confirming ? (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
          <p className="text-text-primary">Deactivate this material? It will no longer appear in the UniLibrary.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
              Cancel
            </button>
            <button type="button" onClick={() => update({ isActive: false })} disabled={busy} className={dangerButton}>
              {busy ? "Deactivating…" : "Deactivate"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Link href={`/read/${m.bookId}`} className={secondaryButton}>
            Open
          </Link>
          {outlineKind && (
            <Link href={`${base}/materials/${m.id}/outline`} className={secondaryButton}>
              {outlineKind === "toc" ? "Contents" : "Course outline"}
            </Link>
          )}
          <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>
            Edit
          </button>
          {(m.hiddenByReports || m.reportCount > 0) && (
            <button
              type="button"
              onClick={() => update({ clearReports: true })}
              disabled={busy}
              className={secondaryButton}
              title="Clear its reports (and show it again if they hid it)"
            >
              {m.hiddenByReports ? "Restore" : "Clear reports"}
            </button>
          )}
          {m.isActive ? (
            <button type="button" onClick={() => setConfirming(true)} className={dangerButton}>
              Deactivate
            </button>
          ) : (
            <button type="button" onClick={() => update({ isActive: true })} disabled={busy} className={primaryButton}>
              {busy ? "Reactivating…" : "Reactivate"}
            </button>
          )}
        </div>
      )}
      <ActionError message={error} />
    </li>
  );
}

export function MaterialsAdmin({ universities }: { universities: UniversityOption[] }) {
  const [status, setStatus] = useState<Status>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({ status, sort, page: String(page) });
  if (debouncedSearch) query.set("search", debouncedSearch);
  if (category) query.set("category", category);
  if (universityId) query.set("universityId", universityId);
  const { data, loading, error, reload, patch } = useAdminList<AdminMaterialsResponse>(
    `/api/admin/materials?${query}`,
  );

  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const onUpdated = (updated: AdminMaterialDto) => {
    const moved = status !== "all" && (status === "active") !== updated.isActive;
    if (moved) reload();
    else
      patch((d) => ({ ...d, materials: d.materials.map((m) => (m.id === updated.id ? updated : m)) }));
  };

  const materials = data?.materials ?? [];
  return (
    <AdminPageShell title="Materials" subtitle="Everything in the UniLibrary, including deactivated items." loading={loading} onRefresh={reload}>
      <StatusTabs<Status>
        tabs={[
          { id: "active", label: "Active", count: data?.counts.active },
          { id: "inactive", label: "Inactive", count: data?.counts.inactive },
          { id: "all", label: "All" },
        ]}
        active={status}
        onChange={(s) => filter(() => setStatus(s))}
      />

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          className={inputClass}
          placeholder="Search title, course code, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search materials"
        />
        <select className={selectClass} value={category} onChange={(e) => filter(() => setCategory(e.target.value))} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={universityId} onChange={(e) => filter(() => setUniversityId(e.target.value))} aria-label="University">
          <option value="">All universities</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.abbr ? `${u.abbr} — ${u.name}` : u.name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={sort} onChange={(e) => filter(() => setSort(e.target.value as Sort))} aria-label="Sort">
          <option value="recent">Most recent</option>
          <option value="popular">Most viewed</option>
          <option value="reported">Most reported</option>
        </select>
      </div>

      <ListState loading={loading} error={error} empty={materials.length === 0} emptyText="No materials match.">
        <ul className="space-y-3">
          {materials.map((m) => (
            <MaterialRow key={m.id} material={m} onUpdated={onUpdated} />
          ))}
        </ul>
      </ListState>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </AdminPageShell>
  );
}
