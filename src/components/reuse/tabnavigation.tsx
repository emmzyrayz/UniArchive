import { ReactElement } from "react";
import { Button } from "./button";
import { Badge } from "./badge";

interface TabItem {
  id: string;
  label: string;
  icon?: ReactElement;
  badge?: number | string;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "underline" | "pills" | "segmented";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant = "underline",
  size = "md",
  fullWidth = false,
  className = "",
}: TabNavigationProps) {
  const sizeStyles = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const variantStyles = {
    underline: {
      container: "border-b border-gray-200 space-x-8",
      tab: {
        base: "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
        active: "border-indigo-500 text-indigo-600",
        inactive:
          "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
        disabled: "text-gray-300 cursor-not-allowed",
      },
    },
    pills: {
      container: "space-x-1 p-1 bg-gray-100 rounded-lg",
      tab: {
        base: "px-3 py-2 rounded-md font-medium text-sm transition-colors duration-200",
        active: "bg-white text-gray-900 shadow-sm",
        inactive: "text-gray-600 hover:text-gray-900",
        disabled: "text-gray-300 cursor-not-allowed",
      },
    },
    segmented: {
      container: "inline-flex rounded-lg border border-gray-200 p-1",
      tab: {
        base: "px-3 py-2 rounded-md font-medium text-sm transition-colors duration-200",
        active: "bg-indigo-500 text-white",
        inactive: "text-gray-600 hover:text-gray-900",
        disabled: "text-gray-300 cursor-not-allowed bg-gray-100",
      },
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div className={className}>
      <div
        className={`
        flex ${fullWidth ? "w-full" : ""}
        ${currentVariant.container}
        ${sizeStyles[size]}
      `}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 transition-colors duration-200
                ${currentVariant.tab.base}
                ${
                  isDisabled
                    ? currentVariant.tab.disabled
                    : isActive
                    ? currentVariant.tab.active
                    : currentVariant.tab.inactive
                }
                ${fullWidth ? "flex-1 justify-center" : ""}
              `}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge
                  label={tab.badge}
                  size="sm"
                  color={isActive ? "blue" : "gray"}
                  variant="soft"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
