// components/admin/MailAdmin.tsx
// /admin/mail: write to one user (sent through ZeptoMail by
// POST /api/admin/mail) with a live preview of the exact email, plus the log
// of everything sent. ?to=<upid> preselects a recipient (the "Email" button
// on /admin/users).
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AdminSentMailDto, AdminSentMailResponse, AdminUserDto, AdminUsersResponse } from "@/types/admin";
import { STAFF_MESSAGE_LIMITS, renderStaffMessage } from "@/lib/emailLayout";
import { Modal, ModalActions } from "./ReviewModals";
import { timeAgo } from "./reviewShared";
import {
  AdminPageShell,
  ListState,
  Pager,
  adminRequest,
  cardClass,
  inputClass,
  primaryButton,
  secondaryButton,
  useAdminList,
} from "./adminUi";

const SEARCH_DEBOUNCE_MS = 300;

type Recipient = Pick<AdminUserDto, "id" | "upid" | "fullName" | "username" | "email" | "isVerified" | "isSuspended">;

const newRequestKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

function RecipientPicker({ value, onChange }: { value: Recipient | null; onChange: (r: Recipient | null) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Recipient[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ search: term, status: "all", limit: "8" });
      fetch(`/api/admin/users?${query}`, { signal: controller.signal, cache: "no-store" })
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as (AdminUsersResponse & { message?: string }) | null;
          if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
          setResults(data?.users ?? []);
          setError(null);
        })
        .catch((err: Error) => {
          if (err.name !== "AbortError") setError(err.message || "Search failed.");
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  if (value) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <div className="text-sm">
          <p className="font-semibold text-text-primary">
            {value.fullName} <span className="font-normal text-text-secondary">(@{value.username || value.upid})</span>
          </p>
          <p className="text-xs text-text-muted">
            {value.email || "address unreadable"}
            {!value.isVerified && " · email not verified"}
            {value.isSuspended && " · suspended"}
          </p>
        </div>
        <button type="button" className={secondaryButton} onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  const showResults = search.trim().length >= 2;
  return (
    <div>
      <input
        type="search"
        className={inputClass}
        placeholder="Name, username, upid or full email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Find a recipient"
      />
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {showResults && !error && (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-surface">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">No users match.</li>
          ) : (
            results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-raised"
                  onClick={() => {
                    onChange(u);
                    setSearch("");
                  }}
                >
                  <span className="font-medium text-text-primary">{u.fullName}</span>{" "}
                  <span className="text-text-secondary">(@{u.username || u.upid})</span>
                  <span className="block text-xs text-text-muted">{u.email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: AdminSentMailDto["status"] }) {
  const styles = {
    sent: "bg-green-500/10 text-green-700 dark:text-green-400",
    failed: "bg-red-500/10 text-red-700 dark:text-red-400",
    sending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  } as const;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {status === "sent" ? "Sent" : status === "failed" ? "Failed" : "Sending"}
    </span>
  );
}

export function MailAdmin({ senderName, initialUpid }: { senderName: string; initialUpid?: string }) {
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // One key per message: a retry after a network error can't send it twice
  const [requestKey, setRequestKey] = useState(newRequestKey);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const log = useAdminList<AdminSentMailResponse>(`/api/admin/mail?page=${page}`);

  // ?to=<upid> from the users page
  useEffect(() => {
    if (!initialUpid) return;
    const query = new URLSearchParams({ search: initialUpid, status: "all", limit: "5" });
    adminRequest<AdminUsersResponse>(`/api/admin/users?${query}`)
      .then((data) => {
        const match = data.users.find((u) => u.upid === initialUpid);
        if (match) setRecipient((current) => current ?? match);
      })
      .catch(() => {});
  }, [initialUpid]);

  const trimmedSubject = subject.replace(/\s+/g, " ").trim();
  const trimmedBody = body.trim();
  const ready =
    !!recipient &&
    trimmedSubject.length > 0 &&
    trimmedSubject.length <= STAFF_MESSAGE_LIMITS.subject &&
    trimmedBody.length > 0 &&
    trimmedBody.length <= STAFF_MESSAGE_LIMITS.body;

  const preview = useMemo(
    () =>
      renderStaffMessage({
        recipientName: recipient?.fullName ?? "Student",
        senderName,
        subject: trimmedSubject || "(no subject)",
        body: trimmedBody || "Your message will appear here.",
      }).html,
    [recipient, senderName, trimmedSubject, trimmedBody],
  );

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!recipient || !ready) return;
    setBusy(true);
    setSendError(null);
    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: JSON.stringify({ userId: recipient.id, subject: trimmedSubject, body: trimmedBody }),
      });
      const data = (await res.json().catch(() => null)) as { mail?: AdminSentMailDto; message?: string } | null;
      if (data?.mail?.status === "sent") {
        setConfirming(false);
        setNotice(`Sent to ${data.mail.to.name}.`);
        setRecipient(null);
        setSubject("");
        setBody("");
        setRequestKey(newRequestKey());
        setPage(1);
        log.reload();
      } else if (data?.mail?.status === "failed") {
        // Logged as failed; a new key lets the admin try again
        setRequestKey(newRequestKey());
        setSendError(`The email provider refused it: ${data.mail.error ?? "unknown error"}. You can try again.`);
        log.reload();
      } else {
        setSendError(data?.message ?? `Could not send (HTTP ${res.status}).`);
      }
    } catch {
      setSendError("Network error. Check your connection and try again; it won't be sent twice.");
    } finally {
      setBusy(false);
    }
  };

  const mails = log.data?.mails ?? [];
  return (
    <AdminPageShell
      title="Mail"
      subtitle="Write to one user. It's sent from no-reply@ and replies go to support@."
      loading={log.loading}
      onRefresh={log.reload}
    >
      {notice && (
        <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {notice}
          <button type="button" className="text-xs underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <form
          className={`${cardClass} space-y-4`}
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) {
              setSendError(null);
              setConfirming(true);
            }
          }}
        >
          <h2 className="font-semibold text-text-primary">New message</h2>
          <div>
            <p className="mb-1 text-sm font-medium text-text-secondary">To</p>
            <RecipientPicker value={recipient} onChange={setRecipient} />
          </div>
          <label className="block text-sm font-medium text-text-secondary">
            Subject
            <input
              className={`mt-1 ${inputClass}`}
              value={subject}
              maxLength={STAFF_MESSAGE_LIMITS.subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="About your submission"
            />
          </label>
          <label className="block text-sm font-medium text-text-secondary">
            Message
            <textarea
              className={`mt-1 min-h-48 ${inputClass}`}
              value={body}
              maxLength={STAFF_MESSAGE_LIMITS.body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Plain text. Leave a blank line between paragraphs; links become clickable.\nThe greeting and your sign-off are added for you."}
            />
            <span className="mt-1 block text-right text-xs text-text-muted">
              {body.length.toLocaleString()} / {STAFF_MESSAGE_LIMITS.body.toLocaleString()}
            </span>
          </label>
          <div className="flex justify-end">
            <button type="submit" className={primaryButton} disabled={!ready}>
              Review and send
            </button>
          </div>
        </form>

        <div className={cardClass}>
          <h2 className="mb-3 font-semibold text-text-primary">Preview</h2>
          <iframe
            title="Email preview"
            srcDoc={preview}
            sandbox=""
            className="h-[520px] w-full rounded-lg border border-border bg-white"
          />
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-text-primary">
        Sent {log.data ? <span className="text-sm font-normal text-text-secondary">({log.data.total.toLocaleString()})</span> : null}
      </h2>
      <ListState loading={log.loading} error={log.error} empty={mails.length === 0} emptyText="Nothing sent yet.">
        <ul className="space-y-3">
          {mails.map((m) => (
            <li key={m.id} className={cardClass}>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={m.status} />
                <p className="font-semibold text-text-primary">{m.subject}</p>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                To {m.to.name} (@{m.to.upid}, {m.to.email}) · from {m.sentBy.name} · {timeAgo(m.createdAt)}
              </p>
              {m.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{m.error}</p>}
              <button
                type="button"
                className="mt-2 text-xs font-medium text-primary hover:underline"
                onClick={() => setOpen(open === m.id ? null : m.id)}
                aria-expanded={open === m.id}
              >
                {open === m.id ? "Hide message" : "Show message"}
              </button>
              {open === m.id && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm text-text-primary">{m.body}</p>
              )}
            </li>
          ))}
        </ul>
      </ListState>
      {log.data && <Pager page={log.data.page} totalPages={log.data.totalPages} onPage={setPage} />}

      {confirming && recipient && (
        <Modal title="Send this email?" onClose={() => !busy && setConfirming(false)}>
          <form onSubmit={send} className="space-y-2 text-sm text-text-secondary">
            <p>
              To <strong className="text-text-primary">{recipient.fullName}</strong> ({recipient.email || "@" + recipient.upid})
            </p>
            <p>
              Subject: <strong className="text-text-primary">{trimmedSubject}</strong>
            </p>
            <p>It can&apos;t be unsent.</p>
            <ModalActions
              onCancel={() => setConfirming(false)}
              confirmLabel="Send"
              confirmClass="bg-primary hover:bg-primary/90"
              disabled={false}
              busy={busy}
              error={sendError}
            />
          </form>
        </Modal>
      )}
    </AdminPageShell>
  );
}
