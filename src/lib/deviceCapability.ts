// src/lib/deviceCapability.ts

export type DeviceCapability = "high" | "medium" | "low";

export interface DeviceSignals {
  ram: number | undefined; // GB, Chrome/Edge only
  cores: number;
  effectiveType: string | undefined; // "slow-2g" | "2g" | "3g" | "4g"
  saveData: boolean;
}

export function getDeviceSignals(): DeviceSignals {
  if (typeof window === "undefined") {
    return {
      ram: undefined,
      cores: 4,
      effectiveType: undefined,
      saveData: false,
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
  };

  return {
    ram: nav.deviceMemory,
    cores: nav.hardwareConcurrency ?? 2,
    effectiveType: nav.connection?.effectiveType,
    saveData: nav.connection?.saveData ?? false,
  };
}

export function assessCapability(signals: DeviceSignals): DeviceCapability {
  // Data saver or very slow connection → low regardless of hardware
  if (signals.saveData) return "low";
  if (signals.effectiveType === "slow-2g" || signals.effectiveType === "2g")
    return "low";

  // RAM is the most reliable signal where available (Chrome/Edge/Android)
  if (signals.ram !== undefined) {
    if (signals.ram <= 1) return "low";
    if (signals.ram >= 4 && signals.cores >= 4) return "high";
    return "medium";
  }

  // Fallback: use core count alone (Firefox, Safari)
  if (signals.cores <= 2) return "low";
  if (signals.cores >= 6) return "high";
  return "medium";
}

export function getDeviceCapability(): DeviceCapability {
  return assessCapability(getDeviceSignals());
}

// Page load limits per capability tier
export const PAGE_LOAD_CONFIG = {
  high: { initial: 10, increment: 10, label: null },
  medium: {
    initial: 5,
    increment: 5,
    label: "Medium device — loading in batches",
  },
  low: {
    initial: 3,
    increment: 3,
    label: "Saving memory — loading a few pages at a time",
  },
} as const;
