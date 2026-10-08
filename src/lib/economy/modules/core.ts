// src/lib/economy/modules/core.ts
// The core module: staff corrections and treasury top-ups. It has no earn
// sources or products of its own; it gives those entries a home in the
// registry (history labels, the admin page).
import type { EconomyModule } from "../registry";

export const coreModule: EconomyModule = {
  id: "core",
  title: "Core",
  description: "Staff adjustments and the treasury that funds events and partners.",
};
