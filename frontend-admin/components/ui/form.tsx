"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";

export const field = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
export const primaryButton = "h-10 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60";
export const secondaryButton = "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

/** Password input with a show/hide toggle, styled like `field`. */
export function PasswordField(props: InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={`${field} pr-10`} />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        aria-label={shown ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      >
        {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

/** Failure line for a form; `role="alert"` so a screen reader announces it. */
export function FormMessage({ children, tone = "error" }: { children?: ReactNode; tone?: "error" | "ok" }) {
  if (!children) return null;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`text-sm ${tone === "error" ? "text-red-700" : "text-emerald-700"}`}>
      {children}
    </p>
  );
}

/** Centered card for the pages that render without the app shell (login, reset). */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
      <section className="w-full max-w-sm space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white" aria-hidden="true">SI</div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">{title}</h1>
            <p className="text-xs text-slate-400">SPPG Internal</p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
