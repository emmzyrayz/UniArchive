// /hooks/useLayoutConfig.tsx
"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

export interface LayoutConfig {
  showNavbar: boolean;
  showInfoRibbon: boolean;
  showFooter: boolean;
}

/**
 * Hook to determine which layout components should be visible
 * based on the current route
 */
export function useLayoutConfig(): LayoutConfig {
  const pathname = usePathname();

  return useMemo(() => {
    // Auth routes - hide all layout components
    if (pathname.startsWith("/auth")) {
      return {
        showNavbar: false,
        showInfoRibbon: false,
        showFooter: false,
      };
    }

    // Courses routes - hide navbar (has own navbar), show info ribbon and footer
    if (pathname.startsWith("/courses")) {
      return {
        showNavbar: false,
        showInfoRibbon: true,
        showFooter: true,
      };
    }

    // Admin/Dashboard routes - hide all (typically has own layout)
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return {
        showNavbar: false,
        showInfoRibbon: false,
        showFooter: false,
      };
    }

    // Profile/Settings routes - show only navbar and footer
    if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) {
      return {
        showNavbar: true,
        showInfoRibbon: false,
        showFooter: true,
      };
    }

    // Default for public routes (/, /about, /contact, etc.)
    return {
      showNavbar: true,
      showInfoRibbon: true,
      showFooter: true,
    };
  }, [pathname]);
}