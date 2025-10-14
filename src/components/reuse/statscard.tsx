import { ReactElement } from "react";
import { Card, Badge } from "@/components/UI";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactElement;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  color = "blue",
  loading = false,
  onClick,
  className = "",
}: StatsCardProps) {
  const colorStyles = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600",
    yellow: "from-yellow-500 to-yellow-600",
    purple: "from-purple-500 to-purple-600",
    gray: "from-gray-500 to-gray-600",
  };

  const trendColors = {
    positive: "text-green-600 bg-green-50",
    negative: "text-red-600 bg-red-50",
  };

  if (loading) {
    return (
      <Card variant="elevated" className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="elevated"
      hoverable={!!onClick}
      onClick={onClick}
      className={`p-6 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

          {(description || trend) && (
            <div className="flex items-center gap-2">
              {trend && (
                <Badge
                  label={
                    <span className="inline-flex items-center gap-1">
                      {trend.isPositive ? "↑" : "↓"}{" "}
                      {`${trend.isPositive ? "+" : ""}${trend.value}%`}
                    </span>
                  }
                  className={`${
                    trend.isPositive
                      ? trendColors.positive
                      : trendColors.negative
                  } border-none`}
                  color={trend.isPositive ? "green" : "red"}
                  variant="soft"
                  size="sm"
                />
              )}
              {description && (
                <span className="text-sm text-gray-500">{description}</span>
              )}
              {trend?.label && (
                <span className="text-sm text-gray-500">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div
            className={`p-3 rounded-xl bg-gradient-to-r ${colorStyles[color]} text-white`}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
