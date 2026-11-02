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

/** Not part of the six, so they never move percent or issues: shown on the Kelengkapan Data page only. */
export const OPTIONAL = [
  { label: 'Master Menu', domains: ['MENU'] },
  { label: 'Penerimaan Barang', domains: ['GOODS_RECEIPT'] },
] as const satisfies readonly { label: string; domains: readonly UploadDomain[] }[];

export type ItemState = 'COMPLETE' | 'SENT' | 'MISSING';

export type BatchRow = { domain: UploadDomain; status: UploadStatus; uploadDate: Date; publishedAt: Date | null };

/** Item labels that have published rows without an upload batch behind them (beneficiaries, balances). */
export type CompletenessInput = { batches: BatchRow[]; liveLabels: ReadonlySet<string> };

/** `issue`: the newest batch needs a fix (failed / format changed) or is waiting for a check. */
export type Item = { label: string; state: ItemState; publishedAt: string | null; issue: 'FIX' | 'REVIEW' | null };

export type KitchenCompleteness = {
  items: Item[];
  optional: Item[];
  complete: number;
  sent: number;
  total: number;
  percent: number;
  /** Items stuck on a batch that needs a fix vs. one waiting for a check. */
  issues: { fix: number; review: number };
  lastPublish: { at: string; label: string } | null;
};

/**
 * COMPLETE = published, SENT = delivered but not published yet, MISSING = nothing usable.
 * An item is "stuck" only while it has no published batch, judged by its newest batch.
 */
function item({ batches, liveLabels }: CompletenessInput, { label, domains }: { label: string; domains: readonly UploadDomain[] }): Item {
  const own = batches
    .filter((b) => domains.includes(b.domain) && b.status !== 'SUPERSEDED')
    .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  const published = own.filter((b) => b.status === 'PUBLISHED');
  const publishedAt = published.reduce<Date | null>((latest, p) => (p.publishedAt && (!latest || p.publishedAt > latest) ? p.publishedAt : latest), null)?.toISOString() ?? null;

  if (published.length || liveLabels.has(label)) return { label, state: 'COMPLETE', publishedAt, issue: null };

  const newest = own[0];
  if (!newest) return { label, state: 'MISSING', publishedAt, issue: null };
  if (newest.status === 'FAILED' || newest.status === 'NEEDS_MAPPING_UPDATE') return { label, state: 'MISSING', publishedAt, issue: 'FIX' };
  return { label, state: 'SENT', publishedAt, issue: newest.status === 'NEEDS_REVIEW' ? 'REVIEW' : null };
}

export function kitchenCompleteness(input: CompletenessInput): KitchenCompleteness {
  const items = REQUIRED.map((r) => item(input, r));
  const optional = OPTIONAL.map((o) => item(input, o));
  const last = items.reduce<Item | null>((latest, i) => (i.publishedAt && (!latest || i.publishedAt > latest.publishedAt!) ? i : latest), null);

  const complete = items.filter((i) => i.state === 'COMPLETE').length;
  const sent = complete + items.filter((i) => i.state === 'SENT').length;
  return {
    items,
    optional,
    complete,
    sent,
    total: items.length,
    percent: Math.round((complete / items.length) * 100),
    issues: { fix: items.filter((i) => i.issue === 'FIX').length, review: items.filter((i) => i.issue === 'REVIEW').length },
    lastPublish: last && { at: last.publishedAt!.slice(0, 10), label: last.label },
  };
}
