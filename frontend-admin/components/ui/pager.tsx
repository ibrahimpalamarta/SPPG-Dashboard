import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const btn = "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-700";

/** Prev/next pager for a server-fetched page (`lib/pagination.ts` `meta`). Renders nothing when there is only one page. */
export function Pager({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;

  const Prev = page > 1 ? Link : "span";
  const Next = page < totalPages ? Link : "span";
  return (
    <nav className="flex items-center justify-between gap-4 pt-3 text-sm text-slate-600" aria-label="Navigasi halaman">
      <Prev href={hrefFor(page - 1)} className={`${btn} ${page > 1 ? "hover:bg-slate-50" : "text-slate-300"}`}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        Sebelumnya
      </Prev>
      <span>
        Halaman {page} dari {totalPages}
      </span>
      <Next href={hrefFor(page + 1)} className={`${btn} ${page < totalPages ? "hover:bg-slate-50" : "text-slate-300"}`}>
        Berikutnya
        <ChevronRight className="size-4" aria-hidden="true" />
      </Next>
    </nav>
  );
}
