import { getT } from "@/lib/lang-server";

export async function DetailLink({ className = "text-emerald-700" }: { className?: string }) {
  const t = await getT();
  return (
    <button className={`text-sm font-medium ${className}`}>
      {t("Lihat Detail")}
    </button>
  );
}
