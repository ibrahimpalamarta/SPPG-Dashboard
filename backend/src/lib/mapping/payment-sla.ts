import type { PaymentSla } from '@prisma/client';

export type PaymentTimes = { receivedAt: Date | null; makerInputAt: Date | null; approvedAt: Date | null; paidAt: Date | null };

const DAY_MS = 864e5;
/** SLA days are WIB calendar days: 23:00 received, 08:00 paid is D+1. */
const WIB_MS = 7 * 3600e3;
const wibDay = (d: Date) => Math.floor((d.getTime() + WIB_MS) / DAY_MS);

/**
 * SCRUM-48: receipt ≤ maker input ≤ approval ≤ payment, then paid the same WIB
 * day (D0), the next (D+1) or later (BREACH). Any missing step is UNKNOWN,
 * never assumed on time.
 */
export function classifySla(t: PaymentTimes): PaymentSla {
  const steps = [t.receivedAt, t.makerInputAt, t.approvedAt, t.paidAt];
  if (steps.some((s) => s === null)) return 'UNKNOWN';
  const [received, , , paid] = steps as Date[];
  for (let i = 1; i < steps.length; i++) if (steps[i]! < steps[i - 1]!) return 'INVALID_SEQUENCE';
  const days = wibDay(paid!) - wibDay(received!);
  return days === 0 ? 'SAME_DAY' : days === 1 ? 'D_PLUS_1' : 'BREACH';
}
