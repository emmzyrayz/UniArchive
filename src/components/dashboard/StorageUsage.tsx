// src/components/dashboard/StorageUsage.tsx
"use client";

import { motion } from "motion/react";
import { formatBytes } from "@/assets/data/dashboardData";
import type { StorageInfo } from "@/types/dashboard";

export function StorageUsage({ storage }: { storage: StorageInfo }) {
  const percent = (storage.usedBytes / storage.totalBytes) * 100;
  const isNearFull = percent > 80;

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Storage</h3>
        <span className="text-sm text-text-muted">{storage.documentCount} documents</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">{formatBytes(storage.usedBytes)} used</span>
          <span className="text-text-muted">{formatBytes(storage.totalBytes)} total</span>
        </div>
        <div className="h-2.5 rounded-full bg-neutral-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${isNearFull ? "bg-warning" : "bg-accent"}`}
          />
        </div>
        <p className="text-xs text-text-muted">{percent.toFixed(1)}% used</p>
      </div>

      {isNearFull && (
        <p className="mt-3 text-xs text-warning bg-warning/10 rounded-md px-3 py-2">
          You&apos;re running low on storage. Consider removing unused documents.
        </p>
      )}
    </div>
  );
}