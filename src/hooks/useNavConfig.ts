// src/hooks/useNavConfig.ts
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/userContext";
import type { UserRole } from "@/types/roles";
import { PERMISSIONS, can } from "@/lib/auth/permissions";

export interface NavItem {
  name: string;
  path: string;
  icon?: string;
  requiresAuth?: boolean;
  roles?: UserRole[];
  /** Count shown next to the item (e.g. submissions waiting for review). */
  badge?: number;
}

export interface NavCategory {
  name: string;
  items: NavItem[];
  icon?: string;
  requiresAuth?: boolean;
  roles?: UserRole[];
}

export interface PageNavConfig {
  [key: string]: {
    categories: NavCategory[];
    title?: string;
    showSearch?: boolean;
    additionalActions?: NavItem[];
    standaloneItems?: NavItem[];
  };
}

const ADMIN_ROLES: UserRole[] = ["webmaster", "com_admin", "ed_admin", "dev"];
const MOD_ROLES: UserRole[] = [
  ...ADMIN_ROLES,
  "auditor",
  "course_rep",
  "lecturer",
];
const CONTRIBUTOR_ROLES: UserRole[] = [...MOD_ROLES, "collaborator"];
const REVIEWER_ROLES = (Object.keys(PERMISSIONS) as UserRole[]).filter((role) =>
  can(role, "admin.view_submissions"),
);
const SUBMISSIONS_PATH = "/admin/submissions";

const navConfig: PageNavConfig = {
  "/": {
    standaloneItems: [{ name: "Home", path: "/" }],
    categories: [
      {
        name: "Academic",
        items: [
          { name: "Materials", path: "/materials" },
          { name: "Past Questions", path: "/materials/past-questions" },
          { name: "Lecture Notes", path: "/materials/notes" },
          { name: "Textbooks", path: "/materials/textbooks" },
        ],
      },
      {
        name: "Community",
        items: [
          { name: "About Us", path: "/about" },
          { name: "Help Center", path: "/help" },
          { name: "Contact", path: "/contact" },
        ],
      },
    ],
    showSearch: true,
  },

  "/home": {
    title: "Library",
    standaloneItems: [
      { name: "My Library", path: "/home", requiresAuth: true },
      {
        name: "Upload",
        path: "/upload",
        requiresAuth: true,
        roles: CONTRIBUTOR_ROLES,
      },
    ],
    categories: [],
    showSearch: true,
  },

  "/dashboard": {
    title: "Dashboard",
    standaloneItems: [
      { name: "Overview", path: "/dashboard", requiresAuth: true },
    ],
    categories: [
      {
        name: "My Content",
        requiresAuth: true,
        items: [
          { name: "My Library", path: "/home", requiresAuth: true },
          {
            name: "Bookmarks",
            path: "/dashboard/bookmarks",
            requiresAuth: true,
          },
          {
            name: "Reading History",
            path: "/dashboard/history",
            requiresAuth: true,
          },
          {
            name: "My Uploads",
            path: "/dashboard/uploads",
            requiresAuth: true,
          },
        ],
      },
      {
        name: "Management",
        requiresAuth: true,
        roles: MOD_ROLES,
        items: [
          {
            name: "Admin Panel",
            path: "/admin",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
          {
            name: "Moderation",
            path: "/moderation",
            requiresAuth: true,
            roles: MOD_ROLES,
          },
          {
            name: "Submissions",
            path: SUBMISSIONS_PATH,
            requiresAuth: true,
            roles: REVIEWER_ROLES,
          },
          {
            name: "User Management",
            path: "/admin/users",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        name: "Tools",
        requiresAuth: true,
        items: [
          {
            name: "Upload Material",
            path: "/upload",
            requiresAuth: true,
            roles: CONTRIBUTOR_ROLES,
          },
          {
            name: "Analytics",
            path: "/dashboard/analytics",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
        ],
      },
    ],
    showSearch: true,
  },

  "/materials": {
    title: "Study Materials",
    standaloneItems: [{ name: "Home", path: "/" }],
    categories: [
      {
        name: "Browse Materials",
        items: [
          { name: "All Materials", path: "/materials" },
          { name: "Past Questions", path: "/materials/past-questions" },
          { name: "Lecture Notes", path: "/materials/notes" },
          { name: "Textbooks", path: "/materials/textbooks" },
        ],
      },
      {
        name: "By Subject",
        items: [
          { name: "Engineering", path: "/materials/engineering" },
          { name: "Sciences", path: "/materials/sciences" },
          { name: "Arts", path: "/materials/arts" },
          { name: "Social Sciences", path: "/materials/social-sciences" },
        ],
      },
    ],
    showSearch: true,
  },

  "/admin": {
    title: "Administration",
    standaloneItems: [
      {
        name: "Dashboard",
        path: "/admin",
        requiresAuth: true,
        roles: ADMIN_ROLES,
      },
    ],
    categories: [
      {
        name: "User Management",
        requiresAuth: true,
        roles: ADMIN_ROLES,
        items: [
          {
            name: "All Users",
            path: "/admin/users",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
          {
            name: "User Roles",
            path: "/admin/users/roles",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
          {
            name: "Banned Users",
            path: "/admin/users/banned",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        name: "Content Management",
        requiresAuth: true,
        roles: ADMIN_ROLES,
        items: [
          {
            name: "All Content",
            path: "/admin/content",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
          {
            name: "Reported Content",
            path: "/admin/content/reports",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
          {
            name: "Pending Approval",
            path: "/admin/content/pending",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        name: "System",
        requiresAuth: true,
        roles: ADMIN_ROLES,
        items: [
          {
            name: "Settings",
            path: "/admin/settings",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
          {
            name: "Analytics",
            path: "/admin/analytics",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
          {
            name: "Audit Logs",
            path: "/admin/logs",
            requiresAuth: true,
            roles: ADMIN_ROLES,
          },
        ],
      },
    ],
    showSearch: true,
  },

  "/admin/submissions": {
    title: "Submissions",
    standaloneItems: [
      { name: "My Library", path: "/home", requiresAuth: true },
      {
        name: "Submissions",
        path: SUBMISSIONS_PATH,
        requiresAuth: true,
        roles: REVIEWER_ROLES,
      },
      {
        name: "Admin Panel",
        path: "/admin",
        requiresAuth: true,
        roles: ADMIN_ROLES,
      },
    ],
    categories: [],
    showSearch: false,
  },

  "/moderation": {
    title: "Moderation",
    standaloneItems: [
      {
        name: "Overview",
        path: "/moderation",
        requiresAuth: true,
        roles: MOD_ROLES,
      },
    ],
    categories: [
      {
        name: "Content Review",
        requiresAuth: true,
        roles: MOD_ROLES,
        items: [
          {
            name: "Reports",
            path: "/moderation/reports",
            requiresAuth: true,
            roles: MOD_ROLES,
          },
          {
            name: "Flagged Content",
            path: "/moderation/review",
            requiresAuth: true,
            roles: MOD_ROLES,
          },
          {
            name: "Spam Detection",
            path: "/moderation/spam",
            requiresAuth: true,
            roles: MOD_ROLES,
          },
        ],
      },
    ],
    showSearch: false,
  },
};

export const useNavConfig = () => {
  const pathname = usePathname();
  const { userProfile, hasActiveSession, canAccessRoute } = useUser();
  const isReviewer =
    hasActiveSession && !!userProfile && REVIEWER_ROLES.includes(userProfile.role);

  // Submissions waiting for a reviewer, for the nav badge. Refreshed on
  // navigation; failures just hide the badge.
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  useEffect(() => {
    if (!isReviewer) return;
    const controller = new AbortController();
    fetch("/api/admin/submissions/count", { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pendingCount?: number } | null) => {
        setPendingSubmissions(data?.pendingCount ?? 0);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isReviewer, pathname]);

  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (item.requiresAuth && !hasActiveSession) return false;
        if (item.roles && item.roles.length > 0) {
          if (!userProfile) return false;
          return item.roles.includes(userProfile.role);
        }
        return true;
      })
      .map((item) =>
        item.path === SUBMISSIONS_PATH && isReviewer && pendingSubmissions > 0
          ? { ...item, badge: pendingSubmissions }
          : item,
      );
  };

  const filterCategories = (categories: NavCategory[]): NavCategory[] => {
    return categories
      .filter((cat) => {
        if (cat.requiresAuth && !hasActiveSession) return false;
        if (cat.roles && cat.roles.length > 0) {
          if (!userProfile) return false;
          return cat.roles.includes(userProfile.role);
        }
        return true;
      })
      .map((cat) => ({ ...cat, items: filterItems(cat.items) }))
      .filter((cat) => cat.items.length > 0);
  };

  const getCurrentPageConfig = () => {
    if (navConfig[pathname]) return navConfig[pathname];
    const basePath = `/${pathname.split("/")[1]}`;
    if (navConfig[basePath]) return navConfig[basePath];
    return navConfig["/"];
  };

  const currentConfig = useMemo(() => {
    const config = getCurrentPageConfig();
    return {
      ...config,
      standaloneItems: filterItems(config.standaloneItems ?? []),
      categories: filterCategories(config.categories ?? []),
      additionalActions: filterItems(config.additionalActions ?? []),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userProfile, hasActiveSession, pendingSubmissions]);

  const getUserSpecificItems = (): NavItem[] => {
    if (!hasActiveSession || !userProfile) {
      return [
        { name: "Sign In", path: "/auth?view=signin" },
        { name: "Sign Up", path: "/auth?view=signup" },
      ];
    }
    const items: NavItem[] = [
      { name: "My Library", path: "/home" },
      { name: "Dashboard", path: "/dashboard" },
      { name: "My Account", path: "/account" },
    ];
    if (ADMIN_ROLES.includes(userProfile.role))
      items.push({ name: "Admin Panel", path: "/admin" });
    if (MOD_ROLES.includes(userProfile.role))
      items.push({ name: "Moderation", path: "/moderation" });
    if (REVIEWER_ROLES.includes(userProfile.role))
      items.push({
        name: "Review Submissions",
        path: SUBMISSIONS_PATH,
        badge: pendingSubmissions || undefined,
      });
    return items;
  };

  const getBreadcrumbs = (): NavItem[] => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: NavItem[] = [{ name: "Home", path: "/" }];
    let currentPath = "";
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      const config = navConfig[currentPath];
      const name =
        config?.title ??
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      crumbs.push({ name, path: currentPath });
    });
    return crumbs;
  };

  const mobileTabs: NavItem[] = hasActiveSession
    ? [
        { name: "Home", path: "/home", icon: "home" },
        { name: "Dashboard", path: "/dashboard", icon: "layout" },
        { name: "Upload", path: "/upload", icon: "upload" },
        { name: "Profile", path: "/profile", icon: "user" },
      ]
    : [];

  const isActive = (path: string) => {
    if (path === "/" || path === "/home")
      return pathname === "/" || pathname === "/home";
    return pathname.startsWith(path);
  };

  return {
    currentConfig,
    userItems: getUserSpecificItems(),
    mobileTabs,
    breadcrumbs: getBreadcrumbs(),
    isCurrentRouteAccessible: canAccessRoute(pathname),
    isActive,
    hasActiveSession,
    userProfile,
    canAccessRoute,
  };
};
