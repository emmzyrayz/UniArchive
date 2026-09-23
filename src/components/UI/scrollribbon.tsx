"use client";

import React, { useEffect, useRef, useState } from "react";

// Platform announcements shown in the strip above the navbar
type RibbonItemType = "announcement" | "news" | "materials" | "updates";

interface RibbonItem {
  type: RibbonItemType;
  text: string;
}

const ITEMS: RibbonItem[] = [
  {
    type: "announcement",
    text: "UniArchive is now live — upload and read your study materials in your browser.",
  },
  {
    type: "news",
    text: "PDF reader now supports vertical scroll and single-page modes. Try it on your next document.",
  },
  {
    type: "materials",
    text: "Sign up free — no school email required to get started.",
  },
  {
    type: "updates",
    text: "Dark mode, bookmarks, and highlights are available in the reader.",
  },
];

const SCROLL_THRESHOLD = 50;

interface ScrollRibbonProps {
  displayTime?: number; // How long each item is shown, in ms
  transitionTime?: number; // Fade-in of each item, in ms
  pauseOnHover?: boolean;
  delayBetweenCycles?: number; // While scrolled: hidden for this long between cycles, in ms
  className?: string;
}

function RibbonIcon({ type }: { type: RibbonItemType }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (type) {
    case "announcement": // megaphone
      return (
        <svg {...common} className="shrink-0 text-violet-400">
          <path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z" />
          <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
        </svg>
      );
    case "news": // newspaper
      return (
        <svg {...common} className="shrink-0 text-sky-400">
          <path d="M4 5h13v14H6a2 2 0 01-2-2V5z" />
          <path d="M17 9h3v8a2 2 0 01-2 2" />
          <path d="M8 9h5M8 13h5M8 17h3" />
        </svg>
      );
    case "materials": // book
      return (
        <svg {...common} className="shrink-0 text-emerald-400">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      );
    case "updates": // chart
      return (
        <svg {...common} className="shrink-0 text-cyan-400">
          <path d="M3 3v18h18" />
          <path d="M7 15l4-4 3 3 5-6" />
        </svg>
      );
  }
}

export const ScrollRibbon: React.FC<ScrollRibbonProps> = ({
  displayTime = 5000,
  transitionTime = 400,
  pauseOnHover = true,
  delayBetweenCycles = 8000,
  className = "",
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  // Only used while scrolled; at the top of the page the ribbon is always shown
  const [cycleVisible, setCycleVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  const shown = !isScrolled || cycleVisible;
  const current = ITEMS[activeIndex];

  // Scroll position -> fixed/relative mode. Only updates state when the
  // threshold is crossed, not on every scroll event.
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > SCROLL_THRESHOLD;
      if (scrolled === scrolledRef.current) return;
      scrolledRef.current = scrolled;
      setIsScrolled(scrolled);
      // Entering scrolled mode starts a fresh visible cycle
      if (scrolled) setCycleVisible(true);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Rotate through the items
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(
      () => setActiveIndex((i) => (i + 1) % ITEMS.length),
      displayTime,
    );
    return () => clearInterval(id);
  }, [isPaused, displayTime]);

  // While scrolled: show for one full cycle, hide for delayBetweenCycles, repeat
  useEffect(() => {
    if (!isScrolled) return;
    const id = setTimeout(
      () => setCycleVisible((visible) => !visible),
      cycleVisible ? ITEMS.length * displayTime : delayBetweenCycles,
    );
    return () => clearTimeout(id);
  }, [isScrolled, cycleVisible, displayTime, delayBetweenCycles]);

  // Report the ribbon's height to anything laid out beneath it. Observes the
  // ribbon element only, not the whole document.
  useEffect(() => {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;
    const report = () =>
      document.dispatchEvent(
        new CustomEvent("ribbonHeightChanged", {
          detail: { height: ribbon.offsetHeight },
        }),
      );
    report();
    const observer = new ResizeObserver(report);
    observer.observe(ribbon);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.dispatchEvent(
      new CustomEvent("ribbonVisibilityChanged", {
        detail: { isVisible: shown },
      }),
    );
  }, [shown]);

  return (
    // `scroll-ribbon` is how the navbar finds this element to measure it
    <div
      ref={ribbonRef}
      role="region"
      aria-label="Announcements"
      className={`scroll-ribbon w-full overflow-hidden border-b border-white/10 transition-all duration-300 ${
        isScrolled
          ? "fixed top-0 left-0 z-50 h-8 bg-neutral-900/90 backdrop-blur-sm"
          : "relative h-12 bg-neutral-900"
      } ${shown ? "flex items-center justify-center opacity-100" : "hidden h-0 opacity-0"} ${className}`}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div className="flex h-full w-full items-center justify-center px-4">
        <p
          key={activeIndex}
          className="ribbon-item flex min-w-0 items-center gap-2"
          style={{ animation: `ribbon-fade ${transitionTime}ms ease-in-out` }}
        >
          <RibbonIcon type={current.type} />
          <span
            className={`truncate text-white/90 transition-all duration-300 ${
              isScrolled ? "text-[11px]" : "text-xs sm:text-[13px]"
            }`}
          >
            {current.text}
          </span>
        </p>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-white/10" aria-hidden>
        <div
          className="h-full bg-sky-400"
          style={{
            width: `${((activeIndex + 1) / ITEMS.length) * 100}%`,
            transition: "width 0.3s linear",
          }}
        />
      </div>

      <style>{`
        @keyframes ribbon-fade {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ribbon-item { animation: none !important; }
        }
      `}</style>
    </div>
  );
};
