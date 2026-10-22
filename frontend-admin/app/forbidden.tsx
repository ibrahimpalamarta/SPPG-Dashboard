import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

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
          {/* /auth/* is served by the Auth0 proxy, not an app route. */}
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH}/auth/logout`} className="font-medium text-emerald-700 hover:underline">
            Masuk dengan akun lain
          </a>
        </p>
      </EmptyState>
    </main>
  );
}
