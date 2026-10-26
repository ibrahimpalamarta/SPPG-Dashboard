"use client";

import { useActionState } from "react";
import { createUser, saveUser, type UserActionState } from "./actions";
import { Field, FormMessage, field, primaryButton, secondaryButton } from "@/components/ui/form";
import type { Kitchen } from "@/lib/me";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

export type UserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: (typeof ROLES)[number];
  status: "ACTIVE" | "INACTIVE";
  memberStatus: "ACTIVE" | "PENDING" | "EXPIRED" | "INACTIVE";
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  kitchenScopes: { kitchen: Kitchen }[];
};

const kitchenLabel = (k: Kitchen) => (k.code ? `${k.code} · ${k.name}` : k.name);

function KitchenChecks({ kitchens, selected }: { kitchens: Kitchen[]; selected: string[] }) {
  return (
    <fieldset className="space-y-1 text-sm">
      <legend className="font-medium text-slate-700">Dapur (wajib untuk Data Admin)</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {kitchens.map((k) => (
          <label key={k.id} className="flex items-center gap-2 text-slate-700">
            <input type="checkbox" name="kitchenIds" value={k.id} defaultChecked={selected.includes(k.id)} />
            {kitchenLabel(k)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Result({ state }: { state: UserActionState }) {
  return (
    <div className="space-y-1">
      <FormMessage tone={state.ok ? "ok" : "error"}>{state.message}</FormMessage>
      {state.resetPath && (
        <input readOnly value={`${window.location.origin}${state.resetPath}`} onFocus={(e) => e.currentTarget.select()} aria-label="Tautan atur password" className={`${field} font-mono text-xs`} />
      )}
    </div>
  );
}

const RoleSelect = ({ defaultValue }: { defaultValue?: string }) => (
  <select name="role" defaultValue={defaultValue} required className={field}>
    {ROLES.map((r) => (
      <option key={r} value={r}>
        {ROLE_LABELS[r]}
      </option>
    ))}
  </select>
);

export function CreateUserForm({ kitchens }: { kitchens: Kitchen[] }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(createUser, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Email">
          <input type="email" name="email" required className={field} />
        </Field>
        <Field label="Nama">
          <input name="fullName" required className={field} />
        </Field>
        <Field label="Peran">
          <RoleSelect defaultValue="INTERNAL" />
        </Field>
      </div>
      <KitchenChecks kitchens={kitchens} selected={[]} />
      <Result state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>
        Kirim undangan
      </button>
    </form>
  );
}

export function EditUserForm({ user, kitchens, self }: { user: UserRow; kitchens: Kitchen[]; self: boolean }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(saveUser.bind(null, user.id), {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nama">
          <input name="fullName" defaultValue={user.fullName ?? ""} className={field} />
        </Field>
        {/* Changing your own role or status is refused by the backend; hide the controls instead of offering a dead end. */}
        <Field label="Peran">
          <select name="role" defaultValue={user.role} disabled={self} className={field}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={user.status} disabled={self} className={field}>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </Field>
      </div>
      <KitchenChecks kitchens={kitchens} selected={user.kitchenScopes.map((s) => s.kitchen.id)} />
      <Result state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>
        Simpan
      </button>
    </form>
  );
}

/** A one-click admin action whose result (message, maybe a link) shows beneath it. */
export function ActionButton({ action, label, confirm }: { action: () => Promise<UserActionState>; label: string; confirm?: string }) {
  const [state, run, pending] = useActionState<UserActionState>(action, {});
  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="space-y-1"
    >
      <button type="submit" disabled={pending} className={secondaryButton}>
        {label}
      </button>
      <Result state={state} />
    </form>
  );
}
