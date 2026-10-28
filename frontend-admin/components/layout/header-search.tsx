"use client";

import { GitBranch, LayoutGrid, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/components/layout/app-sidebar";
import type { SearchEntry } from "@/app/api/search-index/route";

type Result = { icon: typeof Search; title: string; subtitle: string; href: string };

const ICON = { upload: Upload, format: GitBranch };
const MAX_RESULTS = 20;

export function HeaderSearch({ items }: { items: readonly NavItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  // Loaded on first focus, not on every page view.
  const load = () => {
    setOpen(true);
    if (!index) fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/search-index`).then((r) => (r.ok ? r.json() : [])).then(setIndex, () => setIndex([]));
  };

  const needle = q.trim().toLowerCase();
  const results: Result[] = needle
    ? [
        ...items.map((n) => ({ icon: LayoutGrid, title: n.label, subtitle: "Halaman", href: n.href, text: n.label })),
        ...(index ?? [])
          .filter((e) => items.some((n) => n.href === e.page))
          .map((e) => ({ icon: ICON[e.kind], title: e.title, subtitle: e.subtitle, href: e.href, text: `${e.title} ${e.subtitle}` })),
      ]
        .filter((r) => r.text.toLowerCase().includes(needle))
        .slice(0, MAX_RESULTS)
    : [];

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <label className="flex h-10 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={load}
          onKeyDown={(e) => e.key === "Escape" && (setOpen(false), input.current?.blur())}
          placeholder="Cari menu, nama file, atau kode upload..."
          aria-label="Cari menu, nama file, atau kode upload"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-400 sm:block">⌘K</kbd>
      </label>

      {open && needle && (
        <ul className="absolute inset-x-0 top-12 z-20 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {results.map((r) => (
            <li key={`${r.href}|${r.title}|${r.subtitle}`}>
              <Link href={r.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <r.icon className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">{r.title}</span>
                  <span className="block truncate text-sm text-slate-500">{r.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
          {!results.length && <li className="px-3 py-2 text-sm text-slate-500">{index ? "Tidak ada hasil." : "Memuat..."}</li>}
        </ul>
      )}
    </div>
  );
}
