// src/app/settings/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@/context/userContext";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { SessionsPanel } from "./SessionsPanel";
import { EmailPrefsPanel } from "./EmailPrefsPanel";
import { AccountPanel } from "./AccountPanel";
import { SchoolEmailCard } from "./SchoolEmailCard";
import { DataExportCard } from "./DataExportCard";
import { DeleteAccountPanel } from "./DeleteAccountPanel";

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

function isTab(value: unknown): value is Tab {
  return TABS.some((tab) => tab.id === value);
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ?tab=privacy&google=... when coming back from connecting Google
  const { tab, google } = use(searchParams);
  const router = useRouter();
  const { hasActiveSession, isLoading } = useUser();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(isTab(tab) ? tab : "account");

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
              <AccountPanel />
              <SchoolEmailCard />

              <DeleteAccountPanel />
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
          {activeTab === "notifications" && <EmailPrefsPanel />}

          {/* Privacy tab */}
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <ConnectedAccounts result={typeof google === "string" ? google : undefined} />
              <DataExportCard />
              <SessionsPanel />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}