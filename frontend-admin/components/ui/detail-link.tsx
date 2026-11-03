import { ArrowRight } from "lucide-react";
import { getT } from "@/lib/lang-server";

export async function DetailLink({ className = "text-emerald-700" }: { className?: string }) {
  const t = await getT();
  return (
    <button className={`text-sm font-medium ${className}`}>
      {t("Lihat Detail")} <ArrowRight className="ml-1 inline size-4" aria-hidden="true" />
    </button>
  );
}
