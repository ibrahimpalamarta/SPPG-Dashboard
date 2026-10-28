import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk · SPPG Internal" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { returnTo, expired, reset } = await searchParams;
  const notice = expired ? "Sesi Anda berakhir. Silakan masuk kembali." : reset ? "Password diperbarui. Silakan masuk." : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[0.85fr_1.15fr]">
        <section className="hidden bg-emerald-800 p-10 text-white lg:block" aria-hidden="true">
          <p className="text-sm font-semibold">SPPG Internal</p>
          <h2 className="mt-16 text-3xl font-bold leading-tight tracking-tight">Backoffice program Makan Bergizi Gratis</h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-emerald-50/90">Unggah, validasi, dan pantau kelengkapan data setiap dapur.</p>
        </section>

        <section className="p-6 sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Masuk ke dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Masuk dengan akun kerja Anda.</p>
          <LoginForm returnTo={typeof returnTo === "string" ? returnTo : undefined} notice={notice} />
        </section>
      </div>
    </main>
  );
}
