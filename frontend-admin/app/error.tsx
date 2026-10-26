"use client";

import { EmptyState } from "@/components/ui/empty-state";

/**
 * Root-level so it also catches a failing /api/me in the (app) layout. The
 * underlying message stays out of the UI; it is in the server log.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center bg-[#f7f8fa] p-4">
      <EmptyState title="Gagal memuat halaman">
        <p>Terjadi kesalahan saat mengambil data. Coba lagi beberapa saat lagi.</p>
        <p>
          <button onClick={reset} className="font-medium text-emerald-700 hover:underline">
            Coba lagi
          </button>
        </p>
      </EmptyState>
    </main>
  );
}
