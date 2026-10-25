"use client";

import { Activity, BookOpen, Inbox, LayoutDashboard, LogOut, Map, PenLine, ShieldCheck, Upload, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import type { NAV } from "@/lib/nav";
import { ROLE_LABELS, type Role } from "@/lib/roles";

const ICONS = { Activity, BookOpen, Inbox, LayoutDashboard, Map, PenLine, ShieldCheck, Upload, Users, Wallet };

export type NavItem = (typeof NAV)[number];

export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  return items.map(({ href, label, icon }) => {
    const Icon = ICONS[icon];
    const active = href === pathname;
    return (
      <Link key={href} href={href} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${active ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`} aria-current={active ? "page" : undefined}>
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
        {href === "/input-manual" && <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Nonaktif</span>}
      </Link>
    );
  });
}

export function AppSidebar({ items, user }: { items: readonly NavItem[]; user: { name: string; email: string | null; role: Role } }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:flex lg:flex-col" aria-label="Navigasi utama">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white" aria-hidden="true">SI</div>
          <div>
            <p className="text-sm font-semibold text-slate-800">SPPG Internal</p>
            <p className="text-xs text-slate-400">Backoffice Phase 1</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu utama">
          <NavLinks items={items} />
        </nav>

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
          {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
          <p className="mt-1 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{ROLE_LABELS[user.role]}</p>
          <Link href="/keamanan" className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Keamanan akun
          </Link>
          <form action={logout}>
            <button className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800">
              <LogOut className="size-3.5" aria-hidden="true" />
              Keluar
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
