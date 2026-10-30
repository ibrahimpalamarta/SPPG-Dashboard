"use client";

import { CheckCircle2, Send, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { reviewBatch } from "@/app/(app)/mapping-validasi/actions";

const primary =
  "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500";
const secondary =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:text-slate-400";

/**
 * SCRUM-117/95: Data Operasional sends a checked batch to the PM; the PM
 * returns it with a note or publishes it. The backend enforces every rule
 * (blockers, four-eyes, state); this only shows the buttons that can apply.
 */
export function ReviewActions({ batchId, status, canSubmit, canPublish }: { batchId: string; status: string; canSubmit: boolean; canPublish: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const act = (action: "submit" | "return" | "publish") => start(async () => setError(await reviewBatch(batchId, action, note)));

  const submit = canSubmit && status === "NEEDS_REVIEW";
  const review = canPublish && status === "READY";
  if (!submit && !review) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {submit && (
          <button disabled={pending} onClick={() => act("submit")} className={primary}>
            <Send className="size-4" aria-hidden="true" />
            Kirim ke PM
          </button>
        )}
        {review && (
          <>
            <button disabled={pending} onClick={() => setReturning((r) => !r)} className={secondary}>
              <Undo2 className="size-4" aria-hidden="true" />
              Kembalikan
            </button>
            <button disabled={pending} onClick={() => act("publish")} className={primary}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Publish
            </button>
          </>
        )}
      </div>
      {returning && review && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act("return");
          }}
          className="flex w-full max-w-md flex-col items-end gap-2"
        >
          <label className="w-full text-sm font-semibold text-slate-900">
            Alasan dikembalikan
            <textarea
              required
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
          </label>
          <button disabled={pending} className={secondary}>
            Kirim pengembalian
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
