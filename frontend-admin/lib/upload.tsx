import { Check, Eye, Loader, Replace, TriangleAlert, X, type LucideIcon } from "lucide-react";

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
  PROCESSING: { label: "Processing", tone: "border-slate-200 bg-slate-50 text-slate-600", icon: Loader },
  NEEDS_REVIEW: { label: "Belum selesai dicek", tone: "border-sky-200 bg-sky-50 text-sky-700", icon: Eye },
  NEEDS_MAPPING_UPDATE: { label: "Needs Mapping Update", tone: "border-amber-200 bg-amber-50 text-amber-700", icon: TriangleAlert },
  PUBLISHED: { label: "Dipublish", tone: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: Check },
  FAILED: { label: "Failed", tone: "border-red-200 bg-red-50 text-red-700", icon: X },
  SUPERSEDED: { label: "Diganti", tone: "border-slate-200 bg-slate-50 text-slate-600", icon: Replace },
} as const satisfies Record<string, { label: string; tone: string; icon: LucideIcon }>;

/**
 * A few error codes read better than their status: a header-only template is
 * held for re-upload, not broken (SCRUM-131).
 */
const BY_ERROR_CODE: Record<string, { label: string; tone: string; icon: LucideIcon }> = {
  EMPTY_FILE: { label: "Ditahan · file kosong", tone: "border-amber-200 bg-amber-50 text-amber-700", icon: TriangleAlert },
};

export function StatusBadge({ status, errorCode }: { status: string; errorCode?: string | null }) {
  const s = (errorCode && BY_ERROR_CODE[errorCode]) || STATUS[status as keyof typeof STATUS] || { label: status, tone: "border-slate-200 bg-slate-50 text-slate-600", icon: Loader };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-sm font-medium ${s.tone}`}>
      <s.icon className="size-3.5" aria-hidden="true" />
      {s.label}
    </span>
  );
}
