"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "./actions";
import { Field, FormMessage, PasswordField, primaryButton } from "@/components/ui/form";

export function ResetForm({ token, submitLabel = "Simpan password" }: { token: string; submitLabel?: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword.bind(null, token), {});

  return (
    <form action={action} className="space-y-4">
      <Field label="Password baru">
        <PasswordField name="password" autoComplete="new-password" minLength={12} required autoFocus />
      </Field>
      <Field label="Ulangi password">
        <PasswordField name="confirm" autoComplete="new-password" minLength={12} required />
      </Field>
      <p className="text-xs text-slate-500">Minimal 12 karakter, memuat 3 dari: huruf kecil, huruf besar, angka, simbol.</p>
      <FormMessage>{state.message}</FormMessage>
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Menyimpan…" : submitLabel}
      </button>
    </form>
  );
}
