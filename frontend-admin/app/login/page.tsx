import type { Metadata } from "next";
import { AuthCard } from "@/components/ui/form";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk · SPPG Internal" };

export default async function Page({ searchParams }: PageProps<"/login">) {
  const { returnTo, expired, reset } = await searchParams;
  const notice = expired ? "Sesi Anda berakhir. Silakan masuk kembali." : reset ? "Password diperbarui. Silakan masuk." : undefined;

  return (
    <AuthCard title="Masuk">
      <LoginForm returnTo={typeof returnTo === "string" ? returnTo : undefined} notice={notice} />
      <p className="text-xs text-slate-500">Lupa password atau belum punya akun? Hubungi Project Manager MBG.</p>
    </AuthCard>
  );
}
