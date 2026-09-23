// src/app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@/context/userContext";
import { useTheme, type Theme } from "@/hooks/useTheme";
import AuthInput from "@/app/auth/components/UI/AuthInput";
import { Button } from "@/components/UI/Buttons";

type Tab = "account" | "appearance" | "notifications" | "privacy";

const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
];

const THEME_OPTIONS: { value: Theme; label: string; desc: string }[] = [
  { value: "light", label: "Light", desc: "Clean white background" },
  { value: "dark", label: "Dark", desc: "Easy on the eyes at night" },
  { value: "system", label: "System", desc: "Follows your device setting" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { hasActiveSession, isLoading, getUserDisplayName } = useUser();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [notifications, setNotifications] = useState({
    newFeatures: true,
    weeklyDigest: false,
    studyReminders: true,
  });

  useEffect(() => {
    if (!isLoading && !hasActiveSession) {
      router.push("/auth?view=signin");
    }
  }, [isLoading, hasActiveSession, router]);

  if (isLoading || !hasActiveSession) return null;

  return (
    <div className="min-h-screen mt-[70px] px-4 sm:px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your account and preferences</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Account tab */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-surface-raised p-6">
                <h2 className="font-semibold text-text-primary mb-4">Profile details</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AuthInput
                      name="firstName"
                      label="First name"
                      type="text"
                      defaultValue={getUserDisplayName().split(" ")[0]}
                      disabled
                    />
                    <AuthInput
                      name="lastName"
                      label="Last name"
                      type="text"
                      defaultValue={getUserDisplayName().split(" ").slice(1).join(" ")}
                      disabled
                    />
                  </div>
                  <p className="text-xs text-text-muted">
                    Profile editing is coming soon. Connect the server to save changes.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-raised p-6">
                <h2 className="font-semibold text-text-primary mb-2">Password</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Change your account password. You&apos;ll need to verify your current one first.
                </p>
                <Button variant="secondary" onClick={() => router.push("/auth?view=forgot-password")}>
                  Reset password via email
                </Button>
              </div>

              <div className="rounded-xl border border-error/30 bg-error/5 p-6">
                <h2 className="font-semibold text-error mb-2">Danger zone</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Deleting your account is permanent and cannot be undone.
                </p>
                <Button variant="secondary">
                  Request account deletion
                </Button>
              </div>
            </div>
          )}

          {/* Appearance tab */}
          {activeTab === "appearance" && (
            <div className="rounded-xl border border-border bg-surface-raised p-6">
              <h2 className="font-semibold text-text-primary mb-1">Theme</h2>
              <p className="text-sm text-text-secondary mb-5">
                Choose how UniArchive looks on your device.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      theme === option.value
                        ? "border-accent bg-surface"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    <p className="font-medium text-text-primary text-sm">{option.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notifications tab */}
          {activeTab === "notifications" && (
            <div className="rounded-xl border border-border bg-surface-raised p-6">
              <h2 className="font-semibold text-text-primary mb-5">Email notifications</h2>
              <div className="space-y-4">
                {(Object.entries(notifications) as [keyof typeof notifications, boolean][]).map(
                  ([key, value]) => {
                    const labels: Record<string, { label: string; desc: string }> = {
                      newFeatures: { label: "New features", desc: "When we ship something new" },
                      weeklyDigest: { label: "Weekly digest", desc: "A summary of your reading activity" },
                      studyReminders: { label: "Study reminders", desc: "Daily nudges to keep your streak" },
                    };
                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">{labels[key].label}</p>
                          <p className="text-xs text-text-muted">{labels[key].desc}</p>
                        </div>
                        <div
                          onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                            value ? "bg-accent" : "bg-neutral-300"
                          }`}
                        >
                          <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            value ? "translate-x-6" : "translate-x-1"
                          }`} />
                        </div>
                      </label>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Privacy tab */}
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface-raised p-6">
                <h2 className="font-semibold text-text-primary mb-2">Your data</h2>
                <p className="text-sm text-text-secondary mb-4">
                  All your documents are private to your account. We encrypt your personal
                  details (email, phone) before storing them.
                </p>
                <Button variant="secondary">Download my data</Button>
              </div>
              <div className="rounded-xl border border-border bg-surface-raised p-6">
                <h2 className="font-semibold text-text-primary mb-2">Active sessions</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Sign out of all devices if you think your account has been compromised.
                </p>
                <Button variant="secondary">Sign out all devices</Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}