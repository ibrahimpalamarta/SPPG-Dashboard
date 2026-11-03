import { Link2 } from "lucide-react";
import { getT } from "@/lib/lang-server";

export async function SourceLink({ className = "text-emerald-700" }: { className?: string }) {
  const t = await getT();
  return (
    <button className={`flex items-center gap-2 text-sm font-medium ${className}`}>
      <Link2 className="size-4" aria-hidden="true" />
      {t("Lacak Sumber")}
    </button>
  );
}
