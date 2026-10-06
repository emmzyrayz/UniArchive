// components/admin/UsersAdmin.tsx
// /admin/users: search and filter users, change roles, suspend / reactivate,
// and set violation counts.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { RoleBadge, ROLE_LABELS } from "@/components/profile/profileUi";
import { ASSIGNABLE_ROLES, PROTECTED_ROLES, outranks } from "@/lib/constants/roles";
import type { UserRole } from "@/types/roles";
import type { AdminUserDto, AdminUsersResponse } from "@/types/admin";
import { Modal, ModalActions, fieldClass } from "./ReviewModals";
import { timeAgo } from "./reviewShared";
import {
  AdminPageShell,
  ListState,
  Pager,
  adminRequest,
  cardClass,
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
  selectClass,
  useAdminList,
} from "./adminUi";

type Status = "active" | "suspended" | "all";
type Sort = "newest" | "oldest" | "name";
type Dialog = { kind: "role" | "suspend" | "reactivate" | "violations"; user: AdminUserDto } | null;

const SEARCH_DEBOUNCE_MS = 300;

export interface UsersViewer {
  userId: string;
  role: UserRole;
  canAssignRoles: boolean;
  canMail: boolean;
}

function DecisionDialog({
  dialog,
  viewer,
  onClose,
  onDone,
}: {
  dialog: NonNullable<Dialog>;
  viewer: UsersViewer;
  onClose: () => void;
  onDone: (user: AdminUserDto) => void;
}) {
  const { kind, user } = dialog;
  const roleChoices = ASSIGNABLE_ROLES.filter((r) => outranks(viewer.role, r));
  const [role, setRole] = useState<UserRole>(user.role);
  const [reason, setReason] = useState("");
  const [violations, setViolations] = useState(String(user.violationCount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const body =
    kind === "role"
      ? { role }
      : kind === "suspend"
        ? { isSuspended: true, suspensionReason: reason.trim() }
        : kind === "reactivate"
          ? { isSuspended: false }
          : { violationCount: Number(violations) };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user: updated } = await adminRequest<{ user: AdminUserDto }>(
        `/api/admin/users/${user.id}`,
        "PATCH",
        body,
      );
      onDone(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    role: `Change role for @${user.upid}`,
    suspend: `Suspend @${user.upid}`,
    reactivate: `Reactivate @${user.upid}`,
    violations: `Violations for @${user.upid}`,
  };
  const violationsValid = /^\d{1,4}$/.test(violations) && Number(violations) <= 1000;

  return (
    <Modal title={titles[kind]} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm text-text-secondary">
        {kind === "role" && (
          <>
            <p>
              Current role: <RoleBadge role={user.role} />
            </p>
            <label className="block">
              New role
              <select className={`mt-1 w-full ${selectClass}`} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {roleChoices.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-text-muted">
              They&apos;ll be signed out and get the new role when they sign in again. Webmaster
              and dev can only be set in the database.
            </p>
          </>
        )}
        {kind === "suspend" && (
          <>
            <p>They&apos;ll be signed out everywhere and can&apos;t sign in until reactivated.</p>
            <label className="block">
              Reason
              <textarea
                className={`mt-1 ${fieldClass}`}
                rows={3}
                maxLength={500}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </>
        )}
        {kind === "reactivate" && (
          <p>
            Let @{user.upid} sign in again?
            {user.suspensionReason && <> They were suspended for: &ldquo;{user.suspensionReason}&rdquo;</>}
          </p>
        )}
        {kind === "violations" && (
          <label className="block">
            Active violations (any number above 0 blocks role applications)
            <input
              type="number"
              min={0}
              max={1000}
              className={`mt-1 ${inputClass}`}
              value={violations}
              onChange={(e) => setViolations(e.target.value)}
            />
          </label>
        )}
        <ModalActions
          onCancel={onClose}
          confirmLabel={
            kind === "role" ? "Change role" : kind === "suspend" ? "Suspend" : kind === "reactivate" ? "Reactivate" : "Save"
          }
          confirmClass={kind === "suspend" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}
          disabled={
            (kind === "role" && role === user.role) ||
            (kind === "suspend" && !reason.trim()) ||
            (kind === "violations" && !violationsValid)
          }
          busy={busy}
          error={error}
        />
      </form>
    </Modal>
  );
}

export function UsersAdmin({ viewer }: { viewer: UsersViewer }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({ status, sort, page: String(page) });
  if (debouncedSearch) query.set("search", debouncedSearch);
  if (role) query.set("role", role);
  const { data, loading, error, reload, patch } = useAdminList<AdminUsersResponse>(`/api/admin/users?${query}`);

  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const onDone = (updated: AdminUserDto) => {
    setDialog(null);
    const leavesView =
      (status === "active" && updated.isSuspended) ||
      (status === "suspended" && !updated.isSuspended) ||
      (!!role && updated.role !== role);
    if (leavesView) reload();
    else patch((d) => ({ ...d, users: d.users.map((u) => (u.id === updated.id ? updated : u)) }));
  };

  const users = data?.users ?? [];
  return (
    <AdminPageShell
      title="Users"
      subtitle={data ? `${data.total.toLocaleString()} matching` : undefined}
      loading={loading}
      onRefresh={reload}
    >
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          className={inputClass}
          placeholder="Name, username, upid or full email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <select className={selectClass} value={role} onChange={(e) => filter(() => setRole(e.target.value))} aria-label="Role">
          <option value="">All roles</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select className={selectClass} value={status} onChange={(e) => filter(() => setStatus(e.target.value as Status))} aria-label="Status">
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="all">All</option>
        </select>
        <select className={selectClass} value={sort} onChange={(e) => filter(() => setSort(e.target.value as Sort))} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
        </select>
      </div>

      <ListState loading={loading} error={error} empty={users.length === 0} emptyText="No users match.">
        <ul className="space-y-3">
          {users.map((u) => {
            const manageable =
              u.id !== viewer.userId && !PROTECTED_ROLES.includes(u.role) && outranks(viewer.role, u.role);
            return (
              <li key={u.id} className={cardClass}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-primary">
                    {u.fullName} <span className="font-normal text-text-secondary">(@{u.username || u.upid})</span>
                  </p>
                  <RoleBadge role={u.role} />
                  {u.isSuspended && (
                    <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                      Suspended
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {[u.universityName, u.departmentName].filter(Boolean).join(" · ") || "No school set"} ·{" "}
                  {u.verifiedMaterialCount} verified material{u.verifiedMaterialCount === 1 ? "" : "s"} ·{" "}
                  {u.profileCompletion}% profile
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {u.email} · joined {timeAgo(u.createdAt)} · {u.isVerified ? "email verified" : "email not verified"}
                  {u.violationCount > 0 && (
                    <span className="font-semibold text-red-600 dark:text-red-400"> · {u.violationCount} violations</span>
                  )}
                </p>
                {u.isSuspended && u.suspensionReason && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-400">Reason: {u.suspensionReason}</p>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {/* Public profiles aren't built yet; the link is ready for them */}
                  <Link href={`/profile/${encodeURIComponent(u.upid)}`} className={secondaryButton}>
                    View profile
                  </Link>
                  {viewer.canMail && (
                    <Link href={`/admin/mail?to=${encodeURIComponent(u.upid)}`} className={secondaryButton}>
                      Email
                    </Link>
                  )}
                  {manageable && (
                    <>
                      <button type="button" onClick={() => setDialog({ kind: "violations", user: u })} className={secondaryButton}>
                        Violations
                      </button>
                      {viewer.canAssignRoles && (
                        <button type="button" onClick={() => setDialog({ kind: "role", user: u })} className={secondaryButton}>
                          Change role
                        </button>
                      )}
                      {u.isSuspended ? (
                        <button type="button" onClick={() => setDialog({ kind: "reactivate", user: u })} className={primaryButton}>
                          Reactivate
                        </button>
                      ) : (
                        <button type="button" onClick={() => setDialog({ kind: "suspend", user: u })} className={dangerButton}>
                          Suspend
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </ListState>
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}

      {dialog && (
        <DecisionDialog dialog={dialog} viewer={viewer} onClose={() => setDialog(null)} onDone={onDone} />
      )}
    </AdminPageShell>
  );
}
