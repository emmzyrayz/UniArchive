import {usePathname} from "next/navigation";

// Type definitions for navbar items
export interface NavItem {
  name: string;
  path: string;
  icon?: string;
}

export interface PageNavConfig {
  [key: string]: {
    items: NavItem[];
    title?: string;
    showSearch?: boolean;
    additionalActions?: NavItem[];
  };
}

// Define navigation items for different pages
const navConfig: PageNavConfig = {
  // Default navigation for homepage
  "/": {
    items: [
      {name: "Home", path: "/"},
      {name: "School", path: "/school"},
      {name: "About", path: "/about"},
      {name: "Contact", path: "/contact"},
    ],
    showSearch: true,
  },
  // Dashboard page navigation
  "/dashboard": {
    title: "Dashboard",
    items: [
      {name: "Dashboard", path: "/dashboard"},
      {name: "My Courses", path: "/dashboard/courses"},
      {name: "Materials", path: "/dashboard/materials"},
      {name: "Universities", path: "/dashboard/universities"},
    ],
    showSearch: true,
    additionalActions: [
      {name: "Upload Material", path: "/dashboard/upload"},
      {name: "My Profile", path: "/dashboard/profile"},
    ],
  },
  // School page navigation
  "/school": {
    title: "Schools",
    items: [
      {name: "Home", path: "/"},
      {name: "School", path: "/school"},
      {name: "Departments", path: "/school/departments"},
      {name: "Faculty", path: "/school/faculty"},
    ],
    showSearch: true,
  },
  // Materials page
  "/materials": {
    title: "Study Materials",
    items: [
      {name: "Home", path: "/"},
      {name: "All Materials", path: "/materials"},
      {name: "Past Questions", path: "/materials/past-questions"},
      {name: "Lecture Notes", path: "/materials/notes"},
    ],
    showSearch: true,
  },
  // Account page
  "/account": {
    title: "My Account",
    items: [
      {name: "Dashboard", path: "/dashboard"},
      {name: "Profile", path: "/account/profile"},
      {name: "Settings", path: "/account/settings"},
      {name: "Uploads", path: "/account/uploads"},
    ],
    showSearch: false,
  },
};

export const useNavConfig = () => {
  const pathname = usePathname();

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

  return {
    currentConfig: getCurrentPageConfig(),
    allConfigs: navConfig,
  };
};
