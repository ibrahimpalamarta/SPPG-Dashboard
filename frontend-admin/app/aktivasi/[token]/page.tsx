import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AuthCard } from "@/components/ui/form";
import { publicGet } from "@/lib/api";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { ResetForm } from "@/app/reset-password/[token]/reset-form";

export const metadata: Metadata = { title: "Aktivasi Akun · SPPG Internal", robots: { index: false } };

/** SCRUM-122: an invitation link. The role is shown, not chosen; the password sets the account live. */
export default async function Page({ params }: PageProps<"/aktivasi/[token]">) {
  const { token } = await params;
  const res = await publicGet(`/auth/invitations/${encodeURIComponent(token)}`);

  if (!res.ok) {
    return (
      <AuthCard title="Aktivasi akun">
        <p role="alert" className="text-sm text-red-700">
          {res.status === 429 ? "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." : "Tautan undangan kedaluwarsa atau dibatalkan. Minta Project Manager MBG mengirim ulang undangan."}
        </p>
        <Link href="/login" className="text-sm font-medium text-emerald-700">
          Ke halaman masuk
        </Link>
      </AuthCard>
    );
  }

  const invite = res.data as { email: string; fullName: string | null; role: Role; expiresAt: string };
  return (
    <AuthCard title="Aktifkan akun Anda">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <dt className="text-slate-500">Nama</dt>
        <dd className="font-medium text-slate-800">{invite.fullName ?? "—"}</dd>
        <dt className="text-slate-500">Email</dt>
        <dd className="break-all text-slate-800">{invite.email}</dd>
        <dt className="text-slate-500">Role</dt>
        <dd>
          <Badge tone="blue">{ROLE_LABELS[invite.role]}</Badge>
        </dd>
        <dt className="text-slate-500">Berlaku s/d</dt>
        <dd className="text-slate-800">{new Date(invite.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</dd>
      </dl>
      <ResetForm token={token} submitLabel="Aktifkan & masuk" />
      <Link href="/" className="block text-center text-sm font-medium text-slate-500 hover:text-slate-800">
        Batal, kembali ke dashboard
      </Link>
    </AuthCard>
  );
}
