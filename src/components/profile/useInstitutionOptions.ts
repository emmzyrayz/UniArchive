// src/components/profile/useInstitutionOptions.ts
// Loads the options for a dependent institution dropdown (faculties of a
// university, departments of a faculty). Pass null while the parent isn't
// chosen; results are keyed by URL so a stale response never shows.
"use client";

import { useEffect, useState } from "react";

export interface InstitutionOption {
  _id: string;
  name: string;
}

export function useInstitutionOptions(url: string | null, listKey: "faculties" | "departments") {
  const [state, setState] = useState<{ url: string | null; items: InstitutionOption[]; error: boolean }>({
    url: null,
    items: [],
    error: false,
  });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Record<string, InstitutionOption[]>;
        setState({ url, items: data[listKey] ?? [], error: false });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ url, items: [], error: true });
      }
    })();
    return () => controller.abort();
  }, [url, listKey]);

  const ready = !!url && state.url === url;
  return {
    items: ready ? state.items : [],
    loading: !!url && !ready,
    error: ready && state.error,
  };
}

