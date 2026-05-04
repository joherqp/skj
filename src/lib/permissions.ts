import { UserRole } from "@/types";

/**
 * Interface for route permission configuration
 */
export interface RoutePermission {
  path: string;
  allowedRoles?: UserRole[];
  excludedRoles?: UserRole[];
}

/**
 * Centralized route permissions configuration.
 * If a route is not listed here, it is assumed to be accessible by all authenticated users.
 * paths should be base paths (e.g., '/monitoring' will match '/monitoring' and '/monitoring/abc')
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  {
    path: '/monitoring',
    allowedRoles: ['admin', 'owner', 'manager', 'leader', 'sales']
  },
  {
    path: '/petty-cash',
    allowedRoles: ['admin', 'finance', 'manager']
  },
  {
    path: '/pengaturan',
    allowedRoles: ['admin']
  },
  {
    path: '/reimburse',
    excludedRoles: ['owner']
  },
  // Persetujuan is for all users to see items directed to them or their own tracking
  {
    path: '/persetujuan'
  }
];

/**
 * Checks if a user with given roles can access a specific path
 */
export const canAccessPath = (path: string, userRoles: UserRole[]): boolean => {
  // Find the most specific permission (longest matching path)
  const permission = [...ROUTE_PERMISSIONS]
    .sort((a, b) => b.path.length - a.path.length)
    .find(p => path === p.path || path.startsWith(p.path + '/'));

  if (!permission) return true;

  if (permission.allowedRoles) {
    return userRoles.some(role => permission.allowedRoles!.includes(role));
  }

  if (permission.excludedRoles) {
    return !userRoles.some(role => permission.excludedRoles!.includes(role));
  }

  return true;
};
