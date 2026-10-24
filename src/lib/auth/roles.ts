export const adminRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "SUPPORT_AGENT"] as const;
export type AdminRole = (typeof adminRoles)[number];

export function isAdminRole(role: string): role is AdminRole {
  return adminRoles.some((adminRole) => adminRole === role);
}

export function hasAdminRole(
  assignedRoles: readonly string[],
  allowedRoles: readonly AdminRole[],
) {
  return assignedRoles.some((role) => allowedRoles.some((allowedRole) => allowedRole === role));
}

export function wouldRemoveLastActiveSuperAdmin(
  activeSuperAdminCount: number,
  currentlySuperAdmin: boolean,
  currentlyActive: boolean,
  nextRoles: readonly string[],
  nextIsActive: boolean,
) {
  return activeSuperAdminCount <= 1
    && currentlySuperAdmin
    && currentlyActive
    && (!nextIsActive || !nextRoles.includes("SUPER_ADMIN"));
}
