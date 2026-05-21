/**
 * rbac.js — Central Role-Based Access Control definitions.
 *
 * Single source of truth for all role permissions across the app.
 * Import this in: Sidebar, AppShell, route guards, and any conditional UI.
 *
 * Roles (stored in DB → public.roles.name):
 *   super_admin    — Full access to everything
 *   decision_maker — Everything except User Management
 *   normal_user    — Dashboard, Hospitals, Chatbot, Disease Map only
 */

// ── Canonical role names ────────────────────────────────────────────────────
export const ROLES = /** @type {const} */ ({
  SUPER_ADMIN:    'super_admin',
  DECISION_MAKER: 'decision_maker',
  NORMAL_USER:    'normal_user',
});

/**
 * Route-level permission map.
 * Each key is a Next.js pathname (or prefix).
 * Value is an array of roles that may access it.
 * Routes NOT listed here are accessible by ANY authenticated user.
 *
 * null = accessible by all authenticated users
 */
export const ROUTE_PERMISSIONS = {
  // ── Super Admin + Decision Maker ───────────────────────────────────────
  '/reports':          [ROLES.SUPER_ADMIN, ROLES.DECISION_MAKER],
  '/diseases':         [ROLES.SUPER_ADMIN, ROLES.DECISION_MAKER],
  '/patients':         [ROLES.SUPER_ADMIN, ROLES.DECISION_MAKER],

  // ── Super Admin only ──────────────────────────────────────────────
  '/users':  [ROLES.SUPER_ADMIN],

  // ── All roles (null = no restriction beyond being authenticated) ───────────
  '/dashboard':        null,
  '/intelligence-map': null,
  '/hospitals':        null,
  '/chatbot':          null,
  '/settings':         null,
};

/**
 * canAccess(role, pathname) — Check if a role may access a given route.
 *
 * @param {string|null|undefined} role     - The user's role string
 * @param {string}                pathname - Next.js pathname e.g. '/users'
 * @returns {boolean}
 */
export function canAccess(role, pathname) {
  if (!role) return false;

  // Find the most specific matching prefix
  const matchedKey = Object.keys(ROUTE_PERMISSIONS)
    .filter(k => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchedKey) return true; // Not in the permission map → open to all authenticated users

  const allowed = ROUTE_PERMISSIONS[matchedKey];
  if (allowed === null) return true; // Explicitly public to all authenticated users

  return allowed.includes(role);
}

/**
 * hasRole(user, ...roles) — Check if user has one of the given roles.
 *
 * @param {{ role?: string }|null|undefined} user
 * @param {...string} roles
 * @returns {boolean}
 */
export function hasRole(user, ...roles) {
  if (!user?.role) return false;
  return roles.includes(user.role);
}

/**
 * getRoleLabel(role) — Human-readable role label.
 */
export function getRoleLabel(role) {
  const labels = {
    [ROLES.SUPER_ADMIN]:    'Super Admin',
    [ROLES.DECISION_MAKER]: 'Decision Maker',
    [ROLES.NORMAL_USER]:    'User',
  };
  return labels[role] ?? role ?? 'Unknown';
}

/**
 * getRoleBadgeColor(role) — Returns a CSS hex/var color for role badges.
 */
export function getRoleBadgeColor(role) {
  const colors = {
    [ROLES.SUPER_ADMIN]:    '#ef4444',
    [ROLES.DECISION_MAKER]: '#3b82f6',
    [ROLES.NORMAL_USER]:    '#22c55e',
  };
  return colors[role] ?? '#64748b';
}
