import type { Prisma } from '@prisma/client';

/**
 * SCRUM-20: kode singkat dapur dari PRD Phase 1.
 *
 * TODO(catatan): Turen ada di master dapur (seeder reference-data) tapi tidak
 * punya kode di PRD — `code` dibiarkan NULL sampai kodenya dikonfirmasi.
 */
const CODES: Record<string, string> = {
  Sukun: 'SKN',
  Lawang: 'LWG',
  Donomulyo: 'DNM',
  Poncokusumo: 'PCK',
  Simalungun: 'SML',
};

export default async function up(db: Prisma.TransactionClient) {
  for (const [name, code] of Object.entries(CODES)) {
    await db.kitchen.upsert({ where: { name }, create: { name, code }, update: { code } });
  }
}
