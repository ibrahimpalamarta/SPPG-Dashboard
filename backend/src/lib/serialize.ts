import type { Response } from 'express';

/**
 * Prisma hands back two types `JSON.stringify` cannot handle on its own:
 * BigInt (throws outright) and Decimal (stringifies to an object). Every
 * response body goes through here so no controller has to remember.
 *
 * BigInt -> string: an id is opaque to the client, and 2^53 is not a safe
 * ceiling for a BIGSERIAL.
 *
 * Decimal -> number: the widest column in the schema is NUMERIC(14,2), whose
 * maximum ~1e12 sits well inside Number.MAX_SAFE_INTEGER (~9e15). Charts and
 * arithmetic on the frontend want numbers, not strings.
 */
function isDecimal(v: object): boolean {
  // Prisma's Decimal is decimal.js; importing it here would drag the runtime
  // into this module for a one-field check.
  return typeof (v as { toNumber?: unknown }).toNumber === 'function';
}

export function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return String(value);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (isDecimal(value)) return (value as { toNumber(): number }).toNumber();
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
}

/** The only way a 2xx body should leave a controller. */
export function sendJson(res: Response, data: unknown, status = 200): void {
  res.status(status).json(serialize(data));
}
