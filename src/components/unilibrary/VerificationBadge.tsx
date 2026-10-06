// components/unilibrary/VerificationBadge.tsx
// A material's review state, as shown on cards and its page: ✓ Verified,
// ⭐ Endorsed, or ⚠ Unverified (waiting for review; clicking it explains).
"use client";

import { BADGE_CLASS } from "./materialLabels";

export function VerificationBadge({
  unverified,
  tier,
  onExplain,
}: {
  unverified?: boolean;
  tier?: "tier1" | "tier2";
  /** Unverified only: opens the "details not checked" explanation */
  onExplain?: () => void;
}) {
  if (unverified) {
    const className = `${BADGE_CLASS} border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300`;
    const label = "⚠ Unverified";
    const title = "Waiting for review: the details haven't been checked yet";
    return onExplain ? (
      <button type="button" className={`${className} hover:bg-amber-500/25`} title={title} onClick={onExplain}>
        {label}
      </button>
    ) : (
      <span className={className} title={title}>
        {label}
      </span>
    );
  }
  return tier === "tier2" ? (
    <span className={`${BADGE_CLASS} border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300`} title="Endorsed by a lecturer">
      ⭐ Endorsed
    </span>
  ) : (
    <span className={`${BADGE_CLASS} border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300`} title="Checked by a UniArchive reviewer">
      ✓ Verified
    </span>
  );
}
