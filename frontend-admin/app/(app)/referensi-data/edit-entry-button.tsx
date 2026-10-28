"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, FormMessage, field, primaryButton, secondaryButton } from "@/components/ui/form";
import { saveReferenceEntry, type ReferenceEntryActionState } from "./actions";

type TextInput = { name: string; label: string; defaultValue: string; multiline?: boolean };

/** Shared Ubah button + modal for a Kamus/Aturan/Kode row — only the fields its tab owns are editable (see EDITABLE_FIELDS on the backend). */
export function EditEntryButton({ id, title, inputs, list }: { id: string; title: string; inputs: TextInput[]; list?: { name: string; label: string; defaultValue: string[] } }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReferenceEntryActionState, FormData>(async (prev, form) => {
    const next = await saveReferenceEntry(id, prev, form);
    if (next.ok) setOpen(false);
    return next;
  }, {});

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
        <Pencil className="size-3.5" aria-hidden="true" />
        Ubah
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<Pencil className="size-5" />}
        title={`Ubah: ${title}`}
        subtitle="Perubahan berlaku untuk semua pengguna."
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
              Batal
            </button>
            <button type="submit" form={`ref-entry-${id}`} disabled={pending} className={primaryButton}>
              Simpan
            </button>
          </>
        }
      >
        <form id={`ref-entry-${id}`} action={action} className="space-y-4">
          {inputs.map((f) => (
            <Field key={f.name} label={f.label}>
              {f.multiline ? (
                <textarea name={f.name} defaultValue={f.defaultValue} required rows={2} className={`${field} h-auto py-2`} />
              ) : (
                <input name={f.name} defaultValue={f.defaultValue} required className={field} />
              )}
            </Field>
          ))}
          {list && (
            <Field label={list.label}>
              <textarea name={list.name} defaultValue={list.defaultValue.join("\n")} required rows={4} className={`${field} h-auto py-2`} />
            </Field>
          )}
          <FormMessage tone={state.ok ? "ok" : "error"}>{state.message}</FormMessage>
        </form>
      </Modal>
    </>
  );
}
