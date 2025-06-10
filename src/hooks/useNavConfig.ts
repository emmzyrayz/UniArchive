import { usePathname } from "next/navigation";
import { useUser } from "@/context/userContext";

// Type definitions for navbar items
export interface NavItem {
  name: string;
  path: string;
  icon?: string;
  requiresAuth?: boolean;
  roles?: ("admin" | "contributor" | "student" | "mod" | "devsupport")[];
}

// Category structure for dropdown menus
export interface NavCategory {
  name: string;
  items: NavItem[];
  icon?: string;
  requiresAuth?: boolean;
  roles?: ("admin" | "contributor" | "student" | "mod" | "devsupport")[];
}

export interface PageNavConfig {
  [key: string]: {
    categories: NavCategory[];
    title?: string;
    showSearch?: boolean;
    additionalActions?: NavItem[];
    standaloneItems?: NavItem[]; // Items that don't belong to any category
  };
}

// Define navigation categories for different pages with auth and role requirements
const navConfig: PageNavConfig = {
  // Default navigation for homepage
  "/": {
    standaloneItems: [
      { name: "Home", path: "/" },
    ],
    categories: [
      {
        name: "Academic",
        items: [
          { name: "Materials", path: "/materials" },
          { name: "Past Questions", path: "/materials/past-questions" },
          { name: "Lecture Notes", path: "/materials/notes" },
          { name: "Textbooks", path: "/materials/textbooks" },
        ]
      },
      {
        name: "Community",
        items: [
          { name: "Sign in", path: "/auth/signin" },
          { name: "Get Started", path: "/auth/signup" },
        ]
      }
    ],
    showSearch: true,
  },
  
  // Dashboard page navigation (requires authentication)
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
          { name: "My Courses", path: "/dashboard/courses", requiresAuth: true },
          { name: "My Materials", path: "/dashboard/materials", requiresAuth: true },
          { name: "My Uploads", path: "/dashboard/uploads", requiresAuth: true },
        ]
      },
      {
        name: "Management",
        requiresAuth: true,
        roles: ["admin", "mod"],
        items: [
          { 
            name: "Admin Panel", 
            path: "/dashboard/admin", 
            requiresAuth: true, 
            roles: ["admin"] 
          },
          { 
            name: "Moderation", 
            path: "/dashboard/moderation", 
            requiresAuth: true, 
            roles: ["admin", "mod"] 
          },
          { 
            name: "User Management", 
            path: "/dashboard/users", 
            requiresAuth: true, 
            roles: ["admin"] 
          },
        ]
      },
      {
        name: "Tools",
        requiresAuth: true,
        items: [
          { 
            name: "Upload Material", 
            path: "/dashboard/upload", 
            requiresAuth: true,
            roles: ["admin", "contributor", "student", "mod"]
          },
          { name: "Analytics", path: "/dashboard/analytics", requiresAuth: true },
        ]
      }
    ],
    showSearch: true,
  },
  
  // School page navigation
  "/schools": {
    title: "Schools",
    standaloneItems: [
      { name: "Home", path: "/" },
    ],
    categories: [
      {
        name: "Browse",
        items: [
          { name: "All Schools", path: "/schools" },
          { name: "Departments", path: "/schools/departments" },
          { name: "Faculty", path: "/schools/faculty" },
        ]
      }
    ],
    showSearch: true,
  },
  
  // Materials page
  "/materials": {
    title: "Study Materials",
    standaloneItems: [
      { name: "Home", path: "/" },
    ],
    categories: [
      {
        name: "Browse Materials",
        items: [
          { name: "All Materials", path: "/materials" },
          { name: "Past Questions", path: "/materials/past-questions" },
          { name: "Lecture Notes", path: "/materials/notes" },
          { name: "Textbooks", path: "/materials/textbooks" },
        ]
      },
      {
        name: "By Subject",
        items: [
          { name: "Engineering", path: "/materials/engineering" },
          { name: "Sciences", path: "/materials/sciences" },
          { name: "Arts", path: "/materials/arts" },
          { name: "Social Sciences", path: "/materials/social-sciences" },
        ]
      }
    ],
    showSearch: true,
  },
  
  // Account page (requires authentication)
  "/account": {
    title: "My Account",
    standaloneItems: [
      { name: "Dashboard", path: "/dashboard", requiresAuth: true },
    ],
    categories: [
      {
        name: "Profile",
        requiresAuth: true,
        items: [
          { name: "My Profile", path: "/account/profile", requiresAuth: true },
          { name: "Settings", path: "/account/settings", requiresAuth: true },
        ]
      },
      {
        name: "Activity",
        requiresAuth: true,
        items: [
          { name: "My Uploads", path: "/account/uploads", requiresAuth: true },
          { name: "Activity Log", path: "/account/activity", requiresAuth: true },
          { name: "Bookmarks", path: "/account/bookmarks", requiresAuth: true },
        ]
      }
    ],
    showSearch: false,
  },
  
  // Admin routes (admin only)
  "/admin": {
    title: "Administration",
    standaloneItems: [
      { name: "Dashboard", path: "/admin", requiresAuth: true, roles: ["admin"] },
    ],
    categories: [
      {
        name: "User Management",
        requiresAuth: true,
        roles: ["admin"],
        items: [
          { name: "All Users", path: "/admin/users", requiresAuth: true, roles: ["admin"] },
          { name: "User Roles", path: "/admin/users/roles", requiresAuth: true, roles: ["admin"] },
          { name: "Banned Users", path: "/admin/users/banned", requiresAuth: true, roles: ["admin"] },
        ]
      },
      {
        name: "Content Management",
        requiresAuth: true,
        roles: ["admin"],
        items: [
          { name: "All Content", path: "/admin/content", requiresAuth: true, roles: ["admin"] },
          { name: "Reported Content", path: "/admin/content/reports", requiresAuth: true, roles: ["admin"] },
          { name: "Pending Approval", path: "/admin/content/pending", requiresAuth: true, roles: ["admin"] },
        ]
      },
      {
        name: "System",
        requiresAuth: true,
        roles: ["admin"],
        items: [
          { name: "Settings", path: "/admin/settings", requiresAuth: true, roles: ["admin"] },
          { name: "Analytics", path: "/admin/analytics", requiresAuth: true, roles: ["admin"] },
          { name: "System Backup", path: "/admin/backup", requiresAuth: true, roles: ["admin"] },
          { name: "Audit Logs", path: "/admin/logs", requiresAuth: true, roles: ["admin"] },
        ]
      }
    ],
    showSearch: true,
  },
  
  // Moderation routes (moderators and admins)
  "/moderation": {
    title: "Moderation",
    standaloneItems: [
      { name: "Dashboard", path: "/moderation", requiresAuth: true, roles: ["admin", "mod"] },
    ],
    categories: [
      {
        name: "Content Review",
        requiresAuth: true,
        roles: ["admin", "mod"],
        items: [
          { name: "Reports", path: "/moderation/reports", requiresAuth: true, roles: ["admin", "mod"] },
          { name: "Flagged Content", path: "/moderation/review", requiresAuth: true, roles: ["admin", "mod"] },
          { name: "Spam Detection", path: "/moderation/spam", requiresAuth: true, roles: ["admin", "mod"] },
        ]
      },
      {
        name: "User Actions",
        requiresAuth: true,
        roles: ["admin", "mod"],
        items: [
          { name: "User Reports", path: "/moderation/user-reports", requiresAuth: true, roles: ["admin", "mod"] },
          { name: "Warnings", path: "/moderation/warnings", requiresAuth: true, roles: ["admin", "mod"] },
          { name: "Suspensions", path: "/moderation/actions", requiresAuth: true, roles: ["admin", "mod"] },
        ]
      }
    ],
    showSearch: true,
  },
};

export const useNavConfig = () => {
  const pathname = usePathname();
  const { getFilteredNavItems, canAccessRoute, userProfile, hasActiveSession } = useUser();

  // Helper function to filter categories based on user permissions
  const getFilteredCategories = (categories: NavCategory[]): NavCategory[] => {
    return categories
      .filter(category => {
        // Check if user can access this category
        if (category.requiresAuth && !hasActiveSession) return false;
        if (category.roles && category.roles.length > 0) {
          if (!userProfile || !category.roles.includes(userProfile.role)) return false;
        }
        return true;
      })
      .map(category => ({
        ...category,
        items: getFilteredNavItems(category.items)
      }))
      .filter(category => category.items.length > 0); // Only show categories with accessible items
  };

  // Helper function to get the current page configuration or fallback to default
  const getCurrentPageConfig = () => {
    // First try to match the exact path
    if (navConfig[pathname]) {
      return navConfig[pathname];
    }

    // If not found, try to match the base path (for nested routes)
    const basePath = `/${pathname.split("/")[1]}`;
    if (navConfig[basePath]) {
      return navConfig[basePath];
    }

    // Default to homepage config if no match
    return navConfig["/"];
  };

  const currentConfig = getCurrentPageConfig();

  // Filter navigation items and categories based on user permissions
  const filteredStandaloneItems = currentConfig.standaloneItems 
    ? getFilteredNavItems(currentConfig.standaloneItems) 
    : [];
  const filteredCategories = getFilteredCategories(currentConfig.categories || []);
  const filteredActions = currentConfig.additionalActions 
    ? getFilteredNavItems(currentConfig.additionalActions) 
    : [];

  // Get user-specific navigation items based on role
  const getUserSpecificItems = (): NavItem[] => {
    if (!hasActiveSession || !userProfile) {
      return [
        { name: "Sign In", path: "/auth/signin" },
        { name: "Sign Up", path: "/auth/signup" },
      ];
    }

    const userItems: NavItem[] = [
      { name: "Dashboard", path: "/dashboard" },
      { name: "My Account", path: "/account" },
    ];

    // Add role-specific items
    if (userProfile.role === 'admin') {
      userItems.push({ name: "Admin Panel", path: "/admin" });
    }

    if (userProfile.role === 'admin' || userProfile.role === 'mod') {
      userItems.push({ name: "Moderation", path: "/moderation" });
    }

    return userItems;
  };

  // Check if current route is accessible
  const isCurrentRouteAccessible = canAccessRoute(pathname);

  // Get breadcrumb items for current path
  const getBreadcrumbs = (): NavItem[] => {
    const pathSegments = pathname.split('/').filter(segment => segment);
    const breadcrumbs: NavItem[] = [{ name: "Home", path: "/" }];

    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const config = navConfig[currentPath];
      if (config && config.title) {
        breadcrumbs.push({
          name: config.title,
          path: currentPath
        });
      } else {
        // Capitalize and format segment name
        const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        breadcrumbs.push({
          name,
          path: currentPath
        });
      }
    });

    return breadcrumbs;
  };

  return {
    // Current page configuration
    currentConfig: {
      ...currentConfig,
      standaloneItems: filteredStandaloneItems,
      categories: filteredCategories,
      additionalActions: filteredActions,
    },
    
    // User-specific items
    userItems: getUserSpecificItems(),
    
    // Navigation utilities
    breadcrumbs: getBreadcrumbs(),
    isCurrentRouteAccessible,
    
    // All configurations (for reference)
    allConfigs: navConfig,
    
    // Helper functions
    canAccessRoute,
    getFilteredNavItems,
    getFilteredCategories,
    
    // User context
    userProfile,
    hasActiveSession,
  };
};