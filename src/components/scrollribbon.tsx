"use client";

import React, {useState, useEffect, useRef} from "react";
import {
  FaNewspaper,
  FaBullhorn,
  FaBook,
  FaChartLine,
  FaExclamationTriangle,
} from "react-icons/fa";

// Define types for our news items
type NewsItemType =
  | "news"
  | "announcement"
  | "materials"
  | "updates"
  | "warning";

interface NewsItem {
  id: number;
  type: NewsItemType;
  text: string;
}

interface ScrollRibbonProps {
  displayTime?: number; // Time each item is shown in milliseconds
  transitionTime?: number; // Transition time between items in milliseconds
  pauseOnHover?: boolean;
  delayBetweenCycles?: number; // Delay in milliseconds before repeating
  className?: string;
}

export const ScrollRibbon: React.FC<ScrollRibbonProps> = ({
  displayTime = 5000, // Show each item for 5 seconds
  transitionTime = 800, // 0.8 second transition between items
  pauseOnHover = true,
  delayBetweenCycles = 8000, // 8 seconds delay between cycles
  className = "",
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  // const [ribbonHeight, setRibbonHeight] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  // Sample news items
  const newsItems: NewsItem[] = [
    {
      id: 1,
      type: "news",
      text: "New courses available for the summer semester! Check the catalog for more information.",
    },
    {
      id: 2,
      type: "warning",
      text: "Campus maintenance scheduled for this weekend. Some facilities may be temporarily unavailable.",
    },
    {
      id: 3,
      type: "announcement",
      text: "Student council elections next week. Make your voice heard and vote!",
    },
    {
      id: 4,
      type: "materials",
      text: "Library extended hours during finals week. Open until midnight Monday through Friday.",
    },
    {
      id: 5,
      type: "updates",
      text: "New online learning platform launching next month. Training sessions available now.",
    },
  ];

  // Function to get icon based on item type with animation classes
  const getIcon = (type: NewsItemType, isLeft: boolean = true) => {
    // Base classes for all icons
    let baseClasses = "inline-block";

    // Animation classes based on type
    switch (type) {
      case "news":
        baseClasses += " text-blue-500 animate-pulse";
        return (
          <FaNewspaper
            className={`${baseClasses} text-[18px] lg:text-[20px] ${
              isLeft ? "mr-3" : "ml-3"
            }`}
          />
        );
      case "announcement":
        baseClasses += " text-purple-500 animate-bounce";
        return (
          <FaBullhorn
            className={`${baseClasses} text-[18px] lg:text-[20px] ${isLeft ? "mr-3" : "ml-3"}`}
          />
        );
      case "materials":
        baseClasses += " text-green-500";
        return (
          <FaBook
            className={`${baseClasses} text-[18px] lg:text-[20px] ${
              isLeft ? "mr-3" : "ml-3"
            } hover:scale-110 transition-transform`}
          />
        );
      case "updates":
        baseClasses += " text-cyan-500";
        return (
          <FaChartLine
            className={`${baseClasses} text-[18px] lg:text-[20px] ${
              isLeft ? "mr-3" : "ml-3"
            } animate-pulse`}
          />
        );
      case "warning":
        return (
          <div
            className={`${baseClasses} inline-block text-[18px] lg:text-[20px] ${
              isLeft ? "mr-3" : "ml-3"
            }`}
          >
            <FaExclamationTriangle
              className={`
                animate-warning-flash 
                animate-spin-slow 
                animate-scale
                text-yellow-500
              `}
            />
          </div>
        );
    }
  };

  useEffect(() => {
    // Capture the current ref value at the start of the effect
    const currentRibbon = ribbonRef.current;

    const updateRibbonHeight = () => {
      if (currentRibbon) {
        // Instead of storing height in state, just use it directly
        const height = currentRibbon.offsetHeight;

        // Dispatch custom event for Navbar to detect height change
        const ribbonHeightEvent = new CustomEvent("ribbonHeightChanged", {
          detail: {height},
        });
        document.dispatchEvent(ribbonHeightEvent);

        // Also dispatch visibility state
        const ribbonVisibilityEvent = new CustomEvent(
          "ribbonVisibilityChanged",
          {
            detail: {isVisible},
          }
        );
        document.dispatchEvent(ribbonVisibilityEvent);
      }
    };

    // Update height after component mounts
    updateRibbonHeight();

    // Set up resize observer to detect changes in the ribbon's height
    const resizeObserver = new ResizeObserver(() => {
      updateRibbonHeight();
    });

    if (currentRibbon) {
      resizeObserver.observe(currentRibbon);
    }

    return () => {
      // Use the captured ref value in cleanup
      if (currentRibbon) {
        resizeObserver.unobserve(currentRibbon);
      }
      resizeObserver.disconnect();
    };
  }, [isScrolled, isVisible]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50); // Adjust threshold as needed
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Manage item rotation
  useEffect(() => {
    const startItemRotation = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          setActiveItemIndex((prevIndex) => (prevIndex + 1) % newsItems.length);
        }
      }, displayTime);
    };

    startItemRotation();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, displayTime, newsItems.length]);

  // Handle cycle visibility
  useEffect(() => {
    const startCycle = () => {
      setIsVisible(true);

      // Notify navbar that ribbon is visible
      document.dispatchEvent(
        new CustomEvent("ribbonVisibilityChanged", {
          detail: {isVisible: true},
        })
      );

      // Calculate total cycle time
      const totalCycleTime = newsItems.length * displayTime;

      // Clear any existing timeout
      if (cycleTimeoutRef.current) {
        clearTimeout(cycleTimeoutRef.current);
      }

      // Hide after cycle if page is scrolled
      cycleTimeoutRef.current = setTimeout(() => {
        if (isScrolled) {
          setIsVisible(false);

          // Notify navbar that ribbon is hidden
          document.dispatchEvent(
            new CustomEvent("ribbonVisibilityChanged", {
              detail: {isVisible: false},
            })
          );

          // Restart cycle after delay
          cycleTimeoutRef.current = setTimeout(() => {
            if (isScrolled) {
              startCycle();
            }
          }, delayBetweenCycles);
        }
      }, totalCycleTime);
    };

    // Only restart the cycle when scroll state changes
    if (isScrolled) {
      startCycle();
    } else {
      setIsVisible(true);

      // Notify navbar that ribbon is visible when not scrolled
      document.dispatchEvent(
        new CustomEvent("ribbonVisibilityChanged", {
          detail: {isVisible: true},
        })
      );
    }

    return () => {
      if (cycleTimeoutRef.current) {
        clearTimeout(cycleTimeoutRef.current);
      }
    };
  }, [isScrolled, delayBetweenCycles, displayTime, newsItems.length]);

  const currentItem = newsItems[activeItemIndex];

  return (
    <>
      {/* Add custom animations to the global styles */}
      <style jsx global>{`
        @keyframes warning-flash {
          0%,
          100% {
            color: #000;
          }
          50% {
            color: #f59e0b;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes scale {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }

        .animate-warning-flash {
          animation: warning-flash 1s infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-scale {
          animation: scale 2s ease-in-out infinite;
        }
      `}</style>

      <div
        ref={ribbonRef}
        className={`scroll-ribbon transition-all duration-300 overflow-hidden w-full py-2 ${
          isScrolled
            ? "fixed top-0 left-0 z-50 h-8 bg-gray-900/90 backdrop-blur-sm"
            : "relative h-12 bg-gray-800"
        } ${
          isVisible
            ? "opacity-100 flex items-center justify-center"
            : "opacity-0 hidden h-0"
        } ${className}`}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      >
        <div className="flex items-center justify-center h-full px-4">
          <div
            className="flex items-center justify-center w-full h-full"
            style={{transition: `opacity ${transitionTime}ms ease-in-out`}}
          >
            <div className="flex items-center gap-2">
              {getIcon(currentItem.type, true)}
              <span
                className={`${
                  isScrolled ? "text-[9px]" : "text-[12px]"
                } transition-all duration-300 ${
                  currentItem.type === "warning"
                    ? "text-yellow-100 font-semibold text-[9px]"
                    : "text-white"
                }`}
              >
                {currentItem.text}
              </span>
              {getIcon(currentItem.type, false)}
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-700">
          <div
            className="h-full bg-blue-500"
            style={{
              width: `${((activeItemIndex + 1) / newsItems.length) * 100}%`,
              transition: "width 0.3s linear",
            }}
          />
        </div>
      </div>
    </>
  );
};