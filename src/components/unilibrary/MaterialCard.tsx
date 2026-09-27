// components/unilibrary/MaterialCard.tsx
// One verified material in the UniLibrary feed. Signed-in readers open the
// backing Book in the reader; everyone else gets a sign-in prompt.
"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiEye, FiX } from "react-icons/fi";
import { formatFileSize } from "@/assets/data/libraryData";
import { timeAgo } from "@/components/admin/reviewShared";
import type { MaterialSummary } from "@/types/unilibrary";
import { BADGE_CLASS, categoryBadge } from "./materialLabels";

interface MaterialCardProps {
  material: MaterialSummary;
  isAuthenticated: boolean;
  /** Called as a signed-in user opens the material (counts the view). */
  onRead: (materialId: string) => void;
}

function SignInPrompt({ from, onClose }: { from: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const next = encodeURIComponent(from);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-border bg-surface-raised p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p id={titleId} className="text-sm font-medium text-text-primary">
          Sign in to read this material.
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-text-muted hover:text-text-primary"
        >
          <FiX size={14} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/auth?view=signin&from=${next}`}
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-primary/90"
        >
          Sign In
        </Link>
        <Link
          href={`/auth?view=signup&from=${next}`}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-center text-xs font-medium text-text-primary hover:bg-surface"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

export function MaterialCard({ material, isAuthenticated, onRead }: MaterialCardProps) {
  const [promptOpen, setPromptOpen] = useState(false);
  const badge = categoryBadge(material.category, material.subcategory);
  const readHref = `/read/${material.bookId}`;

  const heading = material.courseCode
    ? `${material.courseCode} — ${material.title}`
    : material.title;
  const period = [material.academicYear, material.semester && `${material.semester} Semester`]
    .filter(Boolean)
    .join(" ");
  const institution = [
    material.universityAbbr || material.universityName,
    material.facultyName,
    material.departmentName,
    material.level,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${BADGE_CLASS} ${badge.className}`}>{badge.label}</span>
          {material.hasTypedContent && (
            <span
              className={`${BADGE_CLASS} border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300`}
            >
              📝 {material.category === "EXAMS" ? "Typed answers" : "Typed notes"}
            </span>
          )}
        </div>
        {material.verificationTier === "tier2" ? (
          <span
            className={`${BADGE_CLASS} border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300`}
            title="Endorsed by a lecturer"
          >
            ⭐ Endorsed
          </span>
        ) : (
          <span
            className={`${BADGE_CLASS} border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300`}
            title="Checked by a UniArchive reviewer"
          >
            ✓ Verified
          </span>
        )}
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-text-primary">{heading}</h3>
      {period && <p className="mt-0.5 text-xs text-text-secondary">{period}</p>}

      {material.description && (
        <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {material.description}
        </p>
      )}

      {institution && (
        <p className="mt-3 truncate text-xs text-neutral-500" title={institution}>
          {institution}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
        <span className="inline-flex items-center gap-1">
          <FiEye size={12} aria-hidden />
          {material.viewCount.toLocaleString()} {material.viewCount === 1 ? "view" : "views"}
        </span>
        {!!material.pageCount && <span>{material.pageCount} pages</span>}
        <span>{formatFileSize(material.fileSize)}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Uploaded by <span className="text-text-secondary">@{material.submittedByUpid}</span> ·{" "}
        {timeAgo(material.createdAt)}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {material.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-text-secondary dark:bg-neutral-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="relative shrink-0">
          {isAuthenticated ? (
            <Link
              href={readHref}
              onClick={() => onRead(material._id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Read <FiArrowRight size={14} aria-hidden />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPromptOpen((open) => !open)}
                aria-expanded={promptOpen}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Read <FiArrowRight size={14} aria-hidden />
              </button>
              {promptOpen && (
                <SignInPrompt from={readHref} onClose={() => setPromptOpen(false)} />
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
