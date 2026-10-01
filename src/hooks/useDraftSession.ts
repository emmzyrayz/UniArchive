// src/hooks/useDraftSession.ts
// The conversion workspace's draft (lib/draftSync.ts) for a component:
// local autosave plus server sync, started on mount and flushed on unmount.
"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { DraftSession } from "@/lib/draftSync";
import type { ConversionKind } from "@/lib/conversions";

export function useDraftSession(opts: {
  upid: string;
  materialId: string;
  kind: ConversionKind;
  targetDocId?: string;
}) {
  const { upid, materialId, kind, targetDocId } = opts;
  const session = useMemo(
    () => new DraftSession({ upid, materialId, kind, targetDocId }),
    [upid, materialId, kind, targetDocId],
  );
  useEffect(() => {
    void session.start();
    return () => session.stop();
  }, [session]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, state };
}
