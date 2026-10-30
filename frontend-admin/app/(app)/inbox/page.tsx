import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardCheck, FileWarning, MailWarning, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import type { Inbox, InboxBatch } from "@/lib/inbox";
import { ROLE_LABELS } from "@/lib/roles";
import { DOMAINS } from "@/lib/upload";

export const metadata: Metadata = { title: "Inbox · SPPG Internal" };

const domainLabel = (value: string) => DOMAINS.find((d) => d.value === value)?.label ?? value;
const kitchenLabel = (b: InboxBatch) => `${b.kitchen.code ?? b.kitchen.name} · ${domainLabel(b.domain)}`;
const fmt = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Card className="divide-y divide-slate-100 overflow-hidden p-0">
      <h2 className="flex items-center gap-2 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
        <Icon className="size-4 text-emerald-600" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Row({ href, title, subtitle, time }: { href: string; title: string; subtitle: string; time?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-slate-50">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{title}</p>
        <p className="truncate text-slate-500">{subtitle}</p>
      </div>
      {time && <span className="shrink-0 text-xs text-slate-400">{fmt(time)}</span>}
    </Link>
  );
}

export default async function Page() {
  await requirePage("/inbox");
  const inbox = await apiGet<Inbox>("/inbox");

  if (inbox.reviewTasks.length === 0 && inbox.quarantinedFiles.length === 0 && inbox.expiredInvites.length === 0) {
    return (
      <EmptyState title="Belum ada tugas">
        <p>Batch yang menunggu review PM atau dikembalikan untuk diperbaiki akan muncul di sini.</p>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Inbox</h1>
        <p className="mt-2 text-slate-500">Tugas yang menunggu tindakan Anda.</p>
      </div>

      {inbox.reviewTasks.length > 0 && (
        <Section icon={ClipboardCheck} title="Menunggu Review PM">
          {inbox.reviewTasks.map((b) => (
            <Row key={b.publicId} href={`/mapping-validasi?batch=${b.publicId}`} title={b.fileName} subtitle={kitchenLabel(b)} time={b.uploadDate} />
          ))}
        </Section>
      )}

      {inbox.quarantinedFiles.length > 0 && (
        <Section icon={FileWarning} title="File ditahan atau dikembalikan">
          {inbox.quarantinedFiles.map((b) => (
            <Row
              key={b.publicId}
              href={`/mapping-validasi?batch=${b.publicId}`}
              title={b.fileName}
              subtitle={b.errorSummary ?? b.notes ?? kitchenLabel(b)}
              time={b.uploadDate}
            />
          ))}
        </Section>
      )}

      {inbox.expiredInvites.length > 0 && (
        <Section icon={MailWarning} title="Undangan kedaluwarsa">
          {inbox.expiredInvites.map((u) => (
            <Row key={u.id} href="/anggota?status=EXPIRED" title={u.fullName ?? u.email ?? "—"} subtitle={`${u.email ?? "—"} · ${ROLE_LABELS[u.role]}`} />
          ))}
        </Section>
      )}
    </div>
  );
}
