"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "./actions";
import { Field, FormMessage, field, primaryButton } from "@/components/ui/form";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword.bind(null, token), {});

  return (
    <form action={action} className="space-y-4">
      <Field label="Password baru">
        <input type="password" name="password" autoComplete="new-password" minLength={12} required autoFocus className={field} />
      </Field>
      <Field label="Ulangi password">
        <input type="password" name="confirm" autoComplete="new-password" minLength={12} required className={field} />
      </Field>
      <p className="text-xs text-slate-500">Minimal 12 karakter, memuat 3 dari: huruf kecil, huruf besar, angka, simbol.</p>
      <FormMessage>{state.message}</FormMessage>
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Menyimpan…" : "Simpan password"}
      </button>
    </form>
  );
}
