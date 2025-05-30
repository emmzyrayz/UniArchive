import { usePathname } from "next/navigation";
import { useUser } from "@/context/userContext";

// Type definitions for navbar items
export interface NavItem {
  name: string;
  path: string;
  icon?: string;
  requiresAuth?: boolean;
  roles?: ("admin" | "contributor" | "student" | "mod")[];
}

export interface PageNavConfig {
  [key: string]: {
    items: NavItem[];
    title?: string;
    showSearch?: boolean;
    additionalActions?: NavItem[];
  };
}

// Define navigation items for different pages with auth and role requirements
const navConfig: PageNavConfig = {
  // Default navigation for homepage
  "/": {
    items: [
      { name: "Home", path: "/" },
      // { name: "Schools", path: "/schools" },
      { name: "Materials", path: "/materials" },
      { name: "Join Us", path: "/auth/signin" },
      // { name: "Contact", path: "/contact" },
    ],
    showSearch: true,
  },
  
  // Dashboard page navigation (requires authentication)
  "/dashboard": {
    title: "Dashboard",
    items: [
      { name: "Overview", path: "/dashboard", requiresAuth: true },
      { name: "My Courses", path: "/dashboard/courses", requiresAuth: true },
      { name: "Materials", path: "/dashboard/materials", requiresAuth: true },
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
    ],
    showSearch: true,
    additionalActions: [
      { 
        name: "Upload Material", 
        path: "/dashboard/upload", 
        requiresAuth: true,
        roles: ["admin", "contributor", "student", "mod"]
      },
      { 
        name: "Manage Users", 
        path: "/dashboard/users", 
        requiresAuth: true, 
        roles: ["admin"] 
      },
    ],
  },
  
  // School page navigation
  "/schools": {
    title: "Schools",
    items: [
      { name: "Home", path: "/" },
      { name: "All Schools", path: "/schools" },
      { name: "Departments", path: "/schools/departments" },
      { name: "Faculty", path: "/schools/faculty" },
    ],
    showSearch: true,
  },
  
  // Materials page
  "/materials": {
    title: "Study Materials",
    items: [
      { name: "Home", path: "/" },
      { name: "All Materials", path: "/materials" },
      { name: "Past Questions", path: "/materials/past-questions" },
      { name: "Lecture Notes", path: "/materials/notes" },
      { name: "Textbooks", path: "/materials/textbooks" },
    ],
    showSearch: true,
  },
  
  // Account page (requires authentication)
  "/account": {
    title: "My Account",
    items: [
      { name: "Dashboard", path: "/dashboard", requiresAuth: true },
      { name: "Profile", path: "/account/profile", requiresAuth: true },
      { name: "Settings", path: "/account/settings", requiresAuth: true },
      { name: "My Uploads", path: "/account/uploads", requiresAuth: true },
      { name: "Activity", path: "/account/activity", requiresAuth: true },
    ],
    showSearch: false,
  },
  
  // Admin routes (admin only)
  "/admin": {
    title: "Administration",
    items: [
      { name: "Dashboard", path: "/admin", requiresAuth: true, roles: ["admin"] },
      { name: "User Management", path: "/admin/users", requiresAuth: true, roles: ["admin"] },
      { name: "Content Management", path: "/admin/content", requiresAuth: true, roles: ["admin"] },
      { name: "System Settings", path: "/admin/settings", requiresAuth: true, roles: ["admin"] },
      { name: "Analytics", path: "/admin/analytics", requiresAuth: true, roles: ["admin"] },
    ],
    showSearch: true,
    additionalActions: [
      { name: "System Backup", path: "/admin/backup", requiresAuth: true, roles: ["admin"] },
      { name: "Audit Logs", path: "/admin/logs", requiresAuth: true, roles: ["admin"] },
    ],
  },
  
  // Moderation routes (moderators and admins)
  "/moderation": {
    title: "Moderation",
    items: [
      { name: "Dashboard", path: "/moderation", requiresAuth: true, roles: ["admin", "mod"] },
      { name: "Reports", path: "/moderation/reports", requiresAuth: true, roles: ["admin", "mod"] },
      { name: "Content Review", path: "/moderation/review", requiresAuth: true, roles: ["admin", "mod"] },
      { name: "User Actions", path: "/moderation/actions", requiresAuth: true, roles: ["admin", "mod"] },
    ],
    showSearch: true,
  },
};

export const useNavConfig = () => {
  const pathname = usePathname();
  const { getFilteredNavItems, canAccessRoute, userProfile, hasActiveSession } = useUser();

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

  // Filter navigation items based on user permissions
  const filteredItems = getFilteredNavItems(currentConfig.items);
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
      items: filteredItems,
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
    
    // User context
    userProfile,
    hasActiveSession,
  };
};