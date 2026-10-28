import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const btn = "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-700";
const num = "inline-flex size-9 items-center justify-center rounded-lg border text-sm font-medium";

/** First/last page, plus a window of 1 around the current page; "…" fills a gap. */
function pageNumbers(page: number, totalPages: number): (number | "…")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ["…" as const, p] : [p]));
}

/** Prev/next + numbered pager for a server-fetched page (`lib/pagination.ts` `meta`). Renders nothing when there is only one page. */
export function Pager({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;

  const Prev = page > 1 ? Link : "span";
  const Next = page < totalPages ? Link : "span";
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-600" aria-label="Navigasi halaman">
      <Prev href={hrefFor(page - 1)} className={`${btn} ${page > 1 ? "hover:bg-slate-50" : "text-slate-300"}`}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        Sebelumnya
      </Prev>
      <ul className="flex items-center gap-1">
        {pageNumbers(page, totalPages).map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="px-1 text-slate-400">
              …
            </li>
          ) : (
            <li key={p}>
              {p === page ? (
                <span aria-current="page" className={`${num} border-emerald-600 bg-emerald-600 text-white`}>
                  {p}
                </span>
              ) : (
                <Link href={hrefFor(p)} className={`${num} border-slate-200 hover:bg-slate-50`}>
                  {p}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>
      <Next href={hrefFor(page + 1)} className={`${btn} ${page < totalPages ? "hover:bg-slate-50" : "text-slate-300"}`}>
        Berikutnya
        <ChevronRight className="size-4" aria-hidden="true" />
      </Next>
    </nav>
  );
}
