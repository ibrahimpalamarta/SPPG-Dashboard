"use client";

import { Bell, CircleCheck, Menu, Search, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

// ponytail: static mock collaborators; replace with real presence data later.
const collaborators = [
  { initials: "DL", color: "bg-blue-600" },
  { initials: "BP", color: "bg-teal-600" },
  { initials: "RK", color: "bg-indigo-500" },
];

const titles: Record<string, string> = { "/overview": "Overview", "/unggah-data": "Unggah Data", "/finance": "Finance & Cost", "/kelengkapan": "Kelengkapan Data" };

const iconButton =
  "relative inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="flex min-h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <button className="inline-flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 lg:hidden" aria-label="Buka navigasi">
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <div className="hidden items-center gap-2 text-sm sm:flex">
        <span className="text-slate-400">Dashboard</span>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="font-medium text-slate-800">{titles[pathname]}</span>
        <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-600">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Pilot demo · data terkontrol
        </span>
      </div>
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
        <label className="relative hidden h-10 min-w-0 flex-1 lg:block">
          <span className="sr-only">Cari file atau data</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input className="size-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" placeholder="Cari file atau data..." />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-400">⌘K</kbd>
        </label>
        <div className="hidden items-center -space-x-2 xl:flex" aria-label="Kolaborator aktif">
          {collaborators.map(({ initials, color }) => (
            <span key={initials} className={`flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ${color}`}>{initials}</span>
          ))}
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-semibold text-slate-600">+5</span>
        </div>
        <button className={iconButton} aria-label="Pengaturan">
          <Settings className="size-4" aria-hidden="true" />
        </button>
        <button className={iconButton} aria-label="Notifikasi">
          <Bell className="size-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" aria-hidden="true" />
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          <CircleCheck className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Review Pekerjaan</span>
        </button>
      </div>
    </header>
  );
}
