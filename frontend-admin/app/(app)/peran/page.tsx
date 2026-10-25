import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { ROLE_LABELS, type Permission, type Role } from "@/lib/roles";
import { RoleForm } from "./role-form";

export const metadata: Metadata = { title: "Peran & Izin · SPPG Internal" };

export default async function Page() {
  const me = await requirePage("/peran");
  const roles = await apiGet<{ role: Role; permissions: Permission[] }[]>("/admin/roles");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Peran & Izin</h1>
        <p className="mt-1 text-sm text-slate-500">Izin apa yang dipegang tiap peran. Perubahan berlaku tanpa deploy, dalam hitungan detik.</p>
      </div>
      {roles.map((r) => (
        // The backend refuses editing your own role or granting what you lack; the UI only avoids the obvious dead ends.
        <RoleForm key={r.role} role={r.role} label={ROLE_LABELS[r.role]} granted={r.permissions} editable={r.role !== "SUPER_ADMIN" && r.role !== me.role} />
      ))}
    </div>
  );
}
