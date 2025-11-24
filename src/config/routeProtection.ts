// config/routeProtection.ts - Define which routes need protection


export interface RouteProtection {
  path: string;
  requiresAuth: boolean;
  requiredRoles?: ("admin" | "contributor" | "student" | "mod" | "devsupport")[];
  fallbackPath?: string;
}

export const PROTECTED_ROUTES: RouteProtection[] = [
  // Admin only routes
  {
    path: '/admin',
    requiresAuth: true,
    requiredRoles: ['admin', 'devsupport'],
    fallbackPath: '/'
  },
  {
    path: '/admin/users',
    requiresAuth: true,
    requiredRoles: ['admin'],
    fallbackPath: '/'
  },
  {
    path: '/admin/settings',
    requiresAuth: true,
    requiredRoles: ['admin'],
    fallbackPath: '/'
  },
  
  // Contributor and Admin routes
  {
    path: '/dashboard',
    requiresAuth: true,
    requiredRoles: ['admin', 'contributor'],
    fallbackPath: '/auth/signin'
  },
  {
    path: '/content/create',
    requiresAuth: true,
    requiredRoles: ['admin', 'contributor'],
    fallbackPath: '/'
  },
  {
    path: '/upload',
    requiresAuth: true,
    requiredRoles: ['admin', 'contributor'],
    fallbackPath: '/'
  },
  
  // Student and above routes
  {
    path: '/courses',
    requiresAuth: true,
    requiredRoles: ['admin', 'contributor', 'student', 'mod'],
    fallbackPath: '/auth/signin'
  },
  {
    path: '/profile',
    requiresAuth: true,
    requiredRoles: ['admin', 'contributor', 'student', 'mod'],
    fallbackPath: '/auth/signin'
  },
  
  // Moderator routes
  {
    path: '/moderation',
    requiresAuth: true,
    requiredRoles: ['admin', 'mod'],
    fallbackPath: '/'
  },
  
  // Public routes that require auth but no specific role
  {
    path: '/settings',
    requiresAuth: true,
    requiredRoles: [],
    fallbackPath: '/auth/signin'
  }
];

// Define the user role type
export type UserRole = "admin" | "contributor" | "student" | "mod" | "devsupport";


// Helper function to find route protection config
export const getRouteProtection = (pathname: string): RouteProtection | null => {
  // Sort routes by path length (longest first) to prioritize specific routes
  const sortedRoutes = [...PROTECTED_ROUTES].sort((a, b) => b.path.length - a.path.length);
  
  // Check for exact match first
  const exactMatch = sortedRoutes.find(route => route.path === pathname);
  if (exactMatch) return exactMatch;
  
  // Check for partial matches (for nested routes)
  const partialMatch = sortedRoutes.find(route => 
    pathname.startsWith(route.path) && route.path !== '/' && pathname !== route.path
  );
  
  return partialMatch || null;
};

// ADDED: Helper function to check if a user can access a route
export const canUserAccessRoute = (
  pathname: string, 
  userRole?: UserRole, 
  isAuthenticated: boolean = false
): boolean => {
  const protection = getRouteProtection(pathname);
  
  if (!protection) return true; // No protection needed
  
  if (protection.requiresAuth && !isAuthenticated) return false;
  
  if (protection.requiredRoles && protection.requiredRoles.length > 0) {
    return userRole ? protection.requiredRoles.includes(userRole) : false;
  }
  
  return isAuthenticated; // Auth required but no specific roles
};