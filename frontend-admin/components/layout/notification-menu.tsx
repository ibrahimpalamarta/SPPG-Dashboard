"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NotificationEntry } from "@/app/api/notifications/route";

const iconButton = "inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-emerald-300";

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<NotificationEntry[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Refetched on every open so the list is never stale.
  const toggle = () => {
    setOpen(!open);
    if (!open) fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/api/notifications`).then((r) => (r.ok ? r.json() : [])).then(setEntries, () => setEntries([]));
  };

  return (
    <div ref={box} className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button type="button" aria-label="Notifikasi" aria-expanded={open} onClick={toggle} className={iconButton}>
        <Bell className="size-5" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Notifikasi</p>
          <ul className="max-h-80 overflow-y-auto p-1">
            {entries === null && <li className="px-3 py-4 text-sm text-slate-500">Memuat…</li>}
            {entries?.length === 0 && <li className="px-3 py-4 text-sm text-slate-500">Belum ada notifikasi.</li>}
            {entries?.map((n) => (
              <li key={`${n.href}|${n.title}`}>
                <Link href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                  <p className="truncate font-medium text-slate-900">{n.title}</p>
                  <p className="truncate text-slate-500">{n.subtitle}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/inbox" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-emerald-700 hover:bg-slate-50">
            Lihat selengkapnya
          </Link>
        </div>
      )}
    </div>
  );
}
