import type { UploadDomain, UploadStatus } from '@prisma/client';

/** SCRUM-104: the six data a dapur must deliver. Beneficiary counts and balances have no upload domain yet, so only published rows count for them. */
export const REQUIRED = [
  { label: 'Cashflow', domains: ['CASHFLOW'] },
  { label: 'RAB', domains: ['RAB'] },
  { label: 'Purchase Order', domains: ['PO'] },
  { label: 'Pembayaran Supplier', domains: ['INPUT_MAKER', 'VENDOR_PAYMENT'] },
  { label: 'Jumlah Penerima Manfaat', domains: [] },
  { label: 'Saldo Rekening', domains: [] },
] as const satisfies readonly { label: string; domains: readonly UploadDomain[] }[];

export type ItemState = 'COMPLETE' | 'SENT' | 'MISSING';

export type BatchRow = { domain: UploadDomain; status: UploadStatus; uploadDate: Date; publishedAt: Date | null };

/** Item labels that have published rows without an upload batch behind them (beneficiaries, balances). */
export type CompletenessInput = { batches: BatchRow[]; liveLabels: ReadonlySet<string> };

export type KitchenCompleteness = {
  items: { label: string; state: ItemState }[];
  complete: number;
  sent: number;
  total: number;
  percent: number;
  /** Items stuck on a batch that needs a fix (failed / format changed) vs. one waiting for a check. */
  issues: { fix: number; review: number };
  lastPublish: { at: string; label: string } | null;
};

/**
 * COMPLETE = published, SENT = delivered but not published yet, MISSING = nothing usable.
 * An item is "stuck" only while it has no published batch, judged by its newest batch.
 */
export function kitchenCompleteness({ batches, liveLabels }: CompletenessInput): KitchenCompleteness {
  const issues = { fix: 0, review: 0 };
  // Assigned inside the map callback, which TS cannot see; the cast keeps the union.
  let lastPublish = null as { at: Date; label: string } | null;

  const items = REQUIRED.map(({ label, domains }) => {
    const own = batches
      .filter((b) => (domains as readonly UploadDomain[]).includes(b.domain) && b.status !== 'SUPERSEDED')
      .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
    const published = own.filter((b) => b.status === 'PUBLISHED');

    for (const p of published) {
      if (p.publishedAt && (!lastPublish || p.publishedAt > lastPublish.at)) lastPublish = { at: p.publishedAt, label };
    }
    if (published.length || liveLabels.has(label)) return { label, state: 'COMPLETE' as const };

    const newest = own[0];
    if (!newest) return { label, state: 'MISSING' as const };
    if (newest.status === 'FAILED' || newest.status === 'NEEDS_MAPPING_UPDATE') {
      issues.fix++;
      return { label, state: 'MISSING' as const };
    }
    if (newest.status === 'NEEDS_REVIEW') issues.review++;
    return { label, state: 'SENT' as const };
  });

  const complete = items.filter((i) => i.state === 'COMPLETE').length;
  const sent = complete + items.filter((i) => i.state === 'SENT').length;
  return {
    items,
    complete,
    sent,
    total: items.length,
    percent: Math.round((complete / items.length) * 100),
    issues,
    lastPublish: lastPublish && { at: lastPublish.at.toISOString().slice(0, 10), label: lastPublish.label },
  };
}
