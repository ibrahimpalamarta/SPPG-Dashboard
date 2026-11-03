import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { dateLocale } from "@/lib/lang";
import { getLang, getT } from "@/lib/lang-server";
import { PERMISSIONS, ROLE_LABELS, type Permission, type Role } from "@/lib/roles";
import type { Kitchen } from "@/lib/me";
import { cancelInvite, issueReset, setStatus } from "./actions";
import { ActionButton, CreateUserForm, RoleForm, ToastProvider, type UserRow } from "./user-controls";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Anggota")} · SPPG Internal` };
}

type Status = UserRow["memberStatus"];

const card = "space-y-3 rounded-xl border border-slate-200 bg-white p-5";

const STATUS: Record<Status, [string, string]> = {
  PENDING: ["Menunggu aktivasi", "bg-slate-400"],
  ACTIVE: ["Aktif", "bg-emerald-500"],
  EXPIRED: ["Kedaluwarsa", "bg-red-500"],
  INACTIVE: ["Nonaktif", "bg-slate-400"],
};

const TABS: { key: Status | "ALL"; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "ACTIVE", label: "Aktif" },
  { key: "PENDING", label: "Menunggu aktivasi" },
  { key: "EXPIRED", label: "Kedaluwarsa" },
  { key: "INACTIVE", label: "Nonaktif" },
];

const ROLE_CARDS: { role: Role; description: string; chips: string[] }[] = [
  {
    role: "DATA_ADMIN",
    description: "Mengerjakan data satu dapur: unggah file, cek validasi, lalu Setujui & Publish sendiri.",
    chips: ["Unggah & validasi", "Resolve issue", "Setujui & Publish"],
  },
  {
    role: "ADMIN",
    description: "Melihat semua dapur, mengelola anggota, Data Reference, dan Upload History (hanya lihat).",
    chips: ["Semua dapur", "Kelola anggota", "Data Reference", "Upload History"],
  },
];

const ALUR = [
  ["1 · Undang", "Admin", "Isi nama, email, role, dan dapur"],
  ["2 · Validasi", "Sistem", "Email belum terdaftar"],
  ["3 · Tautan aktivasi", "Status: Menunggu aktivasi", "Bisa dikirim ulang atau dibatalkan"],
  ["4 · Aktivasi", "Penerima", "Membuat kata sandi; role sudah ditetapkan"],
  ["5 · Aktif", "Masuk ke dashboard", "Akun berstatus Aktif"],
] as const;

const PERMISSION_LABELS: Record<Permission, string> = {
  "upload:create": "Unggah file",
  "upload:view": "Lihat riwayat unggah",
  "batch:publish": "Setujui & Publish file",
  "mapping:view": "Lihat mapping",
  "mapping:propose": "Ajukan mapping",
  "reference:view": "Lihat Data Reference",
  "reference:edit": "Ubah Data Reference",
  "dashboard:view": "Lihat dashboard",
  "users:read": "Lihat daftar anggota",
  "users:manage": "Undang anggota, ubah role, nonaktifkan",
  "settings:manage": "Atur hak akses role",
  "audit:read": "Lihat audit log",
};

/** Every kitchen (or none, for a role whose scope is never narrowed) reads as "Semua dapur"; several collapse to a count with the codes in a tooltip. */
async function KitchenCell({ scopes, total }: { scopes: UserRow["kitchenScopes"]; total: number }) {
  const t = await getT();
  const codes = scopes.map((s) => s.kitchen.code ?? s.kitchen.name);
  if (codes.length === 0 || codes.length === total) return <span>{t("Semua dapur")}</span>;
  if (codes.length === 1) return <span>{codes[0]}</span>;
  return <span title={codes.join(", ")}>{codes.length} {t("Dapur")}</span>;
}

const initials = (u: UserRow) => (u.fullName ?? u.email ?? "?").split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

// A handful of muted tones, picked deterministically from the name so avatars aren't all the same color.
const AVATAR_TONES = ["bg-emerald-100 text-emerald-700", "bg-slate-200 text-slate-700"];
const avatarTone = (u: UserRow) => AVATAR_TONES[(u.fullName ?? u.email ?? "?").charCodeAt(0) % AVATAR_TONES.length];

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [me, params, t, lang] = await Promise.all([requirePage("/anggota"), searchParams, getT(), getLang()]);
  const lastLogin = (iso: string | null) => (iso ? new Date(iso).toLocaleString(dateLocale(lang), { dateStyle: "medium", timeStyle: "short" }) : t("Belum pernah login"));
  const canManage = me.permissions.includes("users:manage");
  const [{ data: users }, { data: kitchens }, roles] = await Promise.all([
    apiGet<{ data: UserRow[] }>("/admin/users?pageSize=100"),
    apiGet<{ data: Kitchen[] }>("/kitchens?pageSize=100"),
    // The role map is only readable with settings:manage; without it the matrix is simply omitted.
    me.permissions.includes("settings:manage") ? apiGet<{ role: Role; permissions: Permission[] }[]>("/admin/roles") : null,
  ]);

  const tab = TABS.find((x) => x.key === params.status)?.key ?? "ALL";
  const count = (key: Status | "ALL") => (key === "ALL" ? users.length : users.filter((u) => u.memberStatus === key).length);
  const shown = tab === "ALL" ? users : users.filter((u) => u.memberStatus === tab);
  const granted = (role: Role) => roles?.find((r) => r.role === role)?.permissions ?? [];

  return (
    <ToastProvider>
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-800">{t("Anggota")}</h1>
        </div>
        {canManage && <CreateUserForm kitchens={kitchens} />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ROLE_CARDS.map((r) => (
          <section key={r.role} className={card}>
            <div>
              <h2 className="font-semibold text-slate-800">{t(ROLE_LABELS[r.role])}</h2>
              <p className="text-xs text-slate-500">{users.filter((u) => u.role === r.role && u.memberStatus === "ACTIVE").length} {t("anggota aktif")}</p>
            </div>
            <p className="text-sm text-slate-600">{t(r.description)}</p>
            <div className="flex flex-wrap gap-2">
              {r.chips.map((c) => (
                <span key={c} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {t(c)}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>

      <nav aria-label={t("Filter status")} className="flex flex-wrap gap-1 text-sm">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "ALL" ? "/anggota" : `/anggota?status=${item.key}`}
            aria-current={tab === item.key ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium ${tab === item.key ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t(item.label)} <span className="opacity-60">{count(item.key)}</span>
          </Link>
        ))}
      </nav>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Nama")}</th>
              <th className="px-4 py-3 font-medium">{t("Role")}</th>
              <th className="px-4 py-3 font-medium">{t("Dapur")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Keterangan")}</th>
              {canManage && <th className="px-4 py-3 font-medium">{t("Aksi")}</th>}
            </tr>
          </thead>
          {shown.map((u) => (
            <tbody key={u.id} className="border-t border-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarTone(u)}`} aria-hidden="true">
                      {initials(u)}
                    </span>
                    <span>
                      <span className="font-medium text-slate-800">{u.fullName ?? "—"}</span>
                      {u.id === me.id && <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t("Anda")}</span>}
                      <span className="block text-xs text-slate-500">{u.email}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{t(ROLE_LABELS[u.role])}</td>
                <td className="px-4 py-3">
                  <KitchenCell scopes={u.kitchenScopes} total={kitchens.length} />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full ${STATUS[u.memberStatus][1]}`} aria-hidden="true" />
                    {t(STATUS[u.memberStatus][0])}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {lastLogin(u.lastLoginAt)}
                  {u.mfaEnabled && <span className="block text-xs text-emerald-700">{t("MFA aktif")}</span>}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-start gap-2">
                      {u.id === me.id ? (
                        <span className="text-slate-500">{t("Akun Anda")}</span>
                      ) : u.memberStatus === "PENDING" || u.memberStatus === "EXPIRED" ? (
                        <>
                          <ActionButton action={issueReset.bind(null, u.id)} label={t("Kirim ulang")} />
                          <ActionButton action={cancelInvite.bind(null, u.id, u.email)} label={t("Batalkan")} confirm={{ title: t("Batalkan undangan {name}?", { name: u.fullName ?? u.email ?? "" }), subtitle: `${t(ROLE_LABELS[u.role])} · ${u.email}`, body: t("Tautan aktivasi langsung tidak berlaku dan akun dihapus dari daftar. Untuk mengundang lagi, buat undangan baru."), label: t("Batalkan undangan") }} />
                        </>
                      ) : u.memberStatus === "INACTIVE" ? (
                        <ActionButton action={setStatus.bind(null, u.id, "ACTIVE")} label={t("Aktifkan kembali")} />
                      ) : (
                        <>
                          <RoleForm user={u} kitchens={kitchens} />
                          <ActionButton action={setStatus.bind(null, u.id, "INACTIVE")} label={t("Nonaktifkan")} confirm={{ title: t("Nonaktifkan {name}?", { name: u.fullName ?? u.email ?? "" }), subtitle: `${t(ROLE_LABELS[u.role])} · ${u.email}`, body: t("Akses langsung dicabut. Akun tidak dihapus: histori upload, resolusi issue, dan review tetap bisa ditelusuri. Anggota bisa diaktifkan kembali kapan saja."), label: t("Nonaktifkan") }} />
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            </tbody>
          ))}
          {shown.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                  {t("Tidak ada anggota dengan status ini.")}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">{t("Alur undang anggota")}</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {ALUR.map(([step, title, note]) => (
            <li key={step} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-600">{t(step)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{t(title)}</p>
              <p className="mt-1 text-xs text-slate-500">{t(note)}</p>
            </li>
          ))}
        </ol>
      </section>

      {roles && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">{t("Matriks hak akses")}</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("Aksi")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t(ROLE_LABELS.DATA_ADMIN)}</th>
                  <th className="px-4 py-3 text-center font-medium">{t(ROLE_LABELS.ADMIN)}</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{t(PERMISSION_LABELS[p])}</td>
                    {(["DATA_ADMIN", "ADMIN"] as const).map((r) => (
                      <td key={r} className="px-4 py-2.5 text-center">
                        {granted(r).includes(p) ? (
                          <Check className="mx-auto size-4 text-emerald-600" aria-label={t("Diizinkan")} />
                        ) : (
                          <Minus className="mx-auto size-4 text-slate-300" aria-label={t("Tidak diizinkan")} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
    </ToastProvider>
  );
}
