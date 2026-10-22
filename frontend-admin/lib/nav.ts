import type { Permission } from "@/lib/me";

/**
 * PRD §5: the seven Phase 1 pages. One list drives both the sidebar (hide what
 * the role cannot open) and requirePage() (reject a deep link to it), so the
 * two can never disagree.
 *
 * `icon` is a lucide-react export name, resolved in the (client) sidebar —
 * component references cannot cross the server/client boundary.
 */
export const NAV = [
  { href: "/overview", label: "Overview", icon: "LayoutDashboard", permission: "dashboard:view" },
  { href: "/unggah-data", label: "Unggah Data", icon: "Upload", permission: "upload:view" },
  { href: "/mapping-validasi", label: "Mapping & Validasi", icon: "Map", permission: "mapping:view" },
  { href: "/finance", label: "Finance & Cost", icon: "Wallet", permission: "dashboard:view" },
  { href: "/kesehatan-data", label: "Data Health", icon: "Activity", permission: "dashboard:view" },
  { href: "/referensi-data", label: "Data Reference", icon: "BookOpen", permission: "reference:view" },
  // Fallback terkontrol (PRD §4.2); the form itself is SCRUM-108.
  { href: "/input-manual", label: "Manual / Quick Entry", icon: "PenLine", permission: "upload:create" },
] as const satisfies readonly { href: string; label: string; icon: string; permission: Permission }[];

export type NavHref = (typeof NAV)[number]["href"];

/** Set by the kitchen selector in the header, read by selectedKitchen(). */
export const KITCHEN_COOKIE = "kitchen";
