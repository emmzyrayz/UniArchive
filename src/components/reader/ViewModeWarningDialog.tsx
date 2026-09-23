// components/reader/ViewModeWarningDialog.tsx
"use client";

import { useReader } from "@/context/readerContext";
import { Button } from "@/components/UI/Buttons";

export function ViewModeWarningDialog() {
  const { pendingViewMode, confirmViewModeChange, cancelViewModeChange } =
    useReader();

  if (!pendingViewMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-w-sm w-full rounded-xl bg-neutral-900 border border-neutral-700 p-6">
        <h2 className="text-white font-semibold text-base mb-2">
          This may use more memory
        </h2>
        <p className="text-sm text-neutral-400 mb-6">
          Continuous scroll keeps several pages loaded at once, which can slow
          down lower-end phones on longer documents. Single-page mode is lighter
          and usually smoother.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={cancelViewModeChange}>
            Stay in page view
          </Button>
          <Button onClick={confirmViewModeChange}>Continue anyway</Button>
        </div>
      </div>
    </div>
  );
}
