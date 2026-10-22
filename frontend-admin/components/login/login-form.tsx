"use client";

import { ArrowRight, Check, Eye, EyeOff, Lock, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = [
  {
    id: "operasional",
    label: "Data Operasional",
    icon: Upload,
    description: "Akses semua Overview dan seluruh fitur: unggah data, mapping & validasi, finance, kesehatan data, manual entry.",
  },
  {
    id: "pm",
    label: "Project Manager MBG",
    icon: Check,
    description: "Mereview data dan pekerjaan yang diinput Data Operasional, lalu menyetujui (publish) atau mengembalikannya.",
  },
];

const input =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15";

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState(roles[1]);
  const [showPassword, setShowPassword] = useState(false);

  // ponytail: no credentials check yet; replace with the Auth0 login flow.
  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push("/overview");
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-slate-700">Pilih peran</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {roles.map((option) => {
            const selected = option.id === role.id;
            return (
              <label key={option.id} className={`group relative flex cursor-pointer flex-col rounded-2xl border p-5 transition duration-200 focus-within:ring-4 focus-within:ring-emerald-600/20 ${selected ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-900/5" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"}`}>
                <input type="radio" name="role" value={option.id} checked={selected} onChange={() => setRole(option)} className="sr-only" />
                <span className={`flex size-11 items-center justify-center rounded-xl transition-colors ${selected ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700"}`}>
                  <option.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-6 flex items-center justify-between gap-2 font-semibold text-slate-900">
                  {option.label}
                  <span className={`flex size-5 items-center justify-center rounded-full border transition ${selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`} aria-hidden="true">
                    {selected && <Check className="size-3" />}
                  </span>
                </span>
                <span className="mt-2 text-xs leading-relaxed text-slate-500">{option.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
        <input type="email" autoComplete="username" placeholder="nama@sppg.internal" className={input} />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <label htmlFor="password" className="font-medium text-slate-700">Kata sandi</label>
          <a href="#" className="font-medium text-emerald-700 hover:underline">Lupa kata sandi?</a>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" className={`${input} px-11`} />
          <button type="button" onClick={() => setShowPassword((shown) => !shown)} className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
            {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <button type="submit" className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30">
        Masuk sebagai {role.label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </button>
    </form>
  );
}
