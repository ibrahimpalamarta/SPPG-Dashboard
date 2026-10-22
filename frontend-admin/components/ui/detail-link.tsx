import { ArrowRight } from "lucide-react";

export function DetailLink({ className = "text-emerald-700" }: { className?: string }) {
  return (
    <button className={`text-sm font-medium ${className}`}>
      Lihat Detail <ArrowRight className="ml-1 inline size-4" aria-hidden="true" />
    </button>
  );
}
