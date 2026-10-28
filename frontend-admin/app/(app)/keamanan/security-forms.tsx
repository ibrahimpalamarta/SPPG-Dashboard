"use client";

import { useActionState } from "react";
import { changePassword, disableMfa, enableMfa, startMfaSetup, type FormState, type MfaSetupState } from "./actions";
import { Field, FormMessage, PasswordField, field, primaryButton, secondaryButton } from "@/components/ui/form";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Password saat ini">
        <PasswordField name="currentPassword" autoComplete="current-password" required />
      </Field>
      <Field label="Password baru">
        <PasswordField name="newPassword" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field label="Ulangi password baru">
        <PasswordField name="confirm" autoComplete="new-password" minLength={12} required />
      </Field>
      <FormMessage tone={state.ok ? "ok" : "error"}>{state.message}</FormMessage>
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Menyimpan…" : "Ubah password"}
      </button>
    </form>
  );
}

/** Enrolment is two steps: get a secret, then prove the authenticator holds it. */
export function EnableMfa() {
  const [setup, start, starting] = useActionState<MfaSetupState>(startMfaSetup, {});
  const [result, enable, enabling] = useActionState<MfaSetupState, FormData>(enableMfa, setup);

  if (result.recoveryCodes) {
    return (
      <div className="space-y-2 text-sm">
        <FormMessage tone="ok">Verifikasi dua langkah aktif.</FormMessage>
        <p className="text-slate-600">Simpan kode pemulihan ini di tempat aman. Tiap kode hanya berlaku sekali dan tidak akan ditampilkan lagi.</p>
        <ul className="grid grid-cols-2 gap-1 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800">
          {result.recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }
  const secret = result.secret ?? setup.secret;
  if (!secret) {
    return (
      <form action={start} className="space-y-2">
        <FormMessage>{setup.message}</FormMessage>
        <button type="submit" disabled={starting} className={secondaryButton}>
          Aktifkan verifikasi dua langkah
        </button>
      </form>
    );
  }
  return (
    <form action={enable} className="space-y-3 text-sm">
      <p className="text-slate-600">Tambahkan akun ini ke aplikasi autentikator (Google Authenticator, Authy, 1Password, dll.) dengan kunci berikut, lalu masukkan kode 6 digit yang muncul.</p>
      <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800">{secret}</p>
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer">Pakai tautan otpauth</summary>
        <p className="mt-1 break-all font-mono">{result.otpauthUrl ?? setup.otpauthUrl}</p>
      </details>
      <Field label="Kode 6 digit">
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className={field} />
      </Field>
      <FormMessage>{result.message}</FormMessage>
      <button type="submit" disabled={enabling} className={primaryButton}>
        Konfirmasi
      </button>
    </form>
  );
}

export function DisableMfa() {
  const [state, action, pending] = useActionState<FormState, FormData>(disableMfa, {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-emerald-700">Verifikasi dua langkah aktif.</p>
      <Field label="Password">
        <PasswordField name="password" autoComplete="current-password" required />
      </Field>
      <Field label="Kode verifikasi atau kode pemulihan">
        <input name="code" autoComplete="one-time-code" required className={field} />
      </Field>
      <FormMessage>{state.message}</FormMessage>
      <button type="submit" disabled={pending} className={secondaryButton}>
        Nonaktifkan verifikasi dua langkah
      </button>
    </form>
  );
}
