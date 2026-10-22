"use client";

import {
  ChevronsUpDown,
  ClipboardCheck,
  CircleHelp,
  FileChartColumn,
  FileSpreadsheet,
  LayoutDashboard,
  Map,
  Settings2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/overview" },
  { label: "Finance & Cost", icon: Wallet, href: "/finance" },
  { label: "Kelengkapan Data", icon: ClipboardCheck, href: "/kelengkapan" },
  { label: "Unggah Data", icon: Upload, href: "/unggah-data", badge: "2" },
  { label: "Mapping & Validasi", icon: Map, href: "#", badge: "1" },
  { label: "Rekonsiliasi", icon: FileChartColumn, href: "#" },
  { label: "Pelaporan", icon: FileSpreadsheet, href: "#" },
];

const workspace = [
  { label: "Manajemen Pengguna", icon: Users },
  { label: "Pengaturan", icon: Settings2 },
  { label: "Bantuan", icon: CircleHelp },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:flex lg:flex-col" aria-label="Navigasi utama">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white" aria-hidden="true">SI</div>
          <div>
            <p className="text-sm font-semibold text-slate-800">SPPG Internal</p>
            <p className="text-xs text-slate-400">Backoffice - Pilot Sukun</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu utama">
          <p className="px-3 pb-2 text-xs font-medium text-slate-400">Menu utama</p>
          {navigation.map(({ label, icon: Icon, href, badge }) => {
            const active = href === pathname;
            return (
              <Link key={label} href={href} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${active ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`} aria-current={active ? "page" : undefined}>
                <Icon className="size-4" aria-hidden="true" />
                <span>{label}</span>
                {badge && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{badge}</span>}
              </Link>
            );
          })}
        </nav>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu workspace">
          <p className="px-3 pb-2 text-xs font-medium text-slate-400">Workspace</p>
          {workspace.map(({ label, icon: Icon }) => (
            <a key={label} href="#" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <button className="mt-auto flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label="Buka menu profil Bayu Pratama">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-semibold text-white">BP</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-800">Bayu Pratama</span>
            <span className="block truncate text-xs text-slate-500">bayu.pratama@sppg.internal</span>
            <span className="mt-1 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Project Manager MBG</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
