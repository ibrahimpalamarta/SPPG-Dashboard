import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Inbox · SPPG Internal" };

export default async function Page() {
  await requirePage("/inbox");
  return (
    <EmptyState title="Belum ada tugas">
      <p>Batch yang menunggu review PM atau dikembalikan untuk diperbaiki akan muncul di sini.</p>
    </EmptyState>
  );
}
