import type { Metadata } from "next";
import Link from "next/link";
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

  const invite = res.data as { email: string; fullName: string | null; role: Role };
  return (
    <AuthCard title="Aktivasi akun">
      <dl className="space-y-3 text-sm">
        {[
          ["Email", invite.email],
          ["Nama", invite.fullName ?? "—"],
          ["Peran", ROLE_LABELS[invite.role]],
        ].map(([label, value]) => (
          <div key={label} className="space-y-1">
            <dt className="font-medium text-slate-700">{label}</dt>
            <dd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{value}</dd>
          </div>
        ))}
      </dl>
      <ResetForm token={token} />
    </AuthCard>
  );
}
