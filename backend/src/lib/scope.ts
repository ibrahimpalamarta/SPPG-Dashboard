import type { User } from '@prisma/client';
import { resolveScopeId } from '../auth/guard.js';

/**
 * Multi-tenant filtering. The tenant is `Kitchen`; every scoped table carries
 * `kitchenId` (menu_plans, upload_batches, and the four kitchen-keyed marts).
 *
 * The rule in one place so no controller reinvents it: a DATA_ADMIN sees only
 * its own dapur, everyone else sees all of them. A `kitchenId` from the query
 * string only ever *narrows* the result — it can never widen it past the
 * caller's own scope.
 */
export type ScopeResult =
  | { ok: true; kitchenId?: bigint }
  | { ok: false };

export function kitchenScope(user: User, requested?: bigint): ScopeResult {
  const scopeId = resolveScopeId(user);

  if (scopeId === null) {
    // Unrestricted caller: honour the filter if one was asked for.
    return { ok: true, ...(requested !== undefined && { kitchenId: requested }) };
  }

  // A scoped caller with no scope_id set has no dapur to read — fail closed
  // rather than falling through to "see everything".
  if (requested !== undefined && requested !== scopeId) return { ok: false };
  return { ok: true, kitchenId: scopeId };
}

/** Prisma `where` fragment for a table with a direct `kitchenId` column. */
export function kitchenWhere(scope: Extract<ScopeResult, { ok: true }>) {
  return scope.kitchenId === undefined ? {} : { kitchenId: scope.kitchenId };
}

/**
 * Same rule for the two tables whose tenant is reachable only through
 * `menuPlan` — recipe_costings and akg_compliances.
 */
export function menuPlanWhere(scope: Extract<ScopeResult, { ok: true }>) {
  return scope.kitchenId === undefined ? {} : { menuPlan: { kitchenId: scope.kitchenId } };
}
