import { resolveKitchenIds } from '../auth/guard.js';
import type { AppUser } from '../auth/user.js';

/**
 * Multi-tenant filtering. The tenant is `Kitchen`; every scoped table carries
 * `kitchenId` (menu_plans, upload_batches, and the four kitchen-keyed marts).
 *
 * The rule in one place so no controller reinvents it: a scoped caller sees
 * only its own dapur (SCRUM-20: possibly several), everyone else sees all of
 * them. A `kitchenId` from the query string only ever *narrows* the result —
 * it can never widen it past the caller's own scope.
 */
export type ScopeResult =
  | { ok: true; kitchenIds?: bigint[] }
  | { ok: false };

export function kitchenScope(user: AppUser, requested?: bigint): ScopeResult {
  const allowed = resolveKitchenIds(user);

  if (requested !== undefined) {
    return allowed === null || allowed.includes(requested)
      ? { ok: true, kitchenIds: [requested] }
      : { ok: false };
  }
  return allowed === null ? { ok: true } : { ok: true, kitchenIds: allowed };
}

/** Prisma `where` fragment for a table with a direct `kitchenId` column. */
export function kitchenWhere(scope: Extract<ScopeResult, { ok: true }>) {
  return scope.kitchenIds === undefined ? {} : { kitchenId: { in: scope.kitchenIds } };
}

/**
 * Same rule for the two tables whose tenant is reachable only through
 * `menuPlan` — recipe_costings and akg_compliances.
 */
export function menuPlanWhere(scope: Extract<ScopeResult, { ok: true }>) {
  return scope.kitchenIds === undefined ? {} : { menuPlan: { kitchenId: { in: scope.kitchenIds } } };
}
