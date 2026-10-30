"use client";

import { Eye, Lock, Plus, Send, Users, X } from "lucide-react";
import { createContext, use, useActionState, useEffect, useState, type ReactNode } from "react";
import { createUser, saveUser, type UserActionState } from "./actions";
import { Field, FormMessage, field, primaryButton, secondaryButton } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import type { Kitchen } from "@/lib/me";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

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

function Result({ state }: { state: UserActionState }) {
  return (
    <div className="space-y-1">
      <FormMessage tone={state.ok ? "ok" : "error"}>{state.message}</FormMessage>
    </div>
  );
}

const ROLE_OPTIONS: { role: Role; description: string }[] = [
  { role: "DATA_ADMIN", description: "Satu dapur: unggah file, cek validasi, dan Setujui & Publish sendiri." },
  { role: "ADMIN", description: "Semua dapur: mengelola anggota, hak akses, Data Reference, dan melihat Upload History." },
];

/** Mirrors backend KITCHEN_SCOPED_ROLES: Data Operasional is tied to exactly one dapur. */
const KITCHEN_SCOPED: readonly Role[] = ["DATA_ADMIN"];

const RoleCard = ({ option, checked, onSelect }: { option: (typeof ROLE_OPTIONS)[number]; checked: boolean; onSelect: () => void }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 has-checked:border-emerald-600 has-checked:bg-emerald-50">
    <input type="radio" name="role" value={option.role} checked={checked} onChange={onSelect} required className="mt-1 accent-emerald-700" />
    <span>
      <span className="block font-semibold text-slate-800">{ROLE_LABELS[option.role]}</span>
      <span className="block text-slate-500">{option.description}</span>
    </span>
  </label>
);

/** One dapur, required (SCRUM-144). */
function KitchenSelect({ kitchens, defaultId }: { kitchens: Kitchen[]; defaultId?: string }) {
  return (
    <label className="block space-y-1">
      <span className="block font-medium text-slate-700">Dapur</span>
      <select name="kitchenIds" required defaultValue={defaultId ?? ""} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800">
        <option value="" disabled>
          Pilih dapur
        </option>
        {kitchens.map((k) => (
          <option key={k.id} value={k.id}>
            {kitchenLabel(k)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Role cards plus, for Data Operasional, the one dapur it works in. */
function RoleFields({ kitchens, defaultRole, defaultKitchenId }: { kitchens: Kitchen[]; defaultRole: Role; defaultKitchenId?: string }) {
  const [role, setRole] = useState<Role>(defaultRole);
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium text-slate-700">Role</legend>
        {ROLE_OPTIONS.map((o) => (
          <RoleCard key={o.role} option={o} checked={role === o.role} onSelect={() => setRole(o.role)} />
        ))}
      </fieldset>
      {KITCHEN_SCOPED.includes(role) && <KitchenSelect kitchens={kitchens} defaultId={defaultKitchenId} />}
    </>
  );
}

export function CreateUserForm({ kitchens }: { kitchens: Kitchen[] }) {
  const [open, setOpen] = useState(false);
  // Remounting on every open resets useActionState so a past invite's success screen doesn't reappear.
  const [instance, setInstance] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInstance((n) => n + 1);
          setOpen(true);
        }}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800"
      >
        <Plus className="size-4" aria-hidden="true" />
        Undang anggota
      </button>
      <InviteModal key={instance} open={open} onClose={() => setOpen(false)} kitchens={kitchens} />
    </>
  );
}

function InviteSent({ state, onClose }: { state: UserActionState; onClose: () => void }) {
  const until = state.expiresAt ? new Date(state.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
  return (
    <dialog
      ref={(d) => {
        if (d && !d.open) d.showModal();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-800 shadow-xl backdrop:bg-slate-900/50"
    >
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600" aria-hidden="true">
        <Send className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">Undangan terkirim</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {state.emailed ? (
          <>
            Email undangan dikirim ke <strong className="text-slate-800">{state.email}</strong> sebagai <strong className="text-slate-800">{ROLE_LABELS[state.role as keyof typeof ROLE_LABELS]}</strong>.
          </>
        ) : (
          <>
            Email ke <strong className="text-slate-800">{state.email}</strong> belum terkirim. Coba lagi lewat tombol Kirim ulang di daftar anggota.
          </>
        )}{" "}
        Link berlaku sampai {until}.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href={`${process.env.NEXT_PUBLIC_BASE_PATH}/aktivasi/${state.token}`} target="_blank" rel="noreferrer" className={`${secondaryButton} inline-flex h-10 items-center gap-2 px-4`}>
          <Eye className="size-4" aria-hidden="true" />
          Pratinjau halaman aktivasi
        </a>
        <button type="button" onClick={onClose} className={primaryButton}>
          Selesai
        </button>
      </div>
    </dialog>
  );
}

function InviteModal({ open, onClose, kitchens }: { open: boolean; onClose: () => void; kitchens: Kitchen[] }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(createUser, {});
  if (!open) return null;
  if (state.ok) return <InviteSent state={state} onClose={onClose} />;
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Users className="size-5" />}
      title="Undang anggota"
      subtitle="Penerima mendapat email untuk membuat kata sandi. Role ditetapkan di sini."
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>
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
        <RoleFields kitchens={kitchens} defaultRole="DATA_ADMIN" />
        <Field label="Pesan (opsional)">
          <textarea name="message" maxLength={500} rows={3} placeholder="Contoh: Untuk membantu upload Cashflow Lawang mulai 23 Nov" className={`${field} h-auto py-2`} />
        </Field>
        <Result state={state} />
      </form>
    </Modal>
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
          <RoleFields kitchens={kitchens} defaultRole={user.role} defaultKitchenId={user.kitchenScopes[0]?.kitchen.id} />
          <Result state={state} />
        </form>
        <p className="text-slate-500">Perubahan berlaku pada login berikutnya dan tercatat di audit log.</p>
      </Modal>
    </>
  );
}

type Confirm = { title: string; subtitle: string; body: string; label: string };

/** A one-click admin action. Optional confirm dialog first; the result shows as a toast at the bottom (kept open while it carries a link). */
const ToastContext = createContext<(state: UserActionState) => void>(() => {});

/** Holds the toast above the rows: a finished action re-renders its row into other buttons, which would take a local toast with it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<UserActionState>();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext value={setToast}>
      {children}
      {toast?.message && (
        <div role={toast.ok ? "status" : "alert"} className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl bg-slate-800 p-3 text-sm text-white shadow-lg">
          <Send className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">{toast.message}</p>
          <button type="button" onClick={() => setToast(undefined)} aria-label="Tutup" className="shrink-0 opacity-70 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </ToastContext>
  );
}

export function ActionButton({ action, label, confirm }: { action: () => Promise<UserActionState>; label: string; confirm?: Confirm }) {
  const showToast = use(ToastContext);
  const [asking, setAsking] = useState(false);
  const [, run, pending] = useActionState<UserActionState>(async () => {
    // Closing on the confirm button's own click would detach it before the form submits, so close from the action.
    setAsking(false);
    const result = await action();
    showToast(result);
    return result;
  }, {});

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
              <button type="submit" className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100">
                {confirm.label}
              </button>
            </>
          }
        >
          <p>{confirm.body}</p>
        </Modal>
      )}
    </form>
  );
}
