"use client";

import { X } from "lucide-react";
import { useActionState } from "react";
import { deleteBatch } from "@/app/(app)/unggah-data/actions";

/** Testing aid: clears a batch out of the history so its file can be re-uploaded. Backend still refuses PUBLISHED (409). */
export function DeleteBatchButton({ id, fileName }: { id: string; fileName: string }) {
  const [error, action, pending] = useActionState<string | null>(async () => {
    if (!window.confirm(`Hapus riwayat "${fileName}"? File ini bisa diunggah ulang setelahnya.`)) return null;
    return deleteBatch(id);
  }, null);

  return (
    <form action={action} className="inline-block">
      <button
        type="submit"
        disabled={pending}
        aria-label={`Hapus riwayat ${fileName}`}
        title="Hapus riwayat"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      {error && <p className="absolute right-4 mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
}
