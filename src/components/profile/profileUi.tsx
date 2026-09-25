// src/components/profile/profileUi.tsx
// Small presentational pieces shared by /profile, /profile/edit and the
// profile completion modal.
"use client";

import Image from "next/image";
import type { UserRole } from "@/types/roles";

export const PROFILE_CARD_CLASS =
  "bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow";

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  student: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  collaborator: "bg-green-500/10 text-green-600 dark:text-green-400",
  auditor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  course_rep: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  lecturer: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  ed_admin: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  com_admin: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  webmaster: "bg-red-500/10 text-red-600 dark:text-red-400",
  dev: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  collaborator: "Collaborator",
  auditor: "Auditor",
  course_rep: "Course Rep",
  lecturer: "Lecturer",
  ed_admin: "Editorial Admin",
  com_admin: "Community Admin",
  webmaster: "Webmaster",
  dev: "Developer",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.student}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

/** 96px circle: the photo when set, otherwise initials like the navbar avatar. */
export function ProfileAvatar({
  name,
  photoUrl,
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative h-24 w-24 shrink-0 rounded-full overflow-hidden ring-2 ring-primary ${className}`}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`${name}'s profile photo`}
          fill
          sizes="96px"
          className="object-cover"
          // Local blob: previews can't go through the image optimizer
          unoptimized={photoUrl.startsWith("blob:")}
        />
      ) : (
        <div className="h-full w-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold select-none">
          {initialsOf(name)}
        </div>
      )}
    </div>
  );
}

/** Bar colour by band: red <50, amber <80, blue <100, green at 100. */
export function completionColor(percentage: number): { bar: string; text: string } {
  if (percentage >= 100) return { bar: "bg-green-500", text: "text-green-600 dark:text-green-400" };
  if (percentage >= 80) return { bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
  if (percentage >= 50) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

export function CompletionBar({ percentage }: { percentage: number }) {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  return (
    <div
      className="h-2.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label="Profile completion"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${completionColor(clamped).bar}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
