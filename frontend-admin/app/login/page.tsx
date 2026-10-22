import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = { title: "Masuk · SPPG Internal" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-emerald-50 via-white to-emerald-50 p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-emerald-900/10 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="relative hidden overflow-hidden bg-emerald-800 p-10 text-white lg:block" aria-hidden="true">
          <div className="absolute -right-24 -top-24 size-72 rounded-full border-[36px] border-white/10" />
          <div className="absolute -bottom-32 -left-24 size-72 rounded-full border-[36px] border-white/10" />
          <div className="relative">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-16 text-4xl font-bold leading-tight tracking-tight">Data yang rapi, keputusan yang pasti.</h2>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-emerald-50/90">Satu ruang kerja untuk memantau data operasional, validasi, dan progres setiap dapur.</p>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Masuk ke dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Pilih peran Anda, lalu masuk dengan akun kerja.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
