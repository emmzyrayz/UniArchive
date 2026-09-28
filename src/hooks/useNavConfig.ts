// src/hooks/useNavConfig.ts
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/userContext";
import type { UserRole } from "@/types/roles";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import type { AdminCounts } from "@/types/admin";

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
const rolesThatCan = (action: Parameters<typeof can>[1]) =>
  (Object.keys(PERMISSIONS) as UserRole[]).filter((role) => can(role, action));
const USER_ADMIN_ROLES = rolesThatCan("manage_users");
const INSTITUTION_ADMIN_ROLES = rolesThatCan("manage_institution");

const SUBMISSIONS_PATH = "/admin/submissions";
const ROLE_APPLICATIONS_PATH = "/admin/role-applications";
const SUGGESTIONS_PATH = "/admin/suggestions";
const COMMENTS_PATH = "/admin/comments";

// Every admin page, each shown only to the roles its page accepts
const ADMIN_ITEMS: NavItem[] = [
  { name: "Admin Dashboard", path: "/admin", requiresAuth: true, roles: REVIEWER_ROLES },
  { name: "Submissions", path: SUBMISSIONS_PATH, requiresAuth: true, roles: REVIEWER_ROLES },
  { name: "Role Applications", path: ROLE_APPLICATIONS_PATH, requiresAuth: true, roles: REVIEWER_ROLES },
  { name: "School Suggestions", path: SUGGESTIONS_PATH, requiresAuth: true, roles: INSTITUTION_ADMIN_ROLES },
  { name: "Materials", path: "/admin/materials", requiresAuth: true, roles: REVIEWER_ROLES },
  { name: "Comments", path: COMMENTS_PATH, requiresAuth: true, roles: REVIEWER_ROLES },
  { name: "Users", path: "/admin/users", requiresAuth: true, roles: USER_ADMIN_ROLES },
  { name: "Institutions", path: "/admin/institutions", requiresAuth: true, roles: INSTITUTION_ADMIN_ROLES },
];

// Public: signed-out visitors can browse the UniLibrary too
const UNILIBRARY_PATH = "/unilibrary";
const UNILIBRARY_ITEMS: NavItem[] = [
  { name: "All Materials", path: UNILIBRARY_PATH },
  { name: "Past Questions", path: `${UNILIBRARY_PATH}?category=EXAMS` },
  { name: "Notes & Summaries", path: `${UNILIBRARY_PATH}?category=LEARNING_AIDS` },
  { name: "Textbooks", path: `${UNILIBRARY_PATH}?category=BOOKS` },
];

const navConfig: PageNavConfig = {
  "/": {
    standaloneItems: [
      { name: "Home", path: "/" },
      { name: "UniLibrary", path: UNILIBRARY_PATH },
    ],
    categories: [
      {
        name: "Academic",
        items: UNILIBRARY_ITEMS,
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
      { name: "UniLibrary", path: UNILIBRARY_PATH },
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
          ...ADMIN_ITEMS,
          {
            name: "Moderation",
            path: "/moderation",
            requiresAuth: true,
            roles: MOD_ROLES,
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

  [UNILIBRARY_PATH]: {
    title: "UniLibrary",
    standaloneItems: [
      { name: "Home", path: "/" },
      { name: "My Library", path: "/home", requiresAuth: true },
    ],
    categories: [{ name: "Browse", items: UNILIBRARY_ITEMS }],
    showSearch: true,
  },

  // Also used for every /admin/* page (see getCurrentPageConfig)
  "/admin": {
    title: "Admin",
    standaloneItems: [{ name: "My Library", path: "/home", requiresAuth: true }],
    categories: [{ name: "Admin", requiresAuth: true, roles: REVIEWER_ROLES, items: ADMIN_ITEMS }],
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

  // Pending items in the reviewer queues, for the nav badges. Refreshed on
  // navigation; failures just hide the badges.
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!isReviewer) return;
    const controller = new AbortController();
    fetch("/api/admin/counts", { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: Partial<AdminCounts> | null,
        ) => {
          setPendingCounts({
            [SUBMISSIONS_PATH]: data?.pendingSubmissions ?? 0,
            [ROLE_APPLICATIONS_PATH]: data?.pendingRoleApplications ?? 0,
            [SUGGESTIONS_PATH]: (data?.pendingSchoolSuggestions ?? 0) + (data?.possibleDuplicates ?? 0),
            [COMMENTS_PATH]: data?.reportedComments ?? 0,
          });
        },
      )
      .catch(() => {});
    return () => controller.abort();
  }, [isReviewer, pathname]);
  const badgeFor = (path: string) =>
    isReviewer && pendingCounts[path] ? pendingCounts[path] : undefined;

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
      .map((item) => {
        const badge = badgeFor(item.path);
        return badge ? { ...item, badge } : item;
      });
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
  }, [pathname, userProfile, hasActiveSession, pendingCounts]);

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
    if (REVIEWER_ROLES.includes(userProfile.role))
      items.push({ name: "Admin Panel", path: "/admin" });
    if (MOD_ROLES.includes(userProfile.role))
      items.push({ name: "Moderation", path: "/moderation" });
    if (REVIEWER_ROLES.includes(userProfile.role))
      items.push(
        { name: "Review Submissions", path: SUBMISSIONS_PATH, badge: badgeFor(SUBMISSIONS_PATH) },
        {
          name: "Role Applications",
          path: ROLE_APPLICATIONS_PATH,
          badge: badgeFor(ROLE_APPLICATIONS_PATH),
        },
      );
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
        { name: "UniLibrary", path: UNILIBRARY_PATH, icon: "library" },
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
