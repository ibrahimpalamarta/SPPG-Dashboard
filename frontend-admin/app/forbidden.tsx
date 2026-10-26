import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { logout } from "@/app/login/actions";

/** Rendered by forbidden() in requirePage() — HTTP 403. */
export default function Forbidden() {
  return (
    <main className="flex min-h-screen items-center bg-[#f7f8fa] p-4">
      <EmptyState title="Akses ditolak">
        <p>Anda tidak memiliki akses ke halaman ini. Hubungi Project Manager MBG bila Anda memerlukan akses.</p>
        <p className="flex justify-center gap-4">
          <Link href="/" className="font-medium text-emerald-700 hover:underline">
            Kembali ke dashboard
          </Link>
          <form action={logout}>
            <button className="font-medium text-emerald-700 hover:underline">Masuk dengan akun lain</button>
          </form>
        </p>
      </EmptyState>
    </main>
  );
}
