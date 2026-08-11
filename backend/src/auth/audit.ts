import type { Db } from '../db.js';
import type { Prisma } from '@prisma/client';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Append-only trail. Never put tokens, passwords or raw request bodies in
 * `metadata` — this table is read by humans and exported.
 *
 * Failures are swallowed: an audit write must not break the request that
 * triggered it.
 */
export async function writeAuditLog(db: Db, entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (err) {
    console.error('audit log write failed', { action: entry.action, error: String(err) });
  }
}
