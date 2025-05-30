// config/routeProtection.ts - Define which routes need protection
export interface RouteProtection {
  path: string;
  requiresAuth: boolean;
  requiredRoles?: ("admin" | "contributor" | "student" | "mod")[];
  fallbackPath?: string;
}

export const PROTECTED_ROUTES: RouteProtection[] = [
  // Admin only routes
  {
    path: '/admin',
    requiresAuth: true,
    requiredRoles: ['admin'],
    fallbackPath: '/unauthorized'
  },
  {
    path: '/admin/users',
    requiresAuth: true,
    requiredRoles: ['admin'],
    fallbackPath: '/unauthorized'
  },
  {
    path: '/admin/settings',
    requiresAuth: true,
    requiredRoles: ['admin'],
    fallbackPath: '/unauthorized'
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
    fallbackPath: '/unauthorized'
  },
  
  // Student and above routes
  {
    path: '/courses',
    requiresAuth: true,
    requiredRoles: ['admin', 'contributor', 'student'],
    fallbackPath: '/auth/signin'
  },
  {
    path: '/profile',
    requiresAuth: true,
    requiredRoles: ['admin', 'contributor', 'student'],
    fallbackPath: '/auth/signin'
  },
  
  // Moderator routes
  {
    path: '/moderation',
    requiresAuth: true,
    requiredRoles: ['admin', 'mod'],
    fallbackPath: '/unauthorized'
  },
  
  // Public routes that require auth but no specific role
  {
    path: '/settings',
    requiresAuth: true,
    requiredRoles: [],
    fallbackPath: '/auth/signin'
  }
];

// Helper function to find route protection config
export const getRouteProtection = (pathname: string): RouteProtection | null => {
  // Check for exact match first
  const exactMatch = PROTECTED_ROUTES.find(route => route.path === pathname);
  if (exactMatch) return exactMatch;
  
  // Check for partial matches (for nested routes)
  const partialMatch = PROTECTED_ROUTES.find(route => 
    pathname.startsWith(route.path) && route.path !== '/'
  );
  
  return partialMatch || null;
};