"use client";

import { Menu, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinks, UserMenu, type AppUser, type NavItem } from "@/components/layout/app-sidebar";
import { HeaderSearch } from "@/components/layout/header-search";
import { NotificationMenu } from "@/components/layout/notification-menu";

const iconButton = "inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-emerald-300";

export function AppHeader({ items, user }: { items: readonly NavItem[]; user: AppUser }) {
  const pathname = usePathname();
  const title = items.find((n) => n.href === pathname)?.label ?? (pathname === "/keamanan" ? "Keamanan akun" : pathname === "/pengaturan" ? "Pengaturan" : undefined);

  return (
    <header className="flex min-h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Desktop-first: below lg the sidebar collapses into this native disclosure. */}
      <details className="relative lg:hidden">
        <summary className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Buka navigasi">
          <Menu className="size-5" aria-hidden="true" />
        </summary>
        <nav className="absolute left-0 top-11 z-10 flex w-64 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg" aria-label="Menu utama">
          <NavLinks items={items} />
          <div className="mt-2 border-t border-slate-100 pt-2">
            <UserMenu user={user} />
          </div>
        </nav>
      </details>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Dashboard</span>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="font-medium text-slate-800">{title}</span>
      </div>

      <HeaderSearch items={items} />

      <div className="flex items-center gap-3">
        <Link href="/pengaturan" aria-label="Pengaturan" className={iconButton}>
          <Settings className="size-5" aria-hidden="true" />
        </Link>
        <NotificationMenu />
      </div>
    </header>
  );
}
