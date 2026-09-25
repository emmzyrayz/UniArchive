// src/app/profile/page.tsx
// The signed-in user's own profile (read-only). Client-side auth check via
// useUser(); data comes from /api/auth/me through the UserContext.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { FiCheckCircle, FiChevronDown, FiCircle } from "react-icons/fi";
import { useUser, type User } from "@/context/userContext";
import {
  AUDITOR_MATERIALS_REQUIRED,
  AUDITOR_MIN_MONTHS_AS_COLLABORATOR,
  COLLABORATOR_MATERIALS_REQUIRED,
} from "@/lib/constants/profile";
import {
  CompletionBar,
  PROFILE_CARD_CLASS,
  ProfileAvatar,
  RoleBadge,
  completionColor,
} from "@/components/profile/profileUi";

function formatDate(value: string | Date | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) -
    (to.getDate() < from.getDate() ? 1 : 0)
  );
}

function roleProgress(user: User): string {
  const verified = user.verifiedMaterialCount ?? 0;
  if (user.role === "student") {
    return `${Math.min(verified, COLLABORATOR_MATERIALS_REQUIRED)}/${COLLABORATOR_MATERIALS_REQUIRED} verified materials to become Collaborator`;
  }
  if (user.role === "collaborator") {
    const since = new Date(user.roleUpgradedAt ?? user.joinedAt ?? Date.now());
    const monthsLeft = Math.max(
      AUDITOR_MIN_MONTHS_AS_COLLABORATOR - monthsBetween(since, new Date()),
      0,
    );
    return (
      `${Math.min(verified, AUDITOR_MATERIALS_REQUIRED)}/${AUDITOR_MATERIALS_REQUIRED} verified materials` +
      ` + ${monthsLeft} month${monthsLeft === 1 ? "" : "s"} remaining to become Auditor`
    );
  }
  return "Role progression managed by admins";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <dt className="text-sm text-text-muted w-28 shrink-0">{label}</dt>
      <dd className="text-sm text-text-primary font-medium flex-1 min-w-0 break-words">
        {value || <span className="text-text-muted font-normal">Not set</span>}
      </dd>
    </div>
  );
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function ProfilePage() {
  const router = useRouter();
  const { hasActiveSession, isLoading, userProfile, profileCompletion } = useUser();
  const [checklistOpen, setChecklistOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.replace("/auth?view=signin&from=%2Fprofile");
    }
  }, [isLoading, hasActiveSession, router]);

  if (isLoading || !hasActiveSession || !userProfile) return null;

  const user = userProfile;
  const percentage = profileCompletion?.percentage ?? 0;
  const missingChecks = profileCompletion?.checks.filter((c) => !c.met) ?? [];
  const hasAcademic = !!(user.universityId || user.facultyId || user.departmentId || user.level);
  const joined = formatDate(user.joinedAt);

  return (
    <div className="min-h-screen mt-[70px] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <motion.section {...fadeUp(0)} className={`${PROFILE_CARD_CLASS} p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <ProfileAvatar name={user.fullName} photoUrl={user.profilePhoto} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-text-primary truncate">
                {user.fullName || "Unnamed user"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {user.username && (
                  <span className="text-sm text-text-secondary">@{user.username}</span>
                )}
                {user.username && <span className="text-text-muted">•</span>}
                <RoleBadge role={user.role} />
              </div>
              {joined && (
                <p className="text-xs text-text-muted mt-2">Member since {joined}</p>
              )}
            </div>
            <Link
              href="/profile/edit"
              className="self-start sm:self-center text-sm font-medium text-text-primary border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg px-4 py-2 transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </motion.section>

        {/* Completion */}
        {profileCompletion && (
          <motion.section {...fadeUp(0.05)} className={`${PROFILE_CARD_CLASS} p-6`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text-primary">Profile Completion</h2>
              <span className={`text-sm font-bold ${completionColor(percentage).text}`}>
                {percentage}%
              </span>
            </div>
            <CompletionBar percentage={percentage} />
            {percentage < 100 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  <p className="text-sm text-text-secondary">
                    {missingChecks.length} step{missingChecks.length === 1 ? "" : "s"} remaining
                  </p>
                  <button
                    type="button"
                    onClick={() => setChecklistOpen((o) => !o)}
                    aria-expanded={checklistOpen}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    See what&apos;s missing
                    <FiChevronDown
                      className={`transition-transform ${checklistOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {checklistOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3 space-y-2"
                    >
                      {profileCompletion.checks.map((check) => (
                        <li key={check.key} className="flex items-center gap-2 text-sm">
                          {check.met ? (
                            <FiCheckCircle className="text-green-500 shrink-0" />
                          ) : (
                            <FiCircle className="text-text-muted shrink-0" />
                          )}
                          <span
                            className={
                              check.met ? "text-text-muted line-through" : "text-text-primary"
                            }
                          >
                            {check.label}
                          </span>
                          <span className="text-xs text-text-muted">({check.weight}%)</span>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <p className="text-sm text-text-secondary mt-3">
                Your profile is complete. You can submit materials to the UniLibrary.
              </p>
            )}
          </motion.section>
        )}

        {/* Personal + academic */}
        <motion.div {...fadeUp(0.1)} className="grid gap-6 md:grid-cols-2">
          <section className={`${PROFILE_CARD_CLASS} p-6`}>
            <h2 className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-4">
              Personal info
            </h2>
            <dl className="space-y-3">
              <InfoRow
                label="Bio"
                value={
                  user.bio ? (
                    <span className="font-normal">{user.bio}</span>
                  ) : (
                    <span className="text-text-muted font-normal">No bio yet</span>
                  )
                }
              />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Date of birth" value={formatDate(user.dob)} />
              <InfoRow
                label="Phone"
                value={
                  user.phoneMasked && (
                    <span>
                      {user.phoneMasked}
                      <span className="block text-xs text-text-muted font-normal">
                        Masked for privacy
                      </span>
                    </span>
                  )
                }
              />
            </dl>
          </section>

          <section className={`${PROFILE_CARD_CLASS} p-6`}>
            <h2 className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-4">
              Academic info
            </h2>
            {hasAcademic ? (
              <dl className="space-y-3">
                <InfoRow
                  label="University"
                  value={user.universityAbbr || user.universityName}
                />
                <InfoRow label="Faculty" value={user.facultyName} />
                <InfoRow label="Department" value={user.departmentName} />
                <InfoRow label="Level" value={user.level} />
                <InfoRow label="Semester" value={user.semester} />
              </dl>
            ) : (
              <p className="text-sm text-text-muted">
                Academic info not set.{" "}
                <Link href="/profile/edit" className="text-primary font-medium hover:underline">
                  Add it now
                </Link>
              </p>
            )}
          </section>
        </motion.div>

        {/* Contributions */}
        <motion.section {...fadeUp(0.15)} className={`${PROFILE_CARD_CLASS} p-6`}>
          <h2 className="text-xs font-semibold tracking-wider uppercase text-text-muted mb-4">
            Contribution stats
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {user.verifiedMaterialCount ?? 0}
              </p>
              <p className="text-xs text-text-muted">Verified materials</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{user.submissionCount ?? 0}</p>
              <p className="text-xs text-text-muted">Submissions</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary border-t border-neutral-200 dark:border-neutral-700 pt-4">
            {roleProgress(user)}
          </p>
        </motion.section>
      </div>
    </div>
  );
}
