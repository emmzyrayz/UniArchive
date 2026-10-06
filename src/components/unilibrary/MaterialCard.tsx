// components/unilibrary/MaterialCard.tsx
// One verified material in the UniLibrary feed. "Read"/"Open" goes to the
// material's public page (/materials/[id]: PDF, typed questions, notes).
// Signed-in readers can react; everyone else sees the counts and gets a
// sign-in prompt.
"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowRight, FiChevronDown, FiEye, FiMessageCircle, FiX } from "react-icons/fi";
import { formatFileSize } from "@/assets/data/libraryData";
import { timeAgo } from "@/components/admin/reviewShared";
import { useUser } from "@/context/userContext";
import {
  REACTIONS,
  REACTION_TYPES,
  type ReactionCounts,
  type ReactionType,
} from "@/lib/constants/reactions";
import type { MaterialSummary } from "@/types/unilibrary";
import { BADGE_CLASS, categoryBadge, levelLabel } from "./materialLabels";
import { VerificationBadge } from "./VerificationBadge";
import { CommentSection } from "./CommentSection";
import { UploaderByline } from "./UploaderByline";

interface MaterialCardProps {
  material: MaterialSummary;
  isAuthenticated: boolean;
  /** Called as the material is opened (counts the view). */
  onRead: (materialId: string) => void;
  /** The viewer's reaction: undefined while unknown, null for none */
  userReaction?: ReactionType | null;
}

function SignInPrompt({
  from,
  onClose,
  message = "Sign in to read this material.",
}: {
  from: string;
  onClose: () => void;
  message?: string;
}) {
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
          {message}
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

interface ReactionState {
  reactions: ReactionCounts;
  reactionCount: number;
  userReaction: ReactionType | null;
}

/** What a click does, applied locally before the server confirms. */
function applyReaction(state: ReactionState, type: ReactionType): ReactionState {
  const reactions = { ...state.reactions };
  let { reactionCount } = state;
  let userReaction: ReactionType | null;
  if (state.userReaction === type) {
    reactions[type] -= 1;
    reactionCount -= 1;
    userReaction = null;
  } else if (state.userReaction) {
    reactions[state.userReaction] -= 1;
    reactions[type] += 1;
    userReaction = type;
  } else {
    reactions[type] += 1;
    reactionCount += 1;
    userReaction = type;
  }
  for (const t of REACTION_TYPES) reactions[t] = Math.max(0, reactions[t]);
  return { reactions, reactionCount: Math.max(0, reactionCount), userReaction };
}

/**
 * Helpful / Excellent / Accurate. Signed-in readers toggle them (updated
 * immediately, settled to the server's totals, reverted on error); signed-out
 * visitors see the counts and a sign-in prompt; on your own material the
 * counts are shown read-only.
 */
function ReactionBar({
  material,
  userReaction,
  isAuthenticated,
}: {
  material: MaterialSummary;
  userReaction?: ReactionType | null;
  isAuthenticated: boolean;
}) {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const [local, setLocal] = useState<ReactionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const isOwn = !!userProfile?.upid && userProfile.upid === material.submittedByUpid;
  // Until the viewer reacts here, show what the feed loaded
  const shown: ReactionState = local ?? {
    reactions: material.reactions,
    reactionCount: material.reactionCount,
    userReaction: userReaction ?? null,
  };

  const react = async (type: ReactionType) => {
    if (!isAuthenticated) {
      setPromptOpen(true);
      return;
    }
    if (busy) return;
    const before = local;
    setLocal(applyReaction(shown, type));
    setBusy(true);
    try {
      const res = await fetch(`/api/materials/${material._id}/react`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType: type }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        reactionType: ReactionType | null;
        reactions: ReactionCounts;
        reactionCount: number;
      };
      setLocal({ reactions: data.reactions, reactionCount: data.reactionCount, userReaction: data.reactionType });
    } catch (error) {
      console.warn("Reaction failed:", error);
      setLocal(before);
    } finally {
      setBusy(false);
    }
  };

  const chip = "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium";

  if (isOwn) {
    if (shown.reactionCount === 0) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-700" aria-label="Reactions to your material">
        {REACTION_TYPES.filter((t) => shown.reactions[t] > 0).map((t) => (
          <span key={t} className={`${chip} bg-neutral-100 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-400`}>
            {REACTIONS[t].emoji} {REACTIONS[t].label} <span className="font-semibold">{shown.reactions[t]}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="relative mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-700">
      {REACTION_TYPES.map((t) => {
        const active = shown.userReaction === t;
        const count = shown.reactions[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => react(t)}
            disabled={busy}
            aria-pressed={isAuthenticated ? active : undefined}
            title={REACTIONS[t].meaning}
            className={`${chip} border transition-colors disabled:cursor-wait ${
              active
                ? "border-primary/30 bg-primary/15 text-primary"
                : "border-transparent bg-neutral-100 text-neutral-600 hover:bg-primary/10 hover:text-primary dark:bg-neutral-700/50 dark:text-neutral-400"
            }`}
          >
            <span aria-hidden>{REACTIONS[t].emoji}</span>
            <span>{REACTIONS[t].label}</span>
            {count > 0 && <span className="font-semibold">{count}</span>}
          </button>
        );
      })}
      {promptOpen && (
        <SignInPrompt
          from={pathname}
          message="Sign in to react to this material."
          onClose={() => setPromptOpen(false)}
        />
      )}
    </div>
  );
}

export function MaterialCard({ material, isAuthenticated, onRead, userReaction }: MaterialCardProps) {
  const [showComments, setShowComments] = useState(false);
  // Comments posted or deleted here since the feed loaded
  const [commentDelta, setCommentDelta] = useState(0);
  const commentCount = Math.max(0, material.commentCount + commentDelta);
  const badge = categoryBadge(material.category, material.subcategory);

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
    material.level && levelLabel(material.level),
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
        <VerificationBadge unverified={material.unverified} tier={material.verificationTier} />
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
        Uploaded by{" "}
        <UploaderByline upid={material.submittedByUpid} isPlatform={material.isPlatform} />
        {material.uploaderTopBadge && (
          <span
            className="ml-1"
            title={`${material.uploaderTopBadge.name}: ${material.uploaderTopBadge.description}`}
            aria-label={`${material.uploaderTopBadge.name} badge`}
            role="img"
          >
            {material.uploaderTopBadge.emoji}
          </span>
        )}{" "}
        ·{" "}
        {timeAgo(material.createdAt)}
      </p>

      <ReactionBar material={material} userReaction={userReaction} isAuthenticated={isAuthenticated} />

      {/* Comments load only when opened, to keep the feed light */}
      <button
        type="button"
        onClick={() => setShowComments((open) => !open)}
        aria-expanded={showComments}
        className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        <FiMessageCircle size={14} aria-hidden />
        {commentCount > 0
          ? `${commentCount} comment${commentCount !== 1 ? "s" : ""}`
          : "Add a comment"}
        <FiChevronDown
          size={12}
          aria-hidden
          className={`transition-transform ${showComments ? "rotate-180" : ""}`}
        />
      </button>
      {showComments && (
        <CommentSection
          materialId={material._id}
          isAuthenticated={isAuthenticated}
          onCountChange={(delta) => setCommentDelta((d) => d + delta)}
        />
      )}

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

        {/* The material page is public: it has the PDF (sign-in needed) and
            any typed questions or notes */}
        <Link
          href={`/materials/${material._id}`}
          onClick={() => onRead(material._id)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          {material.hasTypedContent ? "Open" : "Read"} <FiArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
