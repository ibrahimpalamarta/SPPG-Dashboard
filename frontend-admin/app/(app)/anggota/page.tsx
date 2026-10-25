import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { ROLE_LABELS } from "@/lib/roles";
import type { Kitchen } from "@/lib/me";
import { issueReset, resetMfa, revokeSessions } from "./actions";
import { ActionButton, CreateUserForm, EditUserForm, type UserRow } from "./user-controls";

export const metadata: Metadata = { title: "Anggota · SPPG Internal" };

const card = "space-y-3 rounded-xl border border-slate-200 bg-white p-5";

const lastLogin = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Belum pernah");

export default async function Page() {
  const me = await requirePage("/anggota");
  const canManage = me.permissions.includes("users:manage");
  const [{ data: users }, { data: kitchens }] = await Promise.all([
    apiGet<{ data: UserRow[] }>("/admin/users?pageSize=100"),
    apiGet<{ data: Kitchen[] }>("/kitchens?pageSize=100"),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">Anggota</h1>

      {canManage ? (
        <section className={card}>
          <h2 className="text-sm font-semibold text-slate-700">Akun baru</h2>
          <CreateUserForm kitchens={kitchens} />
        </section>
      ) : (
        <p className="text-sm text-slate-500">Anda dapat melihat daftar anggota, tetapi tidak dapat mengubahnya.</p>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Anggota</th>
              <th className="px-4 py-2 font-medium">Peran</th>
              <th className="px-4 py-2 font-medium">Dapur</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Login terakhir</th>
            </tr>
          </thead>
          {users.map((u) => (
            <tbody key={u.id} className="border-t border-slate-100 text-slate-700">
              <tr>
                <td className="px-4 py-2">
                  <span className="font-medium text-slate-800">{u.fullName ?? "—"}</span>
                  <span className="block text-xs text-slate-500">{u.email}</span>
                </td>
                <td className="px-4 py-2">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-2">{u.kitchenScopes.map((s) => s.kitchen.code ?? s.kitchen.name).join(", ") || "—"}</td>
                <td className="px-4 py-2">
                  {u.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  {u.mfaEnabled && <span className="block text-xs text-emerald-700">MFA aktif</span>}
                </td>
                <td className="px-4 py-2">{lastLogin(u.lastLoginAt)}</td>
              </tr>
              {canManage && (
                <tr>
                  <td colSpan={5} className="px-4 pb-3">
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-emerald-700">Kelola akun</summary>
                      <div className="mt-3 space-y-4">
                        <EditUserForm user={u} kitchens={kitchens} self={u.id === me.id} />
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          <ActionButton action={issueReset.bind(null, u.id)} label="Buat tautan atur password" />
                          <ActionButton action={revokeSessions.bind(null, u.id)} label="Cabut semua sesi" confirm="Keluarkan akun ini dari semua perangkat?" />
                          {u.mfaEnabled && <ActionButton action={resetMfa.bind(null, u.id)} label="Reset MFA" confirm="Reset verifikasi dua langkah akun ini?" />}
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </section>
    </div>
  );
}
