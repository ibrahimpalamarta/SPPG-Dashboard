import { Link2 } from "lucide-react";

export function SourceLink({ className = "text-emerald-700" }: { className?: string }) {
  return (
    <button className={`flex items-center gap-2 text-sm font-medium ${className}`}>
      <Link2 className="size-4" aria-hidden="true" />
      Lacak Sumber
    </button>
  );
}
