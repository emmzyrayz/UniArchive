import { ReactElement } from "react";

interface BadgeProps {
  label: string | number | ReactElement;
  color?:
    | "blue"
    | "green"
    | "red"
    | "yellow"
    | "gray"
    | "indigo"
    | "white"
    | "black";
  variant?: "solid" | "outlined" | "dot" | "soft";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: ReactElement;
  onClose?: () => void;
  closeable?: boolean;
  pulse?: boolean;
}

export default function Badge({
  label,
  color = "gray",
  variant = "solid",
  size = "md",
  className = "",
  icon,
  onClose,
  closeable = false,
  pulse = false,
}: BadgeProps) {
  // Add this helper at the top
const dotColors = {
  blue: "bg-blue-600",
  green: "bg-green-600",
  red: "bg-red-600",
  yellow: "bg-yellow-500",
  gray: "bg-gray-500",
  indigo: "bg-indigo-600",
  white: "bg-white",
  black: "bg-gray-900",
};

  // Complete color mappings with all variants
  const colorClasses = {
    blue: {
      solid: "bg-blue-600 text-white border-blue-600",
      outlined: "border border-blue-600 text-blue-600 bg-transparent",
      dot: "text-blue-600 bg-transparent",
      soft: "bg-blue-100 text-blue-700 border-blue-200",
    },
    green: {
      solid: "bg-green-600 text-white border-green-600",
      outlined: "border border-green-600 text-green-600 bg-transparent",
      dot: "text-green-600 bg-transparent",
      soft: "bg-green-100 text-green-700 border-green-200",
    },
    red: {
      solid: "bg-red-600 text-white border-red-600",
      outlined: "border border-red-600 text-red-600 bg-transparent",
      dot: "text-red-600 bg-transparent",
      soft: "bg-red-100 text-red-700 border-red-200",
    },
    yellow: {
      solid: "bg-yellow-500 text-gray-900 border-yellow-500",
      outlined: "border border-yellow-500 text-yellow-600 bg-transparent",
      dot: "text-yellow-600 bg-transparent",
      soft: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    gray: {
      solid: "bg-gray-500 text-white border-gray-500",
      outlined: "border border-gray-500 text-gray-600 bg-transparent",
      dot: "text-gray-600 bg-transparent",
      soft: "bg-gray-100 text-gray-700 border-gray-200",
    },
    indigo: {
      solid: "bg-indigo-600 text-white border-indigo-600",
      outlined: "border border-indigo-600 text-indigo-600 bg-transparent",
      dot: "text-indigo-600 bg-transparent",
      soft: "bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    white: {
      solid: "bg-white text-gray-900 border-gray-200",
      outlined: "border border-gray-300 text-gray-700 bg-transparent",
      dot: "text-gray-700 bg-transparent",
      soft: "bg-gray-50 text-gray-600 border-gray-200",
    },
    black: {
      solid: "bg-gray-900 text-white border-gray-900",
      outlined: "border border-gray-900 text-gray-900 bg-transparent",
      dot: "text-gray-900 bg-transparent",
      soft: "bg-gray-800 text-white border-gray-700",
    },
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  }[size];

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }[size];

  const baseClasses = `inline-flex items-center rounded-full font-medium border ${sizeClasses} ${
    colorClasses[color][variant]
  } ${pulse ? "animate-pulse" : ""} ${className}`;

  return (
    <span className={baseClasses}>
      {variant === "dot" && (
        <span
          className={`rounded-full ${dotSize} ${
            colorClasses[color].solid.split(" ")[0]
          } ${dotColors[color]}`}
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-shrink-0">{label}</span>
      {closeable && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-1 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
          aria-label="Remove badge"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
