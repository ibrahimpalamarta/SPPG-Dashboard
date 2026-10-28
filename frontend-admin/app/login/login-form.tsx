"use client";

import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, verifyMfa, type LoginState } from "./actions";
import { FormMessage } from "@/components/ui/form";

const input =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15";

const cta =
  "group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30 disabled:opacity-60";

const initial: LoginState = { step: "password" };

/** Email + password sign-in (and the MFA code when required). The role comes from the backend session. */
export function LoginForm({ returnTo, notice }: { returnTo?: string; notice?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState<LoginState, FormData>(
    (prev, form) => (prev.step === "mfa" ? verifyMfa(prev, form) : login(prev, form)),
    initial,
  );

  return (
    <form action={action} className="mt-8 space-y-6">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {state.step === "mfa" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Kode verifikasi</span>
          <input name="code" autoComplete="one-time-code" required autoFocus placeholder="6 digit, atau kode pemulihan" className={input} />
        </label>
      ) : (
        <>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input type="email" name="email" autoComplete="username" required autoFocus defaultValue={state.email} placeholder="nama@sppg.internal" className={input} />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <label htmlFor="password" className="font-medium text-slate-700">Kata sandi</label>
              <Link href="/lupa-kata-sandi" className="text-xs font-medium text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Lupa kata sandi?</Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Masukkan kata sandi" className={`${input} px-11`} />
              <button type="button" onClick={() => setShowPassword((shown) => !shown)} className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </>
      )}

      {!state.message && notice && <FormMessage tone="ok">{notice}</FormMessage>}
      <FormMessage>{state.message}</FormMessage>

      <button type="submit" disabled={pending} className={cta}>
        {pending ? "Memproses…" : state.step === "mfa" ? "Verifikasi" : "Masuk"}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </button>
    </form>
  );
}
