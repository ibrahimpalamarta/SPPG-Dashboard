"use client";

import { Eye, Lock, Plus, Send, Users, X } from "lucide-react";
import { createContext, use, useActionState, useEffect, useState, type ReactNode } from "react";
import { useT } from "@/components/i18n-provider";
import { useLang } from "@/components/i18n-provider";
import { createUser, saveUser, type UserActionState } from "./actions";
import { Field, FormMessage, field, primaryButton, secondaryButton } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { MorphSelect } from "@/components/ui/morph-select";
import { dateLocale } from "@/lib/lang";
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

function RoleCard({ option, checked, onSelect }: { option: (typeof ROLE_OPTIONS)[number]; checked: boolean; onSelect: () => void }) {
  const t = useT();
  return (
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 has-checked:border-emerald-600 has-checked:bg-emerald-50">
    <input type="radio" name="role" value={option.role} checked={checked} onChange={onSelect} required className="mt-1 accent-emerald-700" />
    <span>
      <span className="block font-semibold text-slate-800">{t(ROLE_LABELS[option.role])}</span>
      <span className="block text-slate-500">{t(option.description)}</span>
    </span>
  </label>
  );
}

/** One dapur, required (SCRUM-144). */
function KitchenSelect({ kitchens, defaultId }: { kitchens: Kitchen[]; defaultId?: string }) {
  const t = useT();
  return (
    <div className="space-y-1">
      <span className="block font-medium text-slate-700">{t("Dapur")}</span>
      <MorphSelect
        name="kitchenIds"
        label={t("Dapur")}
        required
        defaultValue={defaultId}
        className="w-full"
        options={[{ value: "", label: t("Pilih dapur") }, ...kitchens.map((k) => ({ value: k.id, label: kitchenLabel(k) }))]}
      />
    </div>
  );
}

/** Role cards plus, for Data Operasional, the one dapur it works in. */
function RoleFields({ kitchens, defaultRole, defaultKitchenId }: { kitchens: Kitchen[]; defaultRole: Role; defaultKitchenId?: string }) {
  const t = useT();
  const [role, setRole] = useState<Role>(defaultRole);
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium text-slate-700">{t("Role")}</legend>
        {ROLE_OPTIONS.map((o) => (
          <RoleCard key={o.role} option={o} checked={role === o.role} onSelect={() => setRole(o.role)} />
        ))}
      </fieldset>
      {KITCHEN_SCOPED.includes(role) && <KitchenSelect kitchens={kitchens} defaultId={defaultKitchenId} />}
    </>
  );
}

export function CreateUserForm({ kitchens }: { kitchens: Kitchen[] }) {
  const t = useT();
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
        {t("Undang anggota")}
      </button>
      <InviteModal key={instance} open={open} onClose={() => setOpen(false)} kitchens={kitchens} />
    </>
  );
}

function InviteSent({ state, onClose }: { state: UserActionState; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const until = state.expiresAt ? new Date(state.expiresAt).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric" }) : "—";
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
      <h2 className="mt-5 text-xl font-semibold">{t("Undangan terkirim")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {state.emailed ? (
          <>
            {t("Email undangan dikirim ke")} <strong className="text-slate-800">{state.email}</strong> {t("sebagai")} <strong className="text-slate-800">{t(ROLE_LABELS[state.role as keyof typeof ROLE_LABELS])}</strong>.
          </>
        ) : (
          <>
            {t("Email ke")} <strong className="text-slate-800">{state.email}</strong> {t("belum terkirim. Coba lagi lewat tombol Kirim ulang di daftar anggota.")}
          </>
        )}{" "}
        {t("Link berlaku sampai {until}.", { until })}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href={`${process.env.NEXT_PUBLIC_BASE_PATH}/aktivasi/${state.token}`} target="_blank" rel="noreferrer" className={`${secondaryButton} inline-flex h-10 items-center gap-2 px-4`}>
          <Eye className="size-4" aria-hidden="true" />
          {t("Pratinjau halaman aktivasi")}
        </a>
        <button type="button" onClick={onClose} className={primaryButton}>
          {t("Selesai")}
        </button>
      </div>
    </dialog>
  );
}

function InviteModal({ open, onClose, kitchens }: { open: boolean; onClose: () => void; kitchens: Kitchen[] }) {
  const t = useT();
  const [state, action, pending] = useActionState<UserActionState, FormData>(createUser, {});
  if (!open) return null;
  if (state.ok) return <InviteSent state={state} onClose={onClose} />;
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Users className="size-5" />}
      title={t("Undang anggota")}
      subtitle={t("Penerima mendapat email untuk membuat kata sandi. Role ditetapkan di sini.")}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t("Batal")}
          </button>
          <button type="submit" form="invite-form" disabled={pending} className={`${primaryButton} inline-flex items-center gap-2`}>
            <Send className="size-4" aria-hidden="true" />
            {t("Kirim undangan")}
          </button>
        </>
      }
    >
      <form id="invite-form" action={action} className="space-y-4">
        <Field label={t("Nama lengkap")}>
          <input name="fullName" required autoFocus className={field} />
        </Field>
        <Field label={t("Email kerja")}>
          <input type="email" name="email" autoComplete="off" required placeholder="nama@instansi.go.id" className={field} />
        </Field>
        <RoleFields kitchens={kitchens} defaultRole="DATA_ADMIN" />
        <Field label={t("Pesan (opsional)")}>
          <textarea name="message" maxLength={500} rows={3} placeholder={t("Contoh: Untuk membantu upload Cashflow Lawang mulai 23 Nov")} className={`${field} h-auto py-2`} />
        </Field>
        <Result state={state} />
      </form>
    </Modal>
  );
}

export function RoleForm({ user, kitchens }: { user: UserRow; kitchens: Kitchen[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UserActionState, FormData>(async (prev, form) => {
    const next = await saveUser(user.id, prev, form);
    if (next.ok) setOpen(false);
    return next;
  }, {});
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${secondaryButton} h-7 px-2 text-xs`}>
        {t("Ubah role")}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<Users className="size-5" />}
        title={`${t("Ubah role")} · ${user.fullName ?? user.email}`}
        subtitle={user.email ?? ""}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
              {t("Batal")}
            </button>
            <button type="submit" form={`role-${user.id}`} disabled={pending} className={primaryButton}>
              {t("Simpan role")}
            </button>
          </>
        }
      >
        <form id={`role-${user.id}`} action={action} className="space-y-3">
          <RoleFields kitchens={kitchens} defaultRole={user.role} defaultKitchenId={user.kitchenScopes[0]?.kitchen.id} />
          <Result state={state} />
        </form>
        <p className="text-slate-500">{t("Perubahan berlaku pada login berikutnya dan tercatat di audit log.")}</p>
      </Modal>
    </>
  );
}

type Confirm = { title: string; subtitle: string; body: string; label: string };

/** A one-click admin action. Optional confirm dialog first; the result shows as a toast at the bottom (kept open while it carries a link). */
const ToastContext = createContext<(state: UserActionState) => void>(() => {});

/** Holds the toast above the rows: a finished action re-renders its row into other buttons, which would take a local toast with it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toast, setToast] = useState<UserActionState>();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={setToast}>
      {children}
      {toast?.message && (
        <div role={toast.ok ? "status" : "alert"} className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl bg-slate-800 p-3 text-sm text-white shadow-lg">
          <Send className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">{toast.message}</p>
          <button type="button" onClick={() => setToast(undefined)} aria-label={t("Tutup")} className="shrink-0 opacity-70 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </ToastContext>
  );
}

export function ActionButton({ action, label, confirm }: { action: () => Promise<UserActionState>; label: string; confirm?: Confirm }) {
  const t = useT();
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
                {t("Batal")}
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
