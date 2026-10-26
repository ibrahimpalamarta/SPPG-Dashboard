"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset, type ForgotState } from "./actions";
import { Field, FormMessage, field, primaryButton } from "@/components/ui/form";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, {});

  return (
    <form action={action} className="space-y-4">
      {state.sent ? (
        <FormMessage tone="ok">Jika email terdaftar, link reset kata sandi sudah dikirim. Periksa kotak masuk Anda.</FormMessage>
      ) : (
        <>
          <Field label="Email">
            <input type="email" name="email" autoComplete="username" required autoFocus placeholder="nama@sppg.internal" className={field} />
          </Field>
          <FormMessage>{state.message}</FormMessage>
          <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
            {pending ? "Mengirim…" : "Kirim link reset"}
          </button>
        </>
      )}
      <Link href="/login" className="block text-center text-sm font-medium text-emerald-800 hover:underline">
        Kembali ke halaman masuk
      </Link>
    </form>
  );
}
