// components/admin/SuggestionsAdmin.tsx
// /admin/suggestions: students' school suggestions, with approve (create
// what's missing), mark as duplicate and reject.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import UniversityCombobox, { type UniversityOption } from "@/components/profile/UniversityCombobox";
import { NIGERIAN_STATES } from "@/lib/constants/nigerianStates";
import type { AdminSuggestionDto, AdminSuggestionsResponse, UniversityPreview } from "@/types/admin";
import { Modal, ModalActions, fieldClass } from "./ReviewModals";
import { timeAgo } from "./reviewShared";
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

type Tab = "pending" | "possible_duplicate" | "all";
type Dialog = { kind: "approve" | "duplicate" | "reject"; suggestion: AdminSuggestionDto } | null;

interface DecisionResult {
  usersUpdated: number;
  linkedApproved: number;
  linkedRequeued: number;
  requeued?: boolean;
}

const SCOPE_LABELS: Record<AdminSuggestionDto["scope"], string> = {
  full: "Full (new university)",
  faculty_department: "New faculty and department",
  department_only: "New department",
};

const DECIDABLE = ["pending", "possible_duplicate"];

function describe(result: DecisionResult): string {
  const parts = [`${result.usersUpdated} profile${result.usersUpdated === 1 ? "" : "s"} updated`];
  if (result.linkedApproved) parts.push(`${result.linkedApproved} linked suggestion(s) approved too`);
  if (result.linkedRequeued) {
    parts.push(`${result.linkedRequeued} linked suggestion(s) need their own faculty/department and are back in the queue`);
  }
  if (result.requeued) parts.push("its faculty/department isn't at that university yet, so it's back in the queue narrowed to that");
  return parts.join("; ") + ".";
}

// --- Approve --------------------------------------------------------------------

function ApproveDialog({
  s,
  onClose,
  onDone,
}: {
  s: AdminSuggestionDto;
  onClose: () => void;
  onDone: (result: DecisionResult) => void;
}) {
  const [form, setForm] = useState({
    universityName: s.suggestedUniversityName,
    universityAbbr: s.suggestedUniversityAbbr ?? "",
    universityState: s.suggestedUniversityState ?? "",
    universityOwnership: s.suggestedUniversityOwnership ?? "",
    facultyName: s.suggestedFacultyName,
    departmentName: s.suggestedDepartmentName,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const full = s.scope === "full";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        action: "approve",
        facultyName: form.facultyName,
        departmentName: form.departmentName,
      };
      if (full) {
        Object.assign(body, {
          universityName: form.universityName,
          universityAbbr: form.universityAbbr,
          universityState: form.universityState,
          universityOwnership: form.universityOwnership,
        });
      }
      onDone(await adminRequest<DecisionResult>(`/api/admin/school-suggestions/${s.id}`, "PATCH", body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve.");
      setBusy(false);
    }
  };

  const label = "block text-xs text-text-secondary";
  return (
    <Modal title="Approve school suggestion" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {full ? (
          <>
            <label className={label}>
              University name
              <input className={`mt-1 ${inputClass}`} value={form.universityName} onChange={field("universityName")} maxLength={150} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Abbreviation
                <input className={`mt-1 ${inputClass}`} value={form.universityAbbr} onChange={field("universityAbbr")} maxLength={15} required />
              </label>
              <label className={label}>
                State
                <select className={`mt-1 w-full ${selectClass}`} value={form.universityState} onChange={field("universityState")} required>
                  <option value="">Choose…</option>
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className={label}>
              <legend>Ownership</legend>
              <div className="mt-1 flex gap-4 text-sm text-text-primary">
                {(["Private", "State", "Federal"] as const).map((o) => (
                  <label key={o} className="flex items-center gap-1.5">
                    <input type="radio" name="ownership" value={o} checked={form.universityOwnership === o} onChange={field("universityOwnership")} required />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            University: <strong className="text-text-primary">{s.existingUniversity?.name ?? "—"}</strong>
            {s.scope === "department_only" && (
              <>
                <br />
                Faculty: <strong className="text-text-primary">{s.existingFaculty?.name ?? "—"}</strong>
              </>
            )}
          </p>
        )}
        {s.scope !== "department_only" && (
          <label className={label}>
            Faculty name
            <input className={`mt-1 ${inputClass}`} value={form.facultyName} onChange={field("facultyName")} maxLength={150} required />
          </label>
        )}
        <label className={label}>
          Department name
          <input className={`mt-1 ${inputClass}`} value={form.departmentName} onChange={field("departmentName")} maxLength={150} required />
        </label>
        <p className="text-xs text-text-muted">
          Existing faculties and departments with a matching name are reused, not duplicated.
          {s.affectedUsers > 0 && ` This will update ${s.affectedUsers} user${s.affectedUsers === 1 ? "'s profile" : "s' profiles"} automatically.`}
        </p>
        <ModalActions
          onCancel={onClose}
          confirmLabel={full ? "Approve & create" : "Approve & add"}
          confirmClass="bg-green-600 hover:bg-green-700"
          disabled={false}
          busy={busy}
          error={error}
        />
      </form>
    </Modal>
  );
}

// --- Mark as duplicate ------------------------------------------------------------

function DuplicateDialog({
  s,
  onClose,
  onDone,
}: {
  s: AdminSuggestionDto;
  onClose: () => void;
  onDone: (result: DecisionResult) => void;
}) {
  const initial = s.similarUniversity ?? s.existingUniversity;
  const [university, setUniversity] = useState<{ id: string; name: string } | null>(
    initial ? { id: initial.id, name: initial.name } : null,
  );
  const [faculties, setFaculties] = useState<{ key: string; list: { _id: string; name: string }[] } | null>(null);
  const [facultyId, setFacultyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The chosen university's faculties, to optionally pin the student's one
  useEffect(() => {
    if (!university) return;
    const controller = new AbortController();
    fetch(`/api/institutions/faculties?universityId=${university.id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { faculties: [] }))
      .then((data: { faculties: { _id: string; name: string }[] }) =>
        setFaculties({ key: university.id, list: data.faculties ?? [] }),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [university]);
  const facultyList = university && faculties?.key === university.id ? faculties.list : [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!university) return;
    setBusy(true);
    setError(null);
    try {
      onDone(
        await adminRequest<DecisionResult>(`/api/admin/school-suggestions/${s.id}`, "PATCH", {
          action: "mark_duplicate",
          existingUniversityId: university.id,
          ...(facultyId ? { existingFacultyId: facultyId } : {}),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Mark as duplicate" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-xs text-text-secondary">
        <p className="text-sm">
          Link &ldquo;{s.suggestedUniversityName}&rdquo; to a university that&apos;s already listed. Nothing new is
          created.
        </p>
        <div>
          Existing university
          <div className="mt-1">
            <UniversityCombobox
              value={university}
              onChange={(u: UniversityOption) => {
                setUniversity({ id: u._id, name: u.name });
                setFacultyId("");
              }}
            />
          </div>
        </div>
        {university && (
          <label className="block">
            Their faculty (optional; otherwise matched by name: &ldquo;{s.suggestedFacultyName}&rdquo;)
            <select className={`mt-1 w-full ${selectClass}`} value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
              <option value="">Match by name</option>
              {facultyList.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="text-xs text-text-muted">
          If their faculty or department isn&apos;t at that university yet, the suggestion stays in the queue, narrowed
          to what&apos;s missing.
        </p>
        <ModalActions
          onCancel={onClose}
          confirmLabel="Link to existing"
          confirmClass="bg-primary hover:bg-primary/90"
          disabled={!university}
          busy={busy}
          error={error}
        />
      </form>
    </Modal>
  );
}

// --- Reject -------------------------------------------------------------------------

function RejectDialog({
  s,
  onClose,
  onDone,
}: {
  s: AdminSuggestionDto;
  onClose: () => void;
  onDone: (result: DecisionResult) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(
        await adminRequest<DecisionResult>(`/api/admin/school-suggestions/${s.id}`, "PATCH", {
          action: "reject",
          reviewNote: note.trim(),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Reject suggestion" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm text-text-secondary">
        <label className="block">
          Reason
          <textarea className={`mt-1 ${fieldClass}`} rows={4} maxLength={1000} required value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {s.linkedCount > 0 && (
          <p className="text-xs text-text-muted">
            The {s.linkedCount} linked suggestion{s.linkedCount === 1 ? "" : "s"} from other students go back into the
            queue on their own rather than being rejected with this one.
          </p>
        )}
        <ModalActions
          onCancel={onClose}
          confirmLabel="Reject"
          confirmClass="bg-red-600 hover:bg-red-700"
          disabled={!note.trim()}
          busy={busy}
          error={error}
        />
      </form>
    </Modal>
  );
}

// --- View existing ------------------------------------------------------------------

/**
 * The university a possible duplicate resembles, to compare before deciding,
 * with a one-click "Mark as duplicate" linking to it.
 */
function ExistingUniversityPanel({
  s,
  universityId,
  onClose,
  onDone,
}: {
  s: AdminSuggestionDto;
  universityId: string;
  onClose: () => void;
  onDone: (result: DecisionResult) => void;
}) {
  const { data, loading, error } = useAdminList<UniversityPreview>(
    `/api/admin/institutions/${universityId}/preview`,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const decidable = DECIDABLE.includes(s.status) && s.scope === "full";

  const markDuplicate = async () => {
    setBusy(true);
    setActionError(null);
    try {
      onDone(
        await adminRequest<DecisionResult>(`/api/admin/school-suggestions/${s.id}`, "PATCH", {
          action: "mark_duplicate",
          existingUniversityId: universityId,
        }),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not link.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface p-4 text-sm" role="region" aria-label="Existing university">
      {loading && !data ? (
        <p className="text-text-muted">Loading…</p>
      ) : error || !data ? (
        <p className="text-red-600 dark:text-red-400">{error ?? "Couldn't load that university."}</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-text-primary">
                {data.name} ({data.abbreviation})
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {data.ownership} · {data.state}
                {data.city && `, ${data.city}`} · {data.verificationStatus}
                {!data.isActive && " · inactive"}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {data.totalFaculties} faculties · {data.totalDepartments} departments
              </p>
            </div>
            <button type="button" onClick={onClose} className={secondaryButton}>
              Close
            </button>
          </div>
          {data.faculties.length > 0 && (
            <ul className="mt-3 space-y-0.5 text-xs text-text-secondary">
              {data.faculties.map((f) => (
                <li key={f.id}>
                  {f.name} ({f.totalDepartments} depts)
                </li>
              ))}
              {data.totalFaculties > data.faculties.length && (
                <li className="text-text-muted">+ {data.totalFaculties - data.faculties.length} more…</li>
              )}
            </ul>
          )}
          {decidable && (
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={markDuplicate} disabled={busy} className={primaryButton}>
                {busy ? "Linking…" : `Mark as duplicate of ${data.abbreviation}`}
              </button>
            </div>
          )}
          <ActionError message={actionError} />
        </>
      )}
    </div>
  );
}

// --- Page -----------------------------------------------------------------------

export function SuggestionsAdmin() {
  const [tab, setTab] = useState<Tab>("pending");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The suggestion whose matched university is being previewed
  const [viewing, setViewing] = useState<string | null>(null);

  const query = new URLSearchParams({ status: tab, page: String(page) });
  const { data, loading, error, reload } = useAdminList<AdminSuggestionsResponse>(
    `/api/admin/school-suggestions?${query}`,
  );

  const done = (result: DecisionResult) => {
    setDialog(null);
    setNotice(describe(result));
    reload();
  };

  const suggestions = data?.suggestions ?? [];
  const counts = data?.counts;
  return (
    <AdminPageShell title="School suggestions" subtitle="Universities, faculties and departments students couldn't find." loading={loading} onRefresh={reload}>
      <StatusTabs<Tab>
        tabs={[
          { id: "pending", label: "Pending", count: counts?.pending },
          { id: "possible_duplicate", label: "Possible duplicate", count: counts?.possible_duplicate },
          { id: "all", label: "All" },
        ]}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
      />
      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <ListState loading={loading} error={error} empty={suggestions.length === 0} emptyText="Nothing to review here.">
        <ul className="space-y-3">
          {suggestions.map((s) => {
            const decidable = DECIDABLE.includes(s.status);
            return (
              <li key={s.id} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-text-primary">
                    &ldquo;{s.suggestedUniversityName}&rdquo;
                    {s.suggestedUniversityAbbr && <span className="font-normal text-text-secondary"> ({s.suggestedUniversityAbbr})</span>}
                  </p>
                  {s.adminPriority > 1 && (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      ⬆ Priority {s.adminPriority}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-text-secondary">Faculty: {s.suggestedFacultyName}</p>
                <p className="text-sm text-text-secondary">Department: {s.suggestedDepartmentName}</p>
                <p className="mt-1 text-xs text-text-muted">
                  by @{s.submittedByUpid} · {timeAgo(s.submittedAt)}
                  {s.linkedCount > 0 && ` · ${s.linkedCount} other${s.linkedCount === 1 ? "" : "s"} from the same school`}
                  {[s.suggestedUniversityState, s.suggestedUniversityOwnership].filter(Boolean).length > 0 &&
                    ` · ${[s.suggestedUniversityState, s.suggestedUniversityOwnership].filter(Boolean).join(", ")}`}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  Status: <strong>{s.status.replace(/_/g, " ")}</strong> · Scope: {SCOPE_LABELS[s.scope]}
                  {s.existingUniversity && ` · at ${s.existingUniversity.name}`}
                  {s.existingFaculty && ` / ${s.existingFaculty.name}`}
                </p>
                {s.similarUniversity && (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                      <span>
                        ⚠ Possible duplicate of <strong>{s.similarUniversity.name}</strong> (
                        {s.similarUniversity.abbreviation}) · {s.similarUniversity.score}% match
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewing((v) => (v === s.id ? null : s.id))}
                        aria-expanded={viewing === s.id}
                        className="underline hover:no-underline"
                      >
                        {viewing === s.id ? "Hide existing" : "View existing →"}
                      </button>
                    </div>
                    {viewing === s.id && (
                      <ExistingUniversityPanel
                        s={s}
                        universityId={s.similarUniversity.id}
                        onClose={() => setViewing(null)}
                        onDone={(result) => {
                          setViewing(null);
                          done(result);
                        }}
                      />
                    )}
                  </>
                )}
                {s.reviewNote && !decidable && <p className="mt-2 text-xs text-text-muted">Note: {s.reviewNote}</p>}

                {decidable && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setDialog({ kind: "reject", suggestion: s })} className={dangerButton}>
                      Reject
                    </button>
                    {s.scope === "full" && (
                      <button type="button" onClick={() => setDialog({ kind: "duplicate", suggestion: s })} className={secondaryButton}>
                        Mark as duplicate
                      </button>
                    )}
                    <button type="button" onClick={() => setDialog({ kind: "approve", suggestion: s })} className={primaryButton}>
                      {s.status === "possible_duplicate" ? "Approve anyway" : "Approve"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </ListState>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}

      {dialog?.kind === "approve" && <ApproveDialog s={dialog.suggestion} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "duplicate" && <DuplicateDialog s={dialog.suggestion} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "reject" && <RejectDialog s={dialog.suggestion} onClose={() => setDialog(null)} onDone={done} />}
    </AdminPageShell>
  );
}
