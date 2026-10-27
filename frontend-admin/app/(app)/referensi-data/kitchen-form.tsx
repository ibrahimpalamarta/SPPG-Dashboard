"use client";

import { useActionState } from "react";
import { saveKitchen, type KitchenActionState } from "./actions";
import { Field, FormMessage, field, primaryButton } from "@/components/ui/form";

export function KitchenForm({ id, name, status }: { id: string; name: string; status: "ACTIVE" | "INACTIVE" }) {
  const [state, action, pending] = useActionState<KitchenActionState, FormData>(saveKitchen.bind(null, id), {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
      <Field label="Nama">
        <input name="name" defaultValue={name} required maxLength={120} className={field} />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={status} className={field}>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </Field>
      <button type="submit" disabled={pending} className={primaryButton}>
        Simpan
      </button>
      <div className="sm:col-span-3">
        <FormMessage tone={state.ok ? "ok" : "error"}>{state.message}</FormMessage>
      </div>
    </form>
  );
}
