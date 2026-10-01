// components/conversions/SyncStatus.tsx
// Where the conversion workspace's work is saved right now, and "Sync now".
"use client";

import { FiCheckCircle, FiCloudOff, FiHardDrive, FiLoader, FiAlertCircle, FiLogIn } from "react-icons/fi";
import type { DraftState } from "@/lib/draftSync";

const LABELS: Record<DraftState["status"], { text: string; tone: string; Icon: typeof FiCheckCircle }> = {
  loading: { text: "Loading…", tone: "text-text-muted", Icon: FiLoader },
  saving: { text: "Saving…", tone: "text-text-muted", Icon: FiLoader },
  local: { text: "Saved on this device", tone: "text-text-secondary", Icon: FiHardDrive },
  syncing: { text: "Syncing…", tone: "text-text-muted", Icon: FiLoader },
  synced: { text: "Saved to your account", tone: "text-success", Icon: FiCheckCircle },
  offline: { text: "Offline · saved on this device", tone: "text-warning", Icon: FiCloudOff },
  "signed-out": { text: "Signed out · saved on this device", tone: "text-warning", Icon: FiLogIn },
  error: { text: "Not synced", tone: "text-error", Icon: FiAlertCircle },
};

export function SyncStatus({ state, onSyncNow }: { state: DraftState; onSyncNow: () => void }) {
  const { text, tone, Icon } = LABELS[state.status];
  const busy = state.status === "syncing" || state.status === "saving" || state.status === "loading";
  const time = state.status === "synced" && state.lastSyncedAt ? new Date(state.lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 ${tone}`}>
        <Icon aria-hidden className={busy ? "animate-spin" : ""} />
        {text}
        {time && <span className="hidden text-text-muted sm:inline">· {time}</span>}
      </span>
      {!state.readOnly && state.status !== "synced" && !busy && (
        <button type="button" onClick={onSyncNow} className="font-medium text-primary hover:underline">
          Sync now
        </button>
      )}
    </div>
  );
}
