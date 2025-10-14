import { ReactElement } from "react";
import { Tooltip } from "@/components/UI";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "indigo";
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showLabel = true,
  showPercentage = true,
  size = "md",
  color = "blue",
  animated = false,
  striped = false,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeStyles = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const colorStyles = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-500",
    purple: "bg-purple-600",
    indigo: "bg-indigo-600",
  };

  const progressBar = (
    <div
      className={`w-full bg-gray-200 rounded-full ${sizeStyles[size]} ${className}`}
    >
      <div
        className={`
          ${colorStyles[color]} 
          ${sizeStyles[size]} 
          rounded-full transition-all duration-500 ease-out
          ${striped ? "bg-striped" : ""}
          ${animated ? "animate-pulse" : ""}
        `}
        style={{
          width: `${percentage}%`,
          backgroundImage: striped
            ? `linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)`
            : "none",
        }}
      />
    </div>
  );

  const content = (
    <div className="space-y-2">
      {(showLabel || label) && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            {label || "Progress"}
          </span>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-700">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      {progressBar}
    </div>
  );

  // Wrap with tooltip if we have a detailed label
  if (label && showLabel) {
    return (
      <Tooltip text={`${value}/${max} (${Math.round(percentage)}%)`}>
        {content}
      </Tooltip>
    );
  }

  return content;
}
