// components/auth/StepProgress.tsx
"use client";

interface StepProgressProps {
  labels: readonly string[];
  currentIndex: number;
  onStepClick: (index: number) => void;
}

export function StepProgress({
  labels,
  currentIndex,
  onStepClick,
}: StepProgressProps) {
  return (
    <ol className="flex items-center justify-between">
      {labels.map((label, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isClickable = i <= currentIndex;

        return (
          <li key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => onStepClick(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors
                ${isCurrent ? "bg-accent text-accent-foreground" : ""}
                ${isComplete ? "bg-neutral-800 text-white" : ""}
                ${!isCurrent && !isComplete ? "bg-neutral-200 text-neutral-400" : ""}
                ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}
              `}
            >
              {isComplete ? "✓" : i + 1}
            </button>
            <span
              className={`text-xs ${isCurrent ? "text-text-primary font-medium" : "text-text-muted"}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
