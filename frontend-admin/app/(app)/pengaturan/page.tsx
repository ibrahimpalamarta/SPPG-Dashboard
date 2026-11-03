import type { Metadata } from "next";
import { Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getT } from "@/lib/lang-server";
import { getMe } from "@/lib/me";
import { ROLE_LABELS } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Pengaturan")} · SPPG Internal` };
}

const heading = "flex items-center gap-3 text-base font-semibold text-slate-900";
const segment = "rounded-md px-3 py-1.5 text-sm font-medium";

export default async function Page() {
  const [me, t] = await Promise.all([getMe(), getT()]);
  const name = me.fullName ?? t(ROLE_LABELS[me.role]);
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const rows = [
    [t("Role"), t(ROLE_LABELS[me.role])],
    [t("Cakupan"), me.kitchens.map((k) => k.name).join(", ") || "—"],
    [t("Verifikasi dua langkah"), me.mfaEnabled ? t("Aktif") : t("Belum aktif")],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{t("Pengaturan")}</h1>
        <p className="mt-2 text-slate-500">{t("Profil dan tampilan.")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-6 p-6">
          <h2 className={heading}>
            <UserRound className="size-5 text-emerald-600" aria-hidden="true" />
            {t("Profil")}
          </h2>
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white" aria-hidden="true">{initials}</span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{name}</p>
              <p className="truncate text-sm text-slate-500">{me.email}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <Link href="/keamanan" className="inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800">{t("Kelola keamanan akun")}</Link>
        </Card>

        <Card className="space-y-6 p-6 lg:self-start">
          <h2 className={heading}>
            <Sun className="size-5 text-emerald-600" aria-hidden="true" />
            {t("Tampilan")}
          </h2>
          {/* Dark theme is deferred: only Terang is real, the rest stay disabled until it ships. */}
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t("Tema")}>
            <button type="button" disabled title={t("Segera hadir")} className={`${segment} text-slate-400`}>{t("Sistem")}</button>
            <button type="button" aria-pressed="true" className={`${segment} bg-white text-slate-900 shadow-sm`}>{t("Terang")}</button>
            <button type="button" disabled title={t("Segera hadir")} className={`${segment} text-slate-400`}>{t("Gelap")}</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
