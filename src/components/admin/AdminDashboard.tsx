// components/admin/AdminDashboard.tsx
// /admin and /mod overview: queue and platform counts, refreshed every
// minute, with links to every page this viewer can use in this area.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import type { AdminCounts } from "@/types/admin";
import { cardClass } from "./adminUi";
import { useStaffArea } from "./staffArea";

const REFRESH_MS = 60_000;

export interface AdminViewer {
  canManageUsers: boolean;
  canManageInstitutions: boolean;
  /** "material.ingest": upload and publish platform PDFs */
  canIngest: boolean;
  /** "mail.send_user": write to a user from /admin/mail */
  canMail: boolean;
  /** "mail.broadcast": bulk email through Brevo */
  canBroadcast: boolean;
  /** "survey.manage": surveys and their results */
  canSurveys: boolean;
}

function StatCard({ label, value, href }: { label: string; value?: number; href?: string }) {
  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text-primary">
        {value === undefined ? <span className="text-text-muted">—</span> : value.toLocaleString()}
      </p>
    </>
  );
  return href ? (
    <Link href={href} className={`${cardClass} block transition-shadow hover:shadow-md`}>
      {content}
    </Link>
  ) : (
    <div className={cardClass}>{content}</div>
  );
}

export function AdminDashboard({ viewer }: { viewer: AdminViewer }) {
  const { base, label } = useStaffArea();
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/admin/counts", { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as AdminCounts;
          if (!cancelled) {
            setCounts(data);
            setError(false);
          }
        })
        .catch((e) => {
          console.error("Admin counts failed:", e);
          if (!cancelled) setError(true);
        });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const suggestions =
    counts && counts.pendingSchoolSuggestions + counts.possibleDuplicates;

  const links: { label: string; href: string; count?: number; show: boolean }[] = [
    { label: "Submissions", href: `${base}/submissions`, count: counts?.pendingSubmissions, show: true },
    { label: "Role applications", href: `${base}/role-applications`, count: counts?.pendingRoleApplications, show: true },
    {
      label: "School suggestions",
      href: `${base}/suggestions`,
      count: suggestions ?? undefined,
      show: viewer.canManageInstitutions,
    },
    { label: "Users", href: `${base}/users`, show: viewer.canManageUsers },
    { label: "Mail", href: `${base}/mail`, show: viewer.canMail },
    { label: "Broadcasts", href: `${base}/mail/broadcasts`, show: viewer.canBroadcast },
    { label: "Surveys", href: `${base}/surveys`, show: viewer.canSurveys },
    { label: "Upload materials", href: `${base}/materials/upload`, show: viewer.canIngest },
    {
      label: "Upload queue",
      href: `${base}/materials/queue`,
      count: (counts?.pendingPlatformUploads ?? 0) + (counts?.pendingGifts ?? 0) || undefined,
      show: viewer.canIngest,
    },
    { label: "Materials", href: `${base}/materials`, show: true },
    { label: "Reported comments", href: `${base}/comments`, count: counts?.reportedComments, show: true },
    { label: "Institutions", href: `${base}/institutions`, show: viewer.canManageInstitutions },
  ];

  return (
    <div className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{label} dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {error
              ? "Couldn't refresh the counts. Retrying every minute."
              : "Counts refresh every minute."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pending submissions" value={counts?.pendingSubmissions} href={`${base}/submissions`} />
          <StatCard label="Role applications" value={counts?.pendingRoleApplications} href={`${base}/role-applications`} />
          <StatCard
            label="School suggestions"
            value={suggestions ?? undefined}
            href={viewer.canManageInstitutions ? `${base}/suggestions` : undefined}
          />
          <StatCard label="Total materials" value={counts?.totalMaterials} href={`${base}/materials`} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className={cardClass} aria-labelledby="quick-links">
            <h2 id="quick-links" className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Quick links
            </h2>
            <ul className="divide-y divide-border">
              {links
                .filter((l) => l.show)
                .map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex items-center justify-between py-2.5 text-sm text-text-primary hover:text-primary"
                    >
                      <span>
                        {l.label}
                        {!!l.count && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {l.count}
                          </span>
                        )}
                      </span>
                      <FiChevronRight aria-hidden className="text-text-muted" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>

          <section className={cardClass} aria-labelledby="platform-stats">
            <h2 id="platform-stats" className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Platform stats
            </h2>
            <dl className="divide-y divide-border text-sm">
              {[
                ["Total users", counts?.totalUsers],
                ["New this week", counts?.newUsersThisWeek],
                ["Materials", counts?.totalMaterials],
                ["Institutions", counts?.totalInstitutions],
                ["Submissions in review", counts?.inReviewSubmissions],
                ["Possible duplicate schools", counts?.possibleDuplicates],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between py-2.5">
                  <dt className="text-text-secondary">{label}</dt>
                  <dd className="font-semibold text-text-primary">
                    {value === undefined ? "—" : (value as number).toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
