import { apiFetch } from "@/lib/api";
import type { Inbox } from "@/lib/inbox";
import { ROLE_LABELS } from "@/lib/roles";

export type NotificationEntry = { title: string; subtitle: string; href: string };

const MAX = 5;

/** The header bell: the newest Inbox tasks. The full list stays on /inbox. */
export async function GET() {
  const res = await apiFetch("/inbox");
  if (!res.ok) return Response.json([]);
  const inbox: Inbox = await res.json();

  const entries: NotificationEntry[] = [
    ...inbox.quarantinedFiles.map((b) => ({
      title: b.fileName,
      subtitle: b.errorSummary ?? b.notes ?? `${b.kitchen.code ?? b.kitchen.name} perlu diperbaiki`,
      href: `/mapping-validasi?batch=${b.publicId}`,
    })),
    ...inbox.expiredInvites.map((u) => ({
      title: u.fullName ?? u.email ?? "—",
      subtitle: `Undangan kedaluwarsa · ${ROLE_LABELS[u.role]}`,
      href: "/anggota?status=EXPIRED",
    })),
  ];
  return Response.json(entries.slice(0, MAX));
}
