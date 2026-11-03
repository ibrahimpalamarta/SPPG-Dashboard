"use client";

import { useActionState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { deleteAllBatches, deleteBatch, setDevMode } from "@/app/(app)/unggah-data/actions";

const danger = "inline-flex h-7 items-center rounded-md border border-red-200 px-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

/** Dev mode only: removes a batch (even PUBLISHED) so its file can be re-uploaded and Overview recounted. */
export function DeleteBatchButton({ id, fileName }: { id: string; fileName: string }) {
  const t = useT();
  const [error, action, pending] = useActionState<string | null>(async () => {
    if (!window.confirm(t('Hapus "{fileName}" beserta datanya? File ini bisa diunggah ulang setelahnya.', { fileName }))) return null;
    return deleteBatch(id);
  }, null);

  return (
    <form action={action} className="inline-block">
      <button type="submit" disabled={pending} aria-label={`${t("Hapus")} ${fileName}`} className={danger}>
        {t("Hapus")}
      </button>
      {error && <p className="absolute right-4 mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
}

/** The "Mode development" switch; its state lives in a cookie so it survives reloads and applies to both history lists. */
export function DevModeSwitch({ on }: { on: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={() => start(() => setDevMode(!on))}
      className="flex items-center gap-2 text-sm text-slate-600 disabled:opacity-50"
    >
      {t("Mode development")}
      <span className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${on ? "bg-red-500" : "bg-slate-300"}`}>
        <span className={`size-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

/** Dev mode only: clears every file in the caller's dapur scope, back to an empty Overview. */
export function DeleteAllBatchesButton() {
  const t = useT();
  const [error, action, pending] = useActionState<string | null>(async () => {
    if (!window.confirm(t("Hapus SEMUA file beserta datanya, termasuk yang sudah dipublish? Tindakan ini tidak bisa dibatalkan."))) return null;
    return deleteAllBatches();
  }, null);

  return (
    <form action={action} className="flex items-center gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={danger}>
        {t("Hapus semua file")}
      </button>
    </form>
  );
}
