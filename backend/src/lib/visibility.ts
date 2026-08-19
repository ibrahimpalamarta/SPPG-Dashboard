import type { Role } from '../auth/roles.js';

/**
 * SCRUM-13, application half. Cost figures and exact beneficiary counts are
 * internal; the public dashboard must never be able to reach them.
 *
 * The database half is the two public views (see the reshape migration). This
 * module guards the authenticated routes, which read the base tables directly.
 *
 * A PUBLIC-role token is an authenticated caller with no internal clearance —
 * it is treated exactly like an anonymous visitor here. CMS_ADMIN manages
 * content, not operations, so it gets no cost access either.
 */
export const COST_ROLES: readonly Role[] = ['SUPER_ADMIN', 'DATA_ADMIN', 'INTERNAL'];

export function canSeeCost(role: Role): boolean {
  return COST_ROLES.includes(role);
}

/** Columns stripped from menu_plans for callers without cost clearance. */
const MENU_PLAN_COST_FIELDS = ['hargaBahan', 'totalHarga'] as const;

/** Columns stripped from daily_kitchens for the same callers. */
const DAILY_KITCHEN_COST_FIELDS = ['jumlahPm'] as const;

function omit<T extends object>(row: T, fields: readonly string[]): Partial<T> {
  return Object.fromEntries(
    Object.entries(row).filter(([k]) => !fields.includes(k)),
  ) as Partial<T>;
}

/**
 * Drops the internal-only columns unless the role clears them. Applied to the
 * row on its way out, so a query can stay a plain `findMany` and there is one
 * obvious place to audit.
 */
export function forRole<T extends object>(row: T, role: Role, fields: readonly string[]): Partial<T> {
  return canSeeCost(role) ? row : omit(row, fields);
}

export const menuPlanForRole = <T extends object>(row: T, role: Role) =>
  forRole(row, role, MENU_PLAN_COST_FIELDS);

export const dailyKitchenForRole = <T extends object>(row: T, role: Role) =>
  forRole(row, role, DAILY_KITCHEN_COST_FIELDS);
