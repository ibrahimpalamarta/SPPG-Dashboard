"use client";

import { useActionState } from "react";
import { saveRolePermissions, type RoleState } from "./actions";
import { FormMessage, primaryButton } from "@/components/ui/form";
import { PERMISSIONS, type Permission } from "@/lib/roles";

export function RoleForm({ role, label, granted, editable }: { role: string; label: string; granted: Permission[]; editable: boolean }) {
  const [state, action, pending] = useActionState<RoleState, FormData>(saveRolePermissions.bind(null, role), {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {PERMISSIONS.map((p) => (
          <label key={p} className="flex items-center gap-2 font-mono text-xs text-slate-700">
            <input type="checkbox" name="permissions" value={p} defaultChecked={granted.includes(p)} disabled={!editable} />
            {p}
          </label>
        ))}
      </div>
      {editable ? (
        <>
          <FormMessage tone={state.ok ? "ok" : "error"}>{state.message}</FormMessage>
          <button type="submit" disabled={pending} className={primaryButton}>
            Simpan
          </button>
        </>
      ) : (
        <p className="text-xs text-slate-500">Tetap: Project Manager MBG selalu memegang semua izin.</p>
      )}
    </form>
  );
}
