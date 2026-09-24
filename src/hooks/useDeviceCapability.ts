// src/hooks/useDeviceCapability.ts
import { useState, useEffect, startTransition } from "react";
import {
  getDeviceCapability,
  getDeviceSignals,
  PAGE_LOAD_CONFIG,
  type DeviceCapability,
} from "@/lib/deviceCapability";

export function useDeviceCapability() {
  const [capability, setCapability] = useState<DeviceCapability>("medium");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setCapability(getDeviceCapability());
      setReady(true);
    });
  }, []);

  const config = PAGE_LOAD_CONFIG[capability];

  return {
    capability,
    config,
    ready,
    signals: ready ? getDeviceSignals() : null,
  };
}
