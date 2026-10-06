// components/admin/InstitutionsAdmin.tsx
// /admin/institutions: universities on the left; the selected one's details,
// faculties and departments on the right, all editable inline.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FiChevronDown, FiChevronRight, FiPlus } from "react-icons/fi";
import { NIGERIAN_STATES } from "@/lib/constants/nigerianStates";
import type {
  AdminDepartmentDto,
  AdminFacultyDto,
  AdminUniversitiesResponse,
  AdminUniversityDto,
} from "@/types/admin";
import { Modal, ModalActions } from "./ReviewModals";
import {
  ActionError,
  AdminPageShell,
  ListState,
  Pager,
  adminRequest,
  cardClass,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
  useAdminList,
} from "./adminUi";

// Mirrors UNIVERSITY_TYPES / UNIVERSITY_OWNERSHIPS in the (server) model
const TYPES = [
  "University",
  "University of Technology",
  "University of Agriculture",
  "University of Education",
  "Polytechnic",
  "College of Education",
  "Monotechnic",
  "Institute",
];
const OWNERSHIPS = ["Federal", "State", "Private"] as const;
const SEARCH_DEBOUNCE_MS = 300;

const linkButton = "text-xs font-medium text-text-secondary hover:text-text-primary";

// --- Small inline name form (add / rename a faculty or department) ----------

function NameForm({
  initial = "",
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (name: string, abbreviation: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [abbr, setAbbr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name.trim(), abbr.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="my-2">
      <div className="flex flex-wrap gap-2">
        <input className={`${inputClass} min-w-0 flex-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} maxLength={150} required autoFocus />
        {!initial && (
          <input className={`${inputClass} w-28`} value={abbr} onChange={(e) => setAbbr(e.target.value)} placeholder="Abbr." maxLength={15} />
        )}
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy || !name.trim()} className={primaryButton}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
      <ActionError message={error} />
    </form>
  );
}

// --- Departments of one faculty ---------------------------------------------

function DepartmentList({ base, onCountsChanged }: { base: string; onCountsChanged: () => void }) {
  const { data, loading, error, reload } = useAdminList<{ departments: AdminDepartmentDto[] }>(`${base}/departments`);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (request: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await request();
      reload();
      onCountsChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update.");
    }
  };

  const departments = data?.departments ?? [];
  return (
    <div className="ml-6 border-l border-border pl-4">
      {error && <ActionError message={error} />}
      {loading && !data && <p className="py-1 text-xs text-text-muted">Loading…</p>}
      {data && departments.length === 0 && <p className="py-1 text-xs text-text-muted">No departments yet.</p>}
      <ul>
        {departments.map((d) =>
          renaming === d.id ? (
            <li key={d.id}>
              <NameForm
                initial={d.name}
                placeholder="Department name"
                submitLabel="Rename"
                onCancel={() => setRenaming(null)}
                onSubmit={async (name) => {
                  await adminRequest(`${base}/departments/${d.id}`, "PATCH", { name });
                  setRenaming(null);
                  reload();
                }}
              />
            </li>
          ) : (
            <li key={d.id} className="group flex items-center justify-between gap-2 py-1 text-sm">
              <span className={d.isActive ? "text-text-primary" : "text-text-muted line-through"}>
                {d.name}
                {d.abbreviation && <span className="text-text-muted"> ({d.abbreviation})</span>}
              </span>
              <span className="flex shrink-0 gap-3 opacity-70 group-hover:opacity-100">
                <button type="button" className={linkButton} onClick={() => setRenaming(d.id)}>
                  Rename
                </button>
                {d.isActive ? (
                  <button type="button" className={linkButton} onClick={() => act(() => adminRequest(`${base}/departments/${d.id}`, "DELETE"))}>
                    Remove
                  </button>
                ) : (
                  <button type="button" className={linkButton} onClick={() => act(() => adminRequest(`${base}/departments/${d.id}`, "PATCH", { isActive: true }))}>
                    Restore
                  </button>
                )}
              </span>
            </li>
          ),
        )}
      </ul>
      <ActionError message={actionError} />
      {adding ? (
        <NameForm
          placeholder="Department name"
          submitLabel="Add"
          onCancel={() => setAdding(false)}
          onSubmit={async (name, abbreviation) => {
            await adminRequest(`${base}/departments`, "POST", { name, abbreviation });
            setAdding(false);
            reload();
            onCountsChanged();
          }}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${linkButton} mt-1 inline-flex items-center gap-1`}>
          <FiPlus aria-hidden /> Add department
        </button>
      )}
    </div>
  );
}

// --- Edit university details --------------------------------------------------

function EditUniversityForm({
  university,
  onSaved,
  onCancel,
}: {
  university: AdminUniversityDto;
  onSaved: (u: AdminUniversityDto) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: university.name,
    abbreviation: university.abbreviation,
    state: university.state,
    city: university.city ?? "",
    website: university.website ?? "",
    logoUrl: university.logoUrl ?? "",
    foundingYear: university.foundingYear ? String(university.foundingYear) : "",
    ownership: university.ownership,
    type: university.type,
    affiliationType: university.affiliationType ?? "",
    isActive: university.isActive,
    verificationStatus: university.verificationStatus,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { university: updated } = await adminRequest<{ university: AdminUniversityDto }>(
        `/api/admin/institutions/${university.id}`,
        "PATCH",
        form,
      );
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  };

  const text = (label: string, key: keyof typeof form, props: Record<string, unknown> = {}) => (
    <label className="text-xs text-text-secondary">
      {label}
      <input className={`mt-1 ${inputClass}`} value={String(form[key])} onChange={field(key)} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">{text("Name", "name", { required: true, maxLength: 150 })}</div>
      {text("Abbreviation", "abbreviation", { required: true, maxLength: 15 })}
      <label className="text-xs text-text-secondary">
        State
        <select className={`mt-1 w-full ${selectClass}`} value={form.state} onChange={field("state")}>
          {NIGERIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {text("City", "city", { maxLength: 100 })}
      {text("Website", "website", { type: "url", maxLength: 300, placeholder: "https://" })}
      {text("Logo URL", "logoUrl", { type: "url", maxLength: 500, placeholder: "https://" })}
      {text("Founding year", "foundingYear", { inputMode: "numeric", maxLength: 4 })}
      <label className="text-xs text-text-secondary">
        Ownership
        <select className={`mt-1 w-full ${selectClass}`} value={form.ownership} onChange={field("ownership")}>
          {OWNERSHIPS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-text-secondary">
        Type
        <select className={`mt-1 w-full ${selectClass}`} value={form.type} onChange={field("type")}>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      {text("Affiliation (NUC, NBTE, NCCE)", "affiliationType", { maxLength: 20 })}
      <label className="text-xs text-text-secondary">
        Verification
        <select className={`mt-1 w-full ${selectClass}`} value={form.verificationStatus} onChange={field("verificationStatus")}>
          <option value="unverified">Unverified</option>
          <option value="verified">Verified</option>
          <option value="flagged">Flagged</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-text-primary sm:col-span-2">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
        Active (inactive universities can&apos;t be chosen on profiles)
      </label>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <ActionError message={error} />
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

// --- Selected university panel ------------------------------------------------

function UniversityPanel({
  university,
  onUpdated,
}: {
  university: AdminUniversityDto;
  onUpdated: (u?: AdminUniversityDto) => void;
}) {
  const base = `/api/admin/institutions/${university.id}`;
  const { data, loading, error, reload } = useAdminList<{ faculties: AdminFacultyDto[] }>(`${base}/faculties`);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const countsChanged = () => {
    reload();
    onUpdated();
  };
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const act = async (request: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await request();
      countsChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update.");
    }
  };

  const u = university;
  const faculties = data?.faculties ?? [];
  return (
    <section className={`${cardClass} space-y-5`} aria-label={u.name}>
      {editing ? (
        <EditUniversityForm
          university={u}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
          }}
        />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {u.abbreviation} — {u.name}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {u.ownership} {u.type} · {u.state}
              {u.city && ` · ${u.city}`}
              {u.foundingYear && ` · est. ${u.foundingYear}`}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {u.verificationStatus}
              {!u.isActive && " · inactive"}
              {u.website && (
                <>
                  {" · "}
                  <a href={u.website} target="_blank" rel="noreferrer" className="underline">
                    website
                  </a>
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>
            Edit details
          </button>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Faculties ({u.totalFaculties}) · Departments ({u.totalDepartments})
          </h3>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className={`${secondaryButton} inline-flex items-center gap-1`}>
              <FiPlus aria-hidden /> Add faculty
            </button>
          )}
        </div>
        {adding && (
          <NameForm
            placeholder="Faculty name, e.g. Faculty of Engineering"
            submitLabel="Add"
            onCancel={() => setAdding(false)}
            onSubmit={async (name, abbreviation) => {
              await adminRequest(`${base}/faculties`, "POST", { name, abbreviation });
              setAdding(false);
              countsChanged();
            }}
          />
        )}
        {error && <ActionError message={error} />}
        {loading && !data && <p className="text-sm text-text-muted">Loading faculties…</p>}
        {data && faculties.length === 0 && <p className="text-sm text-text-muted">No faculties yet.</p>}
        <ul className="divide-y divide-border">
          {faculties.map((f) => (
            <li key={f.id} className="py-2">
              {renaming === f.id ? (
                <NameForm
                  initial={f.name}
                  placeholder="Faculty name"
                  submitLabel="Rename"
                  onCancel={() => setRenaming(null)}
                  onSubmit={async (name) => {
                    await adminRequest(`${base}/faculties/${f.id}`, "PATCH", { name });
                    setRenaming(null);
                    reload();
                  }}
                />
              ) : (
                <div className="group flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(f.id)}
                    aria-expanded={open.has(f.id)}
                    className="flex min-w-0 items-center gap-1.5 text-left text-sm"
                  >
                    {open.has(f.id) ? <FiChevronDown aria-hidden /> : <FiChevronRight aria-hidden />}
                    <span className={f.isActive ? "font-medium text-text-primary" : "text-text-muted line-through"}>
                      {f.name}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">({f.totalDepartments} depts)</span>
                  </button>
                  <span className="flex shrink-0 gap-3 opacity-70 group-hover:opacity-100">
                    <button type="button" className={linkButton} onClick={() => setRenaming(f.id)}>
                      Rename
                    </button>
                    {f.isActive ? (
                      <button type="button" className={linkButton} onClick={() => act(() => adminRequest(`${base}/faculties/${f.id}`, "DELETE"))}>
                        Remove
                      </button>
                    ) : (
                      <button type="button" className={linkButton} onClick={() => act(() => adminRequest(`${base}/faculties/${f.id}`, "PATCH", { isActive: true }))}>
                        Restore
                      </button>
                    )}
                  </span>
                </div>
              )}
              {open.has(f.id) && <DepartmentList base={`${base}/faculties/${f.id}`} onCountsChanged={countsChanged} />}
            </li>
          ))}
        </ul>
        <ActionError message={actionError} />
      </div>
    </section>
  );
}

// --- Add university modal -----------------------------------------------------

function AddUniversityModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: AdminUniversityDto) => void }) {
  const [form, setForm] = useState({
    name: "",
    abbreviation: "",
    state: "",
    ownership: "",
    type: "University",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { university } = await adminRequest<{ university: AdminUniversityDto }>(
        "/api/admin/institutions",
        "POST",
        form,
      );
      onAdded(university);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the university.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Add university" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-xs text-text-secondary">
        <label className="block">
          Name
          <input className={`mt-1 ${inputClass}`} value={form.name} onChange={field("name")} maxLength={150} required />
        </label>
        <label className="block">
          Abbreviation
          <input className={`mt-1 ${inputClass}`} value={form.abbreviation} onChange={field("abbreviation")} maxLength={15} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            State
            <select className={`mt-1 w-full ${selectClass}`} value={form.state} onChange={field("state")} required>
              <option value="">Choose…</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            Ownership
            <select className={`mt-1 w-full ${selectClass}`} value={form.ownership} onChange={field("ownership")} required>
              <option value="">Choose…</option>
              {OWNERSHIPS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          Type
          <select className={`mt-1 w-full ${selectClass}`} value={form.type} onChange={field("type")}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Website (optional)
          <input className={`mt-1 ${inputClass}`} type="url" value={form.website} onChange={field("website")} placeholder="https://" />
        </label>
        <ModalActions
          onCancel={onClose}
          confirmLabel="Add university"
          confirmClass="bg-primary hover:bg-primary/90"
          disabled={!form.name.trim() || !form.abbreviation.trim() || !form.state || !form.ownership}
          busy={busy}
          error={error}
        />
      </form>
    </Modal>
  );
}

// --- Page -----------------------------------------------------------------------

export function InstitutionsAdmin() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUniversityDto | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({ page: String(page) });
  if (debouncedSearch) query.set("search", debouncedSearch);
  const { data, loading, error, reload, patch } = useAdminList<AdminUniversitiesResponse>(
    `/api/admin/institutions?${query}`,
  );
  const universities = data?.universities ?? [];
  // The list's copy is fresher (counts) once it reloads
  const current = selected ? (universities.find((u) => u.id === selected.id) ?? selected) : null;

  return (
    <AdminPageShell
      title="Institutions"
      subtitle={data ? `${data.total.toLocaleString()} universities` : undefined}
      loading={loading}
      onRefresh={reload}
      actions={
        <button type="button" onClick={() => setAddOpen(true)} className={`${primaryButton} inline-flex items-center gap-1`}>
          <FiPlus aria-hidden /> Add university
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <input
            type="search"
            className={`mb-3 ${inputClass}`}
            placeholder="Search name or abbreviation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search universities"
          />
          <ListState loading={loading} error={error} empty={universities.length === 0} emptyText="No universities match.">
            <ul className="space-y-2">
              {universities.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(u)}
                    aria-current={current?.id === u.id}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      current?.id === u.id ? "border-primary bg-primary/5" : "border-border bg-surface-raised hover:border-border-strong"
                    }`}
                  >
                    <p className={`text-sm font-medium ${u.isActive ? "text-text-primary" : "text-text-muted line-through"}`}>
                      {u.name} ({u.abbreviation})
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {u.ownership} · {u.state} · {u.totalFaculties} faculties · {u.totalDepartments} depts
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </ListState>
          {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {current ? (
            <UniversityPanel
              key={current.id}
              university={current}
              onUpdated={(updated) => {
                if (updated) {
                  setSelected(updated);
                  patch((d) => ({ ...d, universities: d.universities.map((u) => (u.id === updated.id ? updated : u)) }));
                } else {
                  reload();
                }
              }}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-muted">
              Choose a university to manage its faculties and departments.
            </p>
          )}
        </div>
      </div>

      {addOpen && (
        <AddUniversityModal
          onClose={() => setAddOpen(false)}
          onAdded={(u) => {
            setAddOpen(false);
            setSelected(u);
            reload();
          }}
        />
      )}
    </AdminPageShell>
  );
}
