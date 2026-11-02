"use client";

import { useActionState } from "react";
import { deleteAllBatches, deleteBatch } from "@/app/(app)/unggah-data/actions";

const danger = "inline-flex h-7 items-center rounded-md border border-red-200 px-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

/** Dev mode only: removes a batch (even PUBLISHED) so its file can be re-uploaded and Overview recounted. */
export function DeleteBatchButton({ id, fileName }: { id: string; fileName: string }) {
  const [error, action, pending] = useActionState<string | null>(async () => {
    if (!window.confirm(`Hapus "${fileName}" beserta datanya? File ini bisa diunggah ulang setelahnya.`)) return null;
    return deleteBatch(id);
  }, null);

  return (
    <form action={action} className="inline-block">
      <button type="submit" disabled={pending} aria-label={`Hapus ${fileName}`} className={danger}>
        Hapus
      </button>
      {error && <p className="absolute right-4 mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
}

/** Dev mode only: clears every file in the caller's dapur scope, back to an empty Overview. */
export function DeleteAllBatchesButton() {
  const [error, action, pending] = useActionState<string | null>(async () => {
    if (!window.confirm("Hapus SEMUA file beserta datanya, termasuk yang sudah dipublish? Tindakan ini tidak bisa dibatalkan.")) return null;
    return deleteAllBatches();
  }, null);

  return (
    <form action={action} className="flex items-center gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={danger}>
        Hapus semua file
      </button>
    </form>
  );
}
