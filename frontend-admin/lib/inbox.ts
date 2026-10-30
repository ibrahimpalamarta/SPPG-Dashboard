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
