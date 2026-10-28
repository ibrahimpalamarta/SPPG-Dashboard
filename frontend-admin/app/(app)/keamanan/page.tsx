import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import { getMe } from "@/lib/me";
import { revokeSession } from "./actions";
import { ChangePasswordForm, DisableMfa, EnableMfa } from "./security-forms";
import { secondaryButton } from "@/components/ui/form";

export const metadata: Metadata = { title: "Keamanan Akun · SPPG Internal" };

type Session = { id: string; createdAt: string; lastSeenAt: string; ip: string | null; userAgent: string | null; current: boolean };

const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

const card = "space-y-3 rounded-xl border border-slate-200 bg-white p-5";

export default async function Page() {
  const me = await getMe();
  const sessions = await apiGet<Session[]>("/auth/sessions");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Keamanan akun</h1>
      {me.mfaEnrollmentRequired && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Peran Anda wajib memakai verifikasi dua langkah. Aktifkan terlebih dahulu untuk membuka halaman lain.
        </p>
      )}

      <section className={card}>
        <h2 className="text-sm font-semibold text-slate-700">Verifikasi dua langkah (MFA)</h2>
        {me.mfaEnabled ? <DisableMfa /> : <EnableMfa />}
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold text-slate-700">Ubah password</h2>
        <ChangePasswordForm />
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Sesi aktif</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="px-5 py-2 font-medium">Perangkat</th>
              <th className="px-5 py-2 font-medium">Masuk</th>
              <th className="px-5 py-2 font-medium">Terakhir aktif</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="max-w-xs truncate px-5 py-2" title={s.userAgent ?? undefined}>
                  {s.userAgent || "Tidak diketahui"}
                  {s.ip && <span className="block text-xs text-slate-400">{s.ip}</span>}
                </td>
                <td className="px-5 py-2">{when(s.createdAt)}</td>
                <td className="px-5 py-2">{when(s.lastSeenAt)}</td>
                <td className="px-5 py-2 text-right">
                  {s.current ? (
                    <span className="text-xs font-medium text-emerald-700">Sesi ini</span>
                  ) : (
                    <form action={revokeSession.bind(null, s.id)}>
                      <button className={secondaryButton}>Keluarkan</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
