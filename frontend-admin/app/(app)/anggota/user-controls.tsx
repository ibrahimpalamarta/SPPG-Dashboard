"use client";

import { Lock, Plus, Send, Users, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createUser, saveUser, type UserActionState } from "./actions";
import { Field, FormMessage, field, primaryButton, secondaryButton } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
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

const ROLE_OPTIONS = [
  { role: "DATA_ADMIN", description: "Akses semua Overview dan seluruh fitur: unggah data, mapping & validasi, finance, kesehatan data, manual entry." },
  { role: "SUPER_ADMIN", description: "Mereview data dan pekerjaan yang diinput Data Operasional, lalu menyetujui (publish) atau mengembalikannya." },
] as const;

const RoleCard = ({ option, defaultChecked }: { option: (typeof ROLE_OPTIONS)[number]; defaultChecked: boolean }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50">
    <input type="radio" name="role" value={option.role} defaultChecked={defaultChecked} required className="mt-1 accent-emerald-700" />
    <span>
      <span className="block font-semibold text-slate-800">{ROLE_LABELS[option.role]}</span>
      <span className="block text-slate-500">{option.description}</span>
    </span>
  </label>
);

export function CreateUserForm({ kitchens }: { kitchens: Kitchen[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UserActionState, FormData>(async (prev, form) => {
    const next = await createUser(prev, form);
    // With a link to hand over the dialog stays open so it can be copied.
    if (next.ok && !next.resetPath) setOpen(false);
    return next;
  }, {});
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
        <Plus className="size-4" aria-hidden="true" />
        Undang anggota
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<Users className="size-5" />}
        title="Undang anggota"
        subtitle="Penerima mendapat email untuk membuat kata sandi. Role ditetapkan di sini."
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
              Batal
            </button>
            <button type="submit" form="invite-form" disabled={pending} className={`${primaryButton} inline-flex items-center gap-2`}>
              <Send className="size-4" aria-hidden="true" />
              Kirim undangan
            </button>
          </>
        }
      >
        <form id="invite-form" action={action} className="space-y-4">
          <Field label="Nama lengkap">
            <input name="fullName" required autoFocus className={field} />
          </Field>
          <Field label="Email kerja">
            <input type="email" name="email" required placeholder="nama@instansi.go.id" className={field} />
          </Field>
          <fieldset className="space-y-2">
            <legend className="mb-1 font-medium text-slate-700">Role</legend>
            {ROLE_OPTIONS.map((o) => (
              <RoleCard key={o.role} option={o} defaultChecked={o.role === "DATA_ADMIN"} />
            ))}
          </fieldset>
          <Field label="Dapur (wajib untuk Data Operasional)">
            <select name="kitchenIds" defaultValue="" className={field}>
              <option value="">Semua dapur</option>
              {kitchens.map((k) => (
                <option key={k.id} value={k.id}>
                  {kitchenLabel(k)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pesan (opsional)">
            <textarea name="message" maxLength={500} rows={3} placeholder="Contoh: Untuk membantu upload Cashflow Lawang mulai 23 Nov" className={`${field} h-auto py-2`} />
          </Field>
          <Result state={state} />
        </form>
      </Modal>
    </>
  );
}

export function RoleForm({ user, kitchens }: { user: UserRow; kitchens: Kitchen[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UserActionState, FormData>(async (prev, form) => {
    const next = await saveUser(user.id, prev, form);
    if (next.ok) setOpen(false);
    return next;
  }, {});
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${secondaryButton} h-7 px-2 text-xs`}>
        Ubah role
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<Users className="size-5" />}
        title={`Ubah role · ${user.fullName ?? user.email}`}
        subtitle={user.email ?? ""}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
              Batal
            </button>
            <button type="submit" form={`role-${user.id}`} disabled={pending} className={primaryButton}>
              Simpan role
            </button>
          </>
        }
      >
        <form id={`role-${user.id}`} action={action} className="space-y-3">
          {ROLE_OPTIONS.map((o) => (
            <RoleCard key={o.role} option={o} defaultChecked={user.role === o.role} />
          ))}
          <KitchenChecks kitchens={kitchens} selected={user.kitchenScopes.map((s) => s.kitchen.id)} />
          <Result state={state} />
        </form>
        <p className="text-slate-500">Perubahan berlaku pada login berikutnya dan tercatat di audit log.</p>
      </Modal>
    </>
  );
}

type Confirm = { title: string; subtitle: string; body: string; label: string };

/** A one-click admin action. Optional confirm dialog first; the result shows as a toast at the bottom (kept open while it carries a link). */
export function ActionButton({ action, label, confirm }: { action: () => Promise<UserActionState>; label: string; confirm?: Confirm }) {
  const [state, run, pending] = useActionState<UserActionState>(action, {});
  const [asking, setAsking] = useState(false);
  const [seen, setSeen] = useState<UserActionState>();
  const toast = state.message && seen !== state;

  useEffect(() => {
    if (!toast || state.resetPath) return;
    const t = setTimeout(() => setSeen(state), 5000);
    return () => clearTimeout(t);
  }, [toast, state]);

  return (
    <form action={run}>
      <button type={confirm ? "button" : "submit"} onClick={confirm ? () => setAsking(true) : undefined} disabled={pending} className={`${secondaryButton} h-7 px-2 text-xs`}>
        {label}
      </button>
      {confirm && (
        <Modal
          open={asking}
          onClose={() => setAsking(false)}
          icon={<Lock className="size-5" />}
          title={confirm.title}
          subtitle={confirm.subtitle}
          footer={
            <>
              <button type="button" onClick={() => setAsking(false)} className={secondaryButton}>
                Batal
              </button>
              <button type="submit" onClick={() => setAsking(false)} className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100">
                {confirm.label}
              </button>
            </>
          }
        >
          <p>{confirm.body}</p>
        </Modal>
      )}
      {toast && (
        <div role={state.ok ? "status" : "alert"} className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl bg-slate-800 p-3 text-sm text-white shadow-lg">
          <Send className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-2">
            <p>{state.message}</p>
            {state.resetPath && (
              <input readOnly value={`${window.location.origin}${state.resetPath}`} onFocus={(e) => e.currentTarget.select()} aria-label="Tautan atur password" className="h-8 w-full rounded-md bg-slate-700 px-2 font-mono text-xs" />
            )}
          </div>
          <button type="button" onClick={() => setSeen(state)} aria-label="Tutup" className="shrink-0 opacity-70 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </form>
  );
}
