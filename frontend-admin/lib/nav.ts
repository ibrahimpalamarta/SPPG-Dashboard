import type { Permission, Role } from "@/lib/roles";

/**
 * SCRUM-21: the Phase 1 pages (PRD §5, Inbox, Anggota). One
 * list drives both the sidebar (hide what
 * the role cannot open) and requirePage() (reject a deep link to it), so the
 * two can never disagree.
 *
 * `icon` is a lucide-react export name, resolved in the (client) sidebar —
 * component references cannot cross the server/client boundary.
 */
export const NAV = [
  { group: "Dashboard", href: "/overview", label: "Overview", icon: "LayoutDashboard", permission: "dashboard:view" },
  { group: "Dashboard", href: "/finance", label: "Finance & Cost", icon: "Wallet", permission: "dashboard:view" },
  { group: "Dashboard", href: "/kesehatan-data", label: "Kelengkapan Data", icon: "Activity", permission: "dashboard:view" },
  { group: "Data", href: "/unggah-data", label: "Unggah Data", icon: "Upload", permission: "upload:create" },
  // SCRUM-148: Data Operasional checks and publishes its own files; Admin only watches them in Validasi Data.
  { group: "Data", href: "/mapping-validasi", label: "Validasi Data", icon: "History", permission: "upload:view" },
  { group: "Data", href: "/referensi-data", label: "Data Reference", icon: "BookOpen", permission: "reference:view" },
  // File yang perlu diperbaiki (Data Operasional) dan undangan kedaluwarsa (Admin).
  { group: "Data", href: "/inbox", label: "Inbox", icon: "Inbox", permission: "dashboard:view" },
  // Administrasi akun; hanya muncul bagi peran yang diberi izinnya.
  { group: "Tools", href: "/anggota", label: "Anggota", icon: "Users", permission: "users:read" },
  // Phase 1 hanya membaca upload/export; API dua arah di luar lingkup (OS1, OD-08).
  { group: "Tools", href: "/integrasi", label: "Integrasi", icon: "Plug", permission: "dashboard:view" },
] as const satisfies readonly { group: string; href: string; label: string; icon: string; permission: Permission; alsoRole?: Role }[];

export type NavHref = (typeof NAV)[number]["href"];

/** Single rule for sidebar and requirePage(): the permission, or the page's extra role. */
export function canOpen(n: { permission: Permission; alsoRole?: Role }, me: { permissions: readonly string[]; role: string }): boolean {
  return me.permissions.includes(n.permission) || n.alsoRole === me.role;
}
