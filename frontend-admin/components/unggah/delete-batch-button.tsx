"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteBatch } from "@/app/(app)/unggah-data/actions";

export function DeleteBatchButton({ id, fileName }: { id: string; fileName: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Hapus "${fileName}" beserta datanya? Tindakan ini tidak bisa dibatalkan.`)) return;
        start(async () => {
          const error = await deleteBatch(id);
          if (error) alert(error);
        });
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden="true" />
      Hapus
    </button>
  );
}
