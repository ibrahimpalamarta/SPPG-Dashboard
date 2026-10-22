/** Mirrors backend `UploadDomain` (schema.prisma), in PRD order. */
export const DOMAINS = [
  { value: "CASHFLOW", label: "Cashflow" },
  { value: "MENU", label: "Menu" },
  { value: "RAB", label: "RAB" },
  { value: "PO", label: "PO / Nota Pesanan" },
  { value: "GOODS_RECEIPT", label: "Penerimaan Barang" },
  { value: "VENDOR_PAYMENT", label: "Pembayaran Vendor" },
  { value: "INPUT_MAKER", label: "Input Maker (EFI)" },
] as const;

/** Backend `UploadStatus` → PRD FR-UP-05 wording + badge colour. */
export const STATUS = {
  PROCESSING: { label: "Processing", tone: "bg-slate-100 text-slate-700" },
  NEEDS_REVIEW: { label: "Needs Review", tone: "bg-amber-100 text-amber-800" },
  NEEDS_MAPPING_UPDATE: { label: "Needs Mapping Update", tone: "bg-amber-100 text-amber-800" },
  READY: { label: "Ready", tone: "bg-emerald-100 text-emerald-800" },
  PUBLISHED: { label: "Published", tone: "bg-emerald-700 text-white" },
  FAILED: { label: "Failed", tone: "bg-red-100 text-red-800" },
} as const satisfies Record<string, { label: string; tone: string }>;

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status as keyof typeof STATUS] ?? { label: status, tone: "bg-slate-100 text-slate-700" };
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>;
}
