import type { T } from "@/lib/lang";
import type { Role } from "@/lib/roles";

/** Mirrors backend GET /api/inbox (controllers/inbox/inbox.ts). */
export type InboxBatch = {
  id: string;
  publicId: string;
  domain: string;
  fileName: string;
  uploadDate: string;
  kitchen: { id: string; code: string | null; name: string };
  errorSummary?: string | null;
  notes?: string | null;
};

export type InboxInvite = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role;
};

export type Inbox = {
  quarantinedFiles: InboxBatch[];
  expiredInvites: InboxInvite[];
};

/** The backend writes this sentence in Indonesian (upload-batch.ts notRecognised); the page words it in the reader's language. */
const NOT_RECOGNISED = /^Format file belum dikenali untuk kitchen\/source ini\. File belum dipublish\.(?: Kolom tidak ditemukan: (.+)\.)?$/;

export function inboxReason(t: T, errorSummary: string): string {
  const m = NOT_RECOGNISED.exec(errorSummary);
  if (!m) return errorSummary;
  return [t("Format file belum dikenali untuk dapur dan sumber ini. File belum dipublish."), m[1] && t("Kolom tidak ditemukan: {columns}.", { columns: m[1] })].filter(Boolean).join(" ");
}
