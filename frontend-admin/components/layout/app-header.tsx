"use client";

import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { NavLinks, type NavItem } from "@/components/layout/app-sidebar";
import type { Kitchen } from "@/lib/me";
import { KITCHEN_COOKIE } from "@/lib/nav";

export function AppHeader({ items, kitchens, kitchenId }: { items: readonly NavItem[]; kitchens: Kitchen[]; kitchenId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = items.find((n) => n.href === pathname)?.label ?? (pathname === "/keamanan" ? "Keamanan akun" : undefined);

  function selectKitchen(id: string) {
    // Read back server-side by selectedKitchen(), which re-checks it against
    // the user's scope — this cookie is a preference, never an authorization.
    document.cookie = `${KITCHEN_COOKIE}=${id}; path=${process.env.NEXT_PUBLIC_BASE_PATH}; max-age=31536000; samesite=lax`;
    router.refresh();
  }

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

      <label className="ml-auto flex items-center gap-2 text-sm text-slate-500">
        <span>Dapur</span>
        {kitchens.length === 0 ? (
          <span className="text-slate-400">Tidak ada dapur dalam akses Anda</span>
        ) : (
          <select value={kitchenId} onChange={(e) => selectKitchen(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20">
            {kitchens.map((k) => (
              <option key={k.id} value={k.id}>
                {k.code ? `${k.code} · ${k.name}` : k.name}
              </option>
            ))}
          </select>
        )}
      </label>
    </header>
  );
}
