export type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  user: { fullName: string | null; email: string } | null;
};

const actionLabel: Record<string, string> = {
  "upload_batch.created": "File diunggah",
  "upload_batch.profile_detected": "Profil mapping diterapkan",
  "upload_batch.reviewed": "Status diubah",
  "upload_batch.replaced": "Diganti file baru",
};

const detailOf = ({ action, metadata: m }: HistoryEntry) => {
  if (!m) return null;
  if (action === "upload_batch.created") return `Status ${m.status}`;
  if (action === "upload_batch.profile_detected") return `${m.mappingProfileId} versi ${m.templateVersion}`;
  if (action === "upload_batch.reviewed") return `${m.from} → ${m.to}`;
  if (action === "upload_batch.replaced") return `Diganti oleh batch ${m.replacedBy}`;
  return null;
};

const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** "Riwayat": the batch's audit trail. */
export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return <p className="py-16 text-center text-sm text-slate-500">Belum ada riwayat.</p>;
  return (
    <ol className="divide-y divide-slate-100 text-sm">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4 hover:bg-slate-50">
          <span>
            <span className="block font-semibold text-slate-900">{actionLabel[e.action] ?? e.action}</span>
            <span className="text-slate-500">{detailOf(e)}</span>
          </span>
          <span className="text-slate-500">
            {when(e.timestamp)} · {e.user?.fullName ?? e.user?.email ?? "Sistem"}
          </span>
        </li>
      ))}
    </ol>
  );
}
