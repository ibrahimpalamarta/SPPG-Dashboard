/** QA accounts seeded by scripts/seed-qa.ts; mapping to code roles is decision QD-03. */
export const ROLES = ['admin', 'data-operasional-skn'] as const;
export type RoleKey = (typeof ROLES)[number];

export const storageState = (role: RoleKey) => `.auth/${role}.json`;
