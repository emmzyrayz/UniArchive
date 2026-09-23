// src/components/dashboard/StatsCard.tsx
"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface StatsCardProps {
  label: string;
  value: number;
  display: string;
  icon: React.ReactNode;
  delay?: number;
}

export function StatsCard({ label, value, display, icon, delay = 0 }: StatsCardProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay * 1000 + 100);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-border bg-surface-raised p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide font-medium">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{shown ? display : "—"}</p>
        </div>
        <div className="text-text-muted shrink-0">{icon}</div>
      </div>
    </motion.div>
  );
}