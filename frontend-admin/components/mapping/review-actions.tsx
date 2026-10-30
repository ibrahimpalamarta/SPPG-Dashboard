"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { publishBatch } from "@/app/(app)/mapping-validasi/actions";

/**
 * SCRUM-151: Data Operasional publishes a checked file itself. The backend
 * enforces every rule (blockers, dapur, state); this only shows the button
 * when it can apply.
 */
export function ReviewActions({ batchId, status, canPublish }: { batchId: string; status: string; canPublish: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!canPublish || status !== "NEEDS_REVIEW") return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        disabled={pending}
        onClick={() => start(async () => setError(await publishBatch(batchId)))}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Setujui & Publish
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
