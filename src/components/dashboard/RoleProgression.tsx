// src/components/dashboard/RoleProgression.tsx
// The dashboard's role progression card: progress toward the next role, the
// checklist behind it, and the application flow (apply inline, pending with
// withdraw, approved / rejected outcomes).
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/UI/Buttons";
import { RoleBadge, ROLE_LABELS } from "@/components/profile/profileUi";
import type {
  EligibilityCondition,
  EligibilityResponse,
  RoleApplicationDto,
} from "@/types/roleProgression";
import type { UserRole } from "@/types/roles";

const NOTE_MAX_LENGTH = 1000;
const DISMISSED_KEY = "uniarchive:dismissed-role-application";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; eligibility: EligibilityResponse; application: RoleApplicationDto | null };

const roleLabel = (role: string) => ROLE_LABELS[role as UserRole] ?? role;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

/** The approved application the user already closed, if any (per browser). */
function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(id: string) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, id);
  } catch {
    // Private mode etc.: the banner just shows again next visit
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) throw new Error(data?.message ?? `Request failed (HTTP ${res.status}).`);
  return data as T;
}

/** One checklist line, e.g. "Account age: 45 days (30+ needed)". */
function describe(c: EligibilityCondition): { text: string; href?: string } {
  switch (c.key) {
    case "verifiedMaterials":
      return { text: `Verified materials: ${c.current}/${c.required}` };
    case "accountAge":
      return { text: `Account age: ${c.current} days (${c.required}+ needed)` };
    case "hasPhone":
      return c.met
        ? { text: "Phone number added" }
        : { text: "Add a phone number", href: "/profile/edit" };
    case "noViolations":
      return {
        text: c.met ? "No violations" : `${c.current} active violation${c.current === 1 ? "" : "s"}`,
      };
    case "timeAsCollaborator":
      return { text: `Time as Collaborator: ${c.current}/${c.required} months` };
    case "profileComplete":
      return c.met
        ? { text: "Profile 100% complete" }
        : { text: `Profile completion: ${c.current}% (100% needed)`, href: "/profile/edit" };
    default:
      return { text: c.label };
  }
}

/** What still stands between the user and applying. */
function unlockHint(conditions: EligibilityCondition[]): string {
  const materials = conditions.find((c) => c.key === "verifiedMaterials");
  if (materials && !materials.met) {
    const left = Number(materials.required) - Number(materials.current);
    return `Submit ${left} more verified material${left === 1 ? "" : "s"} to unlock`;
  }
  const unmet = conditions.filter((c) => !c.met).map((c) => describe(c).text.toLowerCase());
  return unmet.length ? `Still needed: ${unmet.join(", ")}` : "";
}

function Banner({ tone, children }: { tone: "green" | "amber" | "red"; children: React.ReactNode }) {
  const tones = {
    green: "border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    red: "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function RoleProgression() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(() => readDismissed());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<EligibilityResponse>("/api/user/eligibility"),
      fetchJson<{ application: RoleApplicationDto | null }>("/api/role-application"),
    ])
      .then(([eligibility, { application }]) => {
        if (!cancelled) setState({ status: "ready", eligibility, application });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load role progression:", error);
        setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => {
    setState({ status: "loading" });
    setReloadKey((k) => k + 1);
  };

  if (state.status === "loading") {
    return <div className="h-48 animate-pulse rounded-xl border border-border bg-surface-raised" />;
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-text-muted">We couldn&apos;t load your role progress.</p>
        <Button onClick={reload}>Retry</Button>
      </div>
    );
  }

  const { eligibility, application } = state;
  const pending = application?.status === "pending" ? application : null;
  const showApproved = application?.status === "approved" && application.id !== dismissedId;
  const showRejected = application?.status === "rejected";
  const autoWithdrawn = application?.status === "withdrawn" && application.autoWithdrawnReason;
  const materials = eligibility.conditions.find((c) => c.key === "verifiedMaterials");

  const apply = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      const { application: created } = await fetchJson<{ application: RoleApplicationDto }>(
        "/api/role-application",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supportingNote: note.trim() || undefined }),
        },
      );
      setState({ status: "ready", eligibility, application: created });
      setFormOpen(false);
      setNote("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not submit your application.");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await fetchJson(`/api/role-application/${id}`, { method: "DELETE" });
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not withdraw.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 rounded-xl border border-border bg-surface-raised p-5"
      aria-labelledby="role-progression-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="role-progression-heading"
          className="text-xs font-semibold uppercase tracking-wide text-text-muted"
        >
          Role progression
        </h3>
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          Current role: <RoleBadge role={eligibility.currentRole} />
        </span>
      </div>

      {showApproved && application && (
        <Banner tone="green">
          <div className="flex items-start justify-between gap-3">
            <p>
              🎉 Congratulations! You are now a{" "}
              <strong>{roleLabel(application.targetRole)}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                writeDismissed(application.id);
                setDismissedId(application.id);
              }}
              className="shrink-0 text-xs font-medium underline"
            >
              Dismiss
            </button>
          </div>
        </Banner>
      )}

      {showRejected && application && (
        <Banner tone="red">
          Your application for {roleLabel(application.targetRole)} was not approved
          {application.reviewNote ? <>: &ldquo;{application.reviewNote}&rdquo;</> : "."} You can
          apply again once you&apos;ve addressed it.
        </Banner>
      )}

      {autoWithdrawn && <Banner tone="amber">{application?.autoWithdrawnReason}</Banner>}

      {!eligibility.nextRole ? (
        <p className="text-sm text-text-secondary">
          {eligibility.message ?? "Your role is managed by admins."}
        </p>
      ) : (
        <>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-text-primary">
                Progress to {roleLabel(eligibility.nextRole)}
              </span>
              {materials && (
                <span className="text-xs text-text-muted">
                  {Math.min(Number(materials.current), Number(materials.required))}/
                  {String(materials.required)} materials
                </span>
              )}
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={eligibility.progressPercent}
              aria-label={`Progress to ${roleLabel(eligibility.nextRole)}`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${eligibility.progressPercent}%` }}
              />
            </div>
          </div>

          <ul className="space-y-1.5 rounded-lg border border-border p-3">
            {eligibility.conditions.map((c) => {
              const { text, href } = describe(c);
              return (
                <li key={c.key} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden
                    className={c.met ? "text-green-600 dark:text-green-400" : "text-text-muted"}
                  >
                    {c.met ? "✓" : "○"}
                  </span>
                  <span className="sr-only">{c.met ? "Done:" : "Not yet:"}</span>
                  {href ? (
                    <Link href={href} className="text-text-primary underline underline-offset-2">
                      {text}
                    </Link>
                  ) : (
                    <span className={c.met ? "text-text-primary" : "text-text-secondary"}>
                      {text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {pending ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-text-secondary">
                Application for {roleLabel(pending.targetRole)} submitted{" "}
                {formatDate(pending.appliedAt)} · awaiting review
              </p>
              <button
                type="button"
                onClick={() => withdraw(pending.id)}
                disabled={busy}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                {busy ? "Withdrawing…" : "Withdraw"}
              </button>
            </div>
          ) : eligibility.eligible ? (
            formOpen ? (
              <form onSubmit={apply} className="space-y-3 rounded-lg border border-border p-4">
                <p className="font-medium text-text-primary">
                  Apply for {roleLabel(eligibility.nextRole)}
                </p>
                <label className="block text-sm text-text-secondary">
                  Supporting note (optional)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={NOTE_MAX_LENGTH}
                    rows={3}
                    placeholder="Tell us about your contributions"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setActionError(null);
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Submit application"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  You&apos;re eligible!
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  {showRejected ? "Apply again" : `Apply for ${roleLabel(eligibility.nextRole)}`}
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-text-muted">{unlockHint(eligibility.conditions)}</p>
          )}
        </>
      )}

      {actionError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}
    </motion.section>
  );
}
