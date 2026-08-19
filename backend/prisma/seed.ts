/**
 * Runs every file in prisma/seeders/ that has not run against this database
 * yet, in filename order, and records each one in `seed_history` — the same
 * job Sequelize's seeder runner does with its `SequelizeData` table. Re-run
 * as often as you like: an already-applied seeder is skipped, not re-run.
 *
 *   npm run seed
 *
 * Needs only DATABASE_URL. Refuses to run against NODE_ENV=production without
 * --force, same guard as scripts/seed-superadmin.ts.
 *
 * Adding a seed later: drop a new file in prisma/seeders/, named
 * `<YYYYMMDDHHMMSS>-<slug>.ts` (sequelize-seeder style so filenames sort in
 * run order), default-exporting `(db: Prisma.TransactionClient) => Promise<void>`.
 * Never edit or rename a seeder that has already shipped — its filename is its
 * identity in `seed_history`, and renaming it makes the runner think it never ran.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Prisma } from '@prisma/client';
import { prisma } from '../src/db.js';

type Seeder = (db: Prisma.TransactionClient) => Promise<void>;

const force = process.argv.includes('--force');
const seedersDir = join(dirname(fileURLToPath(import.meta.url)), 'seeders');

async function loadSeeders(): Promise<{ name: string; run: Seeder }[]> {
  const files = readdirSync(seedersDir)
    .filter((f) => /\.ts$/.test(f))
    .sort();

  return Promise.all(
    files.map(async (file) => {
      const mod = (await import(`./seeders/${file}`)) as { default: Seeder };
      return { name: file.replace(/\.ts$/, ''), run: mod.default };
    }),
  );
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !force) {
    throw new Error('refusing to seed against NODE_ENV=production without --force');
  }

  const seeders = await loadSeeders();
  const applied = new Set(
    (await prisma.seedHistory.findMany({ select: { name: true } })).map((r) => r.name),
  );

  for (const { name, run } of seeders) {
    if (applied.has(name)) {
      console.log(`= ${name}: already applied, skipping`);
      continue;
    }

    const start = Date.now();
    // Seeder and its seed_history row land in one transaction: a seeder that
    // throws halfway leaves nothing behind to retry against, so running
    // `npm run seed` again re-attempts it cleanly from scratch.
    await prisma.$transaction(async (tx) => {
      await run(tx);
      await tx.seedHistory.create({ data: { name } });
    });
    console.log(`= ${name}: applied (${Date.now() - start}ms)`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
