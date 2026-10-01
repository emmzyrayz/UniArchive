// components/admin/staffArea.tsx
// Which staff area a shared page is rendered in: /admin (platform admins) or
// /mod (moderators and admins). Set once by each area's layout, so shared
// components build links like `${base}/submissions` instead of hard-coding
// /admin.
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StaffArea } from "@/lib/routeAccess";

const StaffAreaContext = createContext<StaffArea>("admin");

export function StaffAreaProvider({ area, children }: { area: StaffArea; children: ReactNode }) {
  return <StaffAreaContext.Provider value={area}>{children}</StaffAreaContext.Provider>;
}

export const STAFF_AREA_LABELS: Record<StaffArea, string> = {
  admin: "Admin",
  mod: "Moderation",
};

/** The current area, its base path ("/admin" or "/mod") and its label. */
export function useStaffArea(): { area: StaffArea; base: string; label: string } {
  const area = useContext(StaffAreaContext);
  return { area, base: `/${area}`, label: STAFF_AREA_LABELS[area] };
}
