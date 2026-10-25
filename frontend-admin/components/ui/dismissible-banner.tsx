"use client";

import { X } from "lucide-react";
import { useState } from "react";

const tones = {
  info: "border-slate-200 bg-slate-50 text-slate-600",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function DismissibleBanner({ tone, icon, children }: { tone: keyof typeof tones; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${tones[tone]}`}>
      {icon}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
      <button
        onClick={() => setOpen(false)}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md opacity-60 hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        aria-label="Tutup"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
