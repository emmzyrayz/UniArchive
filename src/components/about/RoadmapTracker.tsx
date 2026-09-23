// components/about/RoadmapTracker.tsx
"use client";

import { motion } from "motion/react";
import { roadmap, type RoadmapStatus } from "@/types/roadmap";

const statusConfig: Record<
  RoadmapStatus,
  { label: string; dot: string; text: string }
> = {
  done: { label: "Done", dot: "bg-success", text: "text-success" },
  "in-progress": {
    label: "In progress",
    dot: "bg-amber-500",
    text: "text-amber-600",
  },
  planned: { label: "Planned", dot: "bg-neutral-300", text: "text-text-muted" },
};

function phaseProgress(items: { status: RoadmapStatus }[]) {
  const weight = { done: 1, "in-progress": 0.5, planned: 0 };
  const total = items.reduce((sum, item) => sum + weight[item.status], 0);
  return Math.round((total / items.length) * 100);
}

export function RoadmapTracker() {
  const overallItems = roadmap.flatMap((phase) => phase.items);
  const overallPercent = phaseProgress(overallItems);

  return (
    <div className="space-y-10">
      {/* Overall progress bar */}
      <div className="rounded-xl border border-border bg-surface-raised p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            Overall progress
          </span>
          <span className="text-sm text-text-secondary">{overallPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${overallPercent}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-accent rounded-full"
          />
        </div>
      </div>

      {/* Per-phase breakdown */}
      {roadmap.map((phase, phaseIndex) => {
        const percent = phaseProgress(phase.items);
        return (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: phaseIndex * 0.1 }}
            className="rounded-xl border border-border bg-surface-raised overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">{phase.title}</h3>
              <span className="text-sm text-text-secondary">{percent}%</span>
            </div>
            <ul className="divide-y divide-border">
              {phase.items.map((item) => {
                const config = statusConfig[item.status];
                return (
                  <li
                    key={item.title}
                    className="flex items-start gap-3 px-6 py-4"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${config.dot}`}
                      aria-hidden
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-text-primary text-sm">
                          {item.title}
                        </p>
                        <span
                          className={`text-xs font-medium shrink-0 ${config.text}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        );
      })}
    </div>
  );
}
