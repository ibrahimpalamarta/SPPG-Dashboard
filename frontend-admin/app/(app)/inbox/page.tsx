import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { FileWarning, MailWarning, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { dateLocale, type T } from "@/lib/lang";
import { getLang, getT } from "@/lib/lang-server";
import type { Inbox, InboxBatch } from "@/lib/inbox";
import { ROLE_LABELS } from "@/lib/roles";
import { DOMAINS } from "@/lib/upload";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Inbox")} · SPPG Internal` };
}

const domainLabel = (t: T, value: string) => t(DOMAINS.find((d) => d.value === value)?.label ?? value);
const kitchenLabel = (t: T, b: InboxBatch) => `${b.kitchen.code ?? b.kitchen.name} · ${domainLabel(t, b.domain)}`;

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

async function Row({ href, title, subtitle, time }: { href: string; title: string; subtitle: string; time?: string }) {
  const lang = await getLang();
  const fmt = (iso: string) => new Date(iso).toLocaleString(dateLocale(lang), { dateStyle: "medium", timeStyle: "short" });
  return (
    <Link href={href} className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-slate-50">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{title}</p>
        <p className="truncate text-slate-500">{subtitle}</p>
      </div>
      {time && <span className="shrink-0 text-xs text-slate-600">{fmt(time)}</span>}
    </Link>
  );
}

export default async function Page() {
  const [, t] = await Promise.all([requirePage("/inbox"), getT()]);
  const inbox = await apiGet<Inbox>("/inbox");

  if (inbox.quarantinedFiles.length === 0 && inbox.expiredInvites.length === 0) {
    return (
      <EmptyState title={t("Belum ada tugas")}>
        <p>{t("File yang perlu diperbaiki atau undangan yang kedaluwarsa akan muncul di sini.")}</p>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{t("Inbox")}</h1>
        <p className="mt-2 text-slate-500">{t("Tugas yang menunggu tindakan Anda.")}</p>
      </div>

      {inbox.quarantinedFiles.length > 0 && (
        <Section icon={FileWarning} title={t("File perlu diperbaiki")}>
          {inbox.quarantinedFiles.map((b) => (
            <Row
              key={b.publicId}
              href={`/mapping-validasi?batch=${b.publicId}`}
              title={b.fileName}
              subtitle={b.errorSummary ?? b.notes ?? kitchenLabel(t, b)}
              time={b.uploadDate}
            />
          ))}
        </Section>
      )}

      {inbox.expiredInvites.length > 0 && (
        <Section icon={MailWarning} title={t("Undangan kedaluwarsa")}>
          {inbox.expiredInvites.map((u) => (
            <Row key={u.id} href="/anggota?status=EXPIRED" title={u.fullName ?? u.email ?? "—"} subtitle={`${u.email ?? "—"} · ${t(ROLE_LABELS[u.role])}`} />
          ))}
        </Section>
      )}
    </div>
  );
}
