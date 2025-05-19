// hooks/usePageMonitor.ts
import {useState, useEffect} from "react";
import {usePathname, useSearchParams} from "next/navigation";

export type PageRule = {
  // The path to match against (can be a string or regex)
  path: string | RegExp;
  // Type of match to perform
  matchType: "startsWith" | "exact" | "regex" | "includes";
  // Optional query parameters to check (all must match if specified)
  queryParams?: Record<string, string>;
  // Components to hide (CSS selector strings)
  hideComponents?: string[];
  // Custom classnames to add to the body element
  bodyClass?: string;
};

export type PageMonitorConfig = {
  rules: PageRule[];
  // Default components to hide on all matched pages
  defaultHideComponents?: string[];
};

/**
 * Custom hook to monitor the current page against defined rules
 * and determine which components should be hidden
 */
export const usePageMonitor = (config: PageMonitorConfig) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [matchedRules, setMatchedRules] = useState<PageRule[]>([]);
  const [componentsToHide, setComponentsToHide] = useState<string[]>([]);

  useEffect(() => {
    // Function to check if the current URL matches a rule
    const checkPathMatch = (rule: PageRule): boolean => {
      // Check path based on matchType
      if (rule.matchType === "startsWith" && typeof rule.path === "string") {
        if (!pathname.startsWith(rule.path)) return false;
      } else if (rule.matchType === "exact" && typeof rule.path === "string") {
        if (pathname !== rule.path) return false;
      } else if (
        rule.matchType === "includes" &&
        typeof rule.path === "string"
      ) {
        if (!pathname.includes(rule.path)) return false;
      } else if (rule.matchType === "regex" && rule.path instanceof RegExp) {
        if (!rule.path.test(pathname)) return false;
      } else {
        return false;
      }

      // Check query parameters if specified
      if (rule.queryParams) {
        for (const [key, value] of Object.entries(rule.queryParams)) {
          if (searchParams.get(key) !== value) {
            return false;
          }
        }
      }

      return true;
    };

    // Find all matching rules
    const matched = config.rules.filter(checkPathMatch);
    setMatchedRules(matched);

    // Collect all components to hide
    const hideSelectors = [...(config.defaultHideComponents || [])];
    matched.forEach((rule) => {
      if (rule.hideComponents) {
        hideSelectors.push(...rule.hideComponents);
      }
    });

    setComponentsToHide([...new Set(hideSelectors)]); // Remove duplicates

    // Apply body classes
    const bodyClasses = matched
      .filter((rule) => rule.bodyClass)
      .map((rule) => rule.bodyClass as string);

    if (bodyClasses.length > 0) {
      document.body.classList.add(...bodyClasses);
    }

    // Cleanup function
    return () => {
      bodyClasses.forEach((className) => {
        document.body.classList.remove(className);
      });
    };
  }, [pathname, searchParams, config]);

  // Apply the hiding CSS to the DOM elements
  useEffect(() => {
    if (typeof window === "undefined") return;

    // First, restore any previously hidden elements
    document
      .querySelectorAll('[data-pagemonitor-hidden="true"]')
      .forEach((el) => {
        (el as HTMLElement).style.display = "";
        el.removeAttribute("data-pagemonitor-hidden");
      });

    // Hide the current components
    componentsToHide.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        (el as HTMLElement).style.display = "none";
        el.setAttribute("data-pagemonitor-hidden", "true");
      });
    });
  }, [componentsToHide]);

  return {
    matchedRules,
    componentsToHide,
    isMonitored: matchedRules.length > 0,
  };
};
