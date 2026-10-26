"use client";

import { Bell, Menu, Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinks, type NavItem } from "@/components/layout/app-sidebar";

const iconButton = "inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-emerald-300";

export function AppHeader({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const title = items.find((n) => n.href === pathname)?.label ?? (pathname === "/keamanan" ? "Keamanan akun" : undefined);

  return (
    <header className="flex min-h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Desktop-first: below lg the sidebar collapses into this native disclosure. */}
      <details className="relative lg:hidden">
        <summary className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Buka navigasi">
          <Menu className="size-5" aria-hidden="true" />
        </summary>
        <nav className="absolute left-0 top-11 z-10 flex w-64 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg" aria-label="Menu utama">
          <NavLinks items={items} />
        </nav>
      </details>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Dashboard</span>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="font-medium text-slate-800">{title}</span>
      </div>

      <label className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <input type="search" disabled title="Segera hadir" placeholder="Cari file atau data..." aria-label="Cari file atau data" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-400 sm:block">⌘K</kbd>
      </label>

      <div className="flex items-center gap-3">
        <Link href="/keamanan" aria-label="Pengaturan akun" className={iconButton}>
          <Settings className="size-5" aria-hidden="true" />
        </Link>
        <button type="button" disabled title="Segera hadir" aria-label="Notifikasi" className={`${iconButton} disabled:cursor-not-allowed disabled:opacity-60`}>
          <Bell className="size-5" aria-hidden="true" />
        </button>
        <Link href="/unggah-data" className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
          <Plus className="size-4" aria-hidden="true" />
          Unggah Data
        </Link>
      </div>
    </header>
  );
}
