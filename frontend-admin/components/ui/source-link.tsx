import { Link2 } from "lucide-react";

export function SourceLink() {
  return (
    <button className="flex items-center gap-2 text-sm font-medium text-emerald-700">
      <Link2 className="size-4" aria-hidden="true" />
      Lacak Sumber
    </button>
  );
}
