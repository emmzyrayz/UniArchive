// src/lib/economy/modules/index.ts
// Every economy module the site runs. To add one: write its manifest
// (lib/economy/registry.ts: EconomyModule) in this folder and add it to
// MODULES. Nothing else in the core changes.
import { registerModule, type EconomyModule } from "../registry";
import { coreModule } from "./core";
import { scoutsModule } from "./scouts";

export const MODULES: EconomyModule[] = [coreModule, scoutsModule];

let loaded = false;

/** Registers the modules once per server instance. */
export function loadEconomyModules(): void {
  if (loaded) return;
  loaded = true;
  for (const m of MODULES) registerModule(m);
}
