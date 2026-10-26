import type { Prisma } from '@prisma/client';
import type { Permission } from './roles.js';

/** Credential columns that must never leave the auth layer. */
export const withoutSecrets = { passwordHash: true, mfaSecretEnc: true } as const;

export const withKitchenScopes = {
  kitchenScopes: { select: { kitchenId: true } },
} satisfies Prisma.UserInclude;

/**
 * `req.user`: the user row (minus credentials), the dapur it may touch
 * (SCRUM-20) and the permissions its role holds right now.
 */
export type AppUser = Prisma.UserGetPayload<{
  include: typeof withKitchenScopes;
  omit: typeof withoutSecrets;
}> & { permissions: readonly Permission[] };
