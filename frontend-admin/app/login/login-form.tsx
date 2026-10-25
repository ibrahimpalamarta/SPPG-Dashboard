"use client";

import { useActionState } from "react";
import { login, verifyMfa, type LoginState } from "./actions";
import { Field, FormMessage, field, primaryButton } from "@/components/ui/form";

const initial: LoginState = { step: "password" };

export function LoginForm({ returnTo, notice }: { returnTo?: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(async (prev, form) => (prev.step === "mfa" ? verifyMfa(prev, form) : login(prev, form)), initial);

  return (
    <form action={action} className="space-y-4">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {state.step === "password" ? (
        <>
          <Field label="Email">
            <input type="email" name="email" autoComplete="username" required autoFocus className={field} />
          </Field>
          <Field label="Password">
            <input type="password" name="password" autoComplete="current-password" required className={field} />
          </Field>
        </>
      ) : (
        <Field label="Kode verifikasi">
          <input name="code" autoComplete="one-time-code" inputMode="text" required autoFocus placeholder="6 digit, atau kode pemulihan" className={field} />
        </Field>
      )}
      {!state.message && notice && <FormMessage tone="ok">{notice}</FormMessage>}
      <FormMessage>{state.message}</FormMessage>
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Memproses…" : state.step === "mfa" ? "Verifikasi" : "Masuk"}
      </button>
    </form>
  );
}
