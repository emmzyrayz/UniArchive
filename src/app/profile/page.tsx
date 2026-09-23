// src/app/profile/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { useUser } from "@/context/userContext";
import { MOCK_READING_STATS, MOCK_BOOKMARKS, MOCK_HIGHLIGHTS } from "@/assets/data/dashboardData";

const ROLE_COLORS: Record<string, string> = {
  student: "bg-blue-500/10 text-blue-500",
  collaborator: "bg-green-500/10 text-green-500",
  auditor: "bg-yellow-500/10 text-yellow-600",
  course_rep: "bg-orange-500/10 text-orange-500",
  lecturer: "bg-purple-500/10 text-purple-500",
  ed_admin: "bg-pink-500/10 text-pink-500",
  com_admin: "bg-red-500/10 text-red-500",
  webmaster: "bg-accent/10 text-accent",
  dev: "bg-neutral-500/10 text-neutral-500",
};

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const { hasActiveSession, isLoading, userProfile, getUserDisplayName } = useUser();

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.push("/auth?view=signin");
    }
  }, [isLoading, hasActiveSession, router]);

  if (isLoading || !hasActiveSession || !userProfile) return null;

  const roleColor = ROLE_COLORS[userProfile.role] ?? "bg-neutral-500/10 text-neutral-500";
  const initials = getUserDisplayName().split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const profileStats = [
    { label: "Pages read", value: MOCK_READING_STATS.totalPagesRead.toLocaleString() },
    { label: "Bookmarks", value: MOCK_BOOKMARKS.length },
    { label: "Highlights", value: MOCK_HIGHLIGHTS.length },
    { label: "Day streak", value: MOCK_READING_STATS.currentStreakDays },
  ];

  return (
    <div className="min-h-screen mt-[70px] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-2xl">

        {/* Profile header card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border bg-surface-raised overflow-hidden mb-6"
        >
          {/* Cover strip */}
          <div className="h-24 bg-gradient-to-r from-neutral-800 to-neutral-700" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-10 mb-4 p-6">
              <div className="h-20 w-20 p-5 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center text-2xl font-bold ring-4 ring-surface-raised select-none">
                {initials}
              </div>
              <Link
                href="/settings"
                className="text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg px-4 py-1.5 transition-colors"
              >
                Edit profile
              </Link>
            </div>

            {/* Name + role */}
            <div className="mb-3">
              <h1 className="text-xl font-bold text-text-primary">{getUserDisplayName()}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${roleColor}`}>
                  {userProfile.role.replace("_", " ")}
                </span>
                {userProfile.joinedAt && (
                  <span className="text-xs text-text-muted">
                    Joined {formatJoinDate(userProfile.joinedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {userProfile.bio && (
              <p className="text-sm text-text-secondary mb-4">{userProfile.bio}</p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 py-4 border-t border-border">
              {profileStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-lg font-bold text-text-primary">{stat.value}</p>
                  <p className="text-xs text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Academic info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-border bg-surface-raised p-6 mb-6"
        >
          <h2 className="font-semibold text-text-primary mb-4">Academic information</h2>
          <dl className="space-y-3">
            {[
              { label: "Institution", value: userProfile.school },
              { label: "Faculty", value: userProfile.faculty },
              { label: "Department", value: userProfile.department },
              { label: "Level", value: userProfile.level },
              { label: "UPID", value: userProfile.upid },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <dt className="text-sm text-text-muted w-28 shrink-0">{item.label}</dt>
                <dd className="text-sm text-text-primary font-medium flex-1">{item.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        {/* Account info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl border border-border bg-surface-raised p-6"
        >
          <h2 className="font-semibold text-text-primary mb-4">Account</h2>
          <dl className="space-y-3">
            {[
              { label: "Email", value: "Encrypted on server" },
              { label: "UUID", value: userProfile.uuid },
              { label: "Verified", value: userProfile.isVerified ? "✓ Yes" : "✗ Not verified" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <dt className="text-sm text-text-muted w-28 shrink-0">{item.label}</dt>
                <dd className="text-sm text-text-primary font-medium flex-1">{item.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </div>
  );
}