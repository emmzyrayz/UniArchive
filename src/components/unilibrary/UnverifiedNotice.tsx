// components/unilibrary/UnverifiedNotice.tsx
// The warning on an unverified material: its details haven't been checked
// yet, so readers can help identify it or report it. Opens by itself the
// first time someone views that material (remembered on the device), and
// again from the Unverified badge.
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/ReviewModals";

const SEEN_KEY = "ua:unverified-seen";
const MAX_REMEMBERED = 300;

function seenBefore(id: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}

function rememberSeen(id: string) {
  try {
    const seen = (JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]).filter((x) => x !== id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id].slice(-MAX_REMEMBERED)));
  } catch {
    // Storage blocked: the notice just shows again next time
  }
}

/** Opens the notice once per material on this device; `open()` shows it again. */
export function useUnverifiedNotice(materialId: string, unverified: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!unverified || seenBefore(materialId)) return;
    // After the first paint, so the page shows behind it
    const timer = setTimeout(() => setIsOpen(true), 400);
    return () => clearTimeout(timer);
  }, [materialId, unverified]);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => {
      rememberSeen(materialId);
      setIsOpen(false);
    },
  };
}

export function UnverifiedNotice({
  unidentified,
  onClose,
  onHelp,
  onReport,
}: {
  /** No details at all yet (a staff upload nobody has described) */
  unidentified: boolean;
  onClose: () => void;
  onHelp?: () => void;
  onReport: () => void;
}) {
  return (
    <Modal title={unidentified ? "This PDF hasn't been identified yet" : "These details haven't been checked yet"} onClose={onClose}>
      <div className="space-y-3 text-sm text-text-secondary">
        <p>
          {unidentified
            ? "It was added to UniArchive without a course, school or level, so we don't know yet what it is."
            : "Someone shared this PDF and it's waiting for our team to check it. The title, course, school and level may be wrong or incomplete."}
        </p>
        <p>
          You can still read it.
          {onHelp ? " If you know what it is, you can help identify it for everyone." : " If something looks wrong, let us know."}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onReport} className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
          Report a problem
        </button>
        {onHelp && (
          <button
            type="button"
            onClick={onHelp}
            className="rounded-lg border border-primary/40 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Help identify it
          </button>
        )}
        <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          Continue
        </button>
      </div>
    </Modal>
  );
}
