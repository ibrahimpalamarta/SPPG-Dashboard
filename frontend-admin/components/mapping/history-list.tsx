import { dateLocale, type T } from "@/lib/lang";
import { getLang, getT } from "@/lib/lang-server";

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

const detailOf = (t: T, { action, metadata: m }: HistoryEntry) => {
  if (!m) return null;
  if (action === "upload_batch.created") return `${t("Status")} ${m.status}`;
  if (action === "upload_batch.profile_detected") return t("{profile} versi {version}", { profile: String(m.mappingProfileId), version: String(m.templateVersion) });
  if (action === "upload_batch.reviewed") return `${m.from} → ${m.to}`;
  if (action === "upload_batch.replaced") return t("Diganti oleh batch {batch}", { batch: String(m.replacedBy) });
  return null;
};

/** "Riwayat": the batch's audit trail. */
export async function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const when = (iso: string) => new Date(iso).toLocaleString(dateLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  if (entries.length === 0) return <p className="py-16 text-center text-sm text-slate-500">{t("Belum ada riwayat.")}</p>;
  return (
    <ol className="divide-y divide-slate-100 text-sm">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4 hover:bg-slate-50">
          <span>
            <span className="block font-semibold text-slate-900">{t(actionLabel[e.action] ?? e.action)}</span>
            <span className="text-slate-500">{detailOf(t, e)}</span>
          </span>
          <span className="text-slate-500">
            {when(e.timestamp)} · {e.user?.fullName ?? e.user?.email ?? t("Sistem")}
          </span>
        </li>
      ))}
    </ol>
  );
}
