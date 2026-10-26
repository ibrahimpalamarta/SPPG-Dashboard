"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Native <dialog>: focus trap, Esc and backdrop come from the platform. */
export function Modal({ open, onClose, icon, title, subtitle, footer, children }: { open: boolean; onClose: () => void; icon: ReactNode; title: string; subtitle: string; footer: ReactNode; children: ReactNode }) {
  if (!open) return null;

  return (
    <dialog
      ref={(d) => {
        if (d && !d.open) d.showModal();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="flex items-start gap-3 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="truncate text-sm text-slate-500">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Tutup" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-3 border-t border-slate-100 p-5 text-sm text-slate-600">{children}</div>
      <div className="flex justify-end gap-2 border-t border-slate-100 p-4">{footer}</div>
    </dialog>
  );
}
