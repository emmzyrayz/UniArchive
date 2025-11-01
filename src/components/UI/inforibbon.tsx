"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LuCircleAlert,
  LuTrendingUp,
  LuInfo,
  LuBell,
  LuCircleCheck,
  LuTriangleAlert,
} from "react-icons/lu";
import type { IconType } from "react-icons";
// import { RibbonItem } from "@/assets/data/layoutData";

export interface RibbonItem {
  id: number;
  type: "alert" | "warning" | "trending" | "update" | "info" | "success";
  message: string;
}

interface InfoRibbonProps {
  items: RibbonItem[];
  intervalDuration?: number;
}

// Type configuration with icons and colors
const TYPE_CONFIG: Record<
  RibbonItem["type"],
  { icon: IconType; color: string; emoji: string }
> = {
  alert: {
    icon: LuCircleAlert,
    color: "from-red-400 to-red-700",
    emoji: "🚨",
  },
  warning: {
    icon: LuTriangleAlert,
    color: "from-yellow-400 to-yellow-700",
    emoji: "⚠️",
  },
  trending: {
    icon: LuTrendingUp,
    color: "from-blue-400 to-blue-700",
    emoji: "🔥",
  },
  update: {
    icon: LuBell,
    color: "from-purple-400 to-purple-700",
    emoji: "🔔",
  },
  info: {
    icon: LuInfo,
    color: "from-cyan-400 to-cyan-700",
    emoji: "ℹ️",
  },
  success: {
    icon: LuCircleCheck,
    color: "from-green-400 to-green-700",
    emoji: "✅",
  },
};

export default function InfoRibbon({ items, intervalDuration = 6000 }: InfoRibbonProps) {
  const ribbonItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        config: TYPE_CONFIG[item.type] || TYPE_CONFIG.info,
      })),
    [items]
  );

  const [currentType, setCurrentType] = useState(
    ribbonItems[0]?.type || "info"
  );

  const getNextType = useCallback(
    (prev: string) => {
      const currentIndex = ribbonItems.findIndex((i) => i.type === prev);
      const nextIndex = (currentIndex + 1) % ribbonItems.length;
      return ribbonItems[nextIndex].type;
    },
    [ribbonItems]
  );

  useEffect(() => {
    if (ribbonItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentType((prev) => getNextType(prev));
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [getNextType, intervalDuration, ribbonItems.length]);

  const activeItem = ribbonItems.find((i) => i.type === currentType);
  const badgeColor = activeItem?.config.color || TYPE_CONFIG.info.color;
  const badgeEmoji = activeItem?.config.emoji || TYPE_CONFIG.info.emoji;

  if (ribbonItems.length === 0) return null;

  return (
    <div className="w-full bg-white border-y border-gray-200 overflow-hidden">
      <div className="relative h-10 flex items-center group">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white z-10 pointer-events-none" />

        {/* Dynamic Badge */}
        <div className="absolute left-0 h-full flex items-center z-20">
          <div
            className={`flex items-center gap-2 px-4 h-full text-white font-bold text-sm md:text-base whitespace-nowrap bg-gradient-to-r ${badgeColor} group-hover:animate-pulse transition-all duration-300`}
          >
            <span className="hidden sm:inline">{badgeEmoji}</span>
            {currentType.toUpperCase()}
          </div>
        </div>

        {/* Scrolling Content */}
        <div className="flex items-center h-full pl-28 md:pl-40 overflow-hidden">
          <div className="flex gap-8 animate-scroll group-hover:paused group-hover:[animation-play-state:paused]">
            {ribbonItems.concat(ribbonItems).map((item, i) => {
              const IconComponent = item.config.icon;
              return (
                <div
                  key={`${item.id}-${i}`}
                  className="flex items-center gap-3 px-6 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex-shrink-0 whitespace-nowrap cursor-pointer group/item"
                >
                  <div
                    className={`bg-gradient-to-r ${item.config.color} text-white p-1.5 rounded group-hover/item:scale-110 transition-transform`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-sm md:text-base text-gray-800 font-medium">
                    {item.message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-scroll {
          animation: scroll 60s linear infinite;
        }

        .group:hover .animate-scroll {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
