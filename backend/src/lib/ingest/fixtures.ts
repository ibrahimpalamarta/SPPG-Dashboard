import { readFileSync } from 'node:fs';
import type { UploadDomain } from '@prisma/client';
import { parseToStaging } from './pipeline.js';
import { InMemoryStagingRepository } from './staging.js';

/**
 * Anonymised slices of the Sukun baseline (Cashflow Transaksi_Kas, Master Data
 * Menu): same headers and the same dirty values as the real files, people and
 * suppliers renamed (B-FIXTURE-PII). The real files are never committed.
 */
export const fixture = (name: 'sukun-cashflow.csv' | 'sukun-menu.csv') =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

/** A file run through the real pipeline, as the upload controller would. */
export async function staged(file: Buffer, domain: UploadDomain, kitchenCode = 'SKN') {
  const out = await parseToStaging(
    file,
    {
      uploadBatchId: 'b-1',
      kitchenCode,
      domain,
      sourceSystem: 'INTERNAL',
      sourceFileName: `${domain}.csv`,
      fileHash: 'abcdef1234567890',
      loadedAt: new Date('2026-10-26T00:00:00Z'),
    },
    new InMemoryStagingRepository(),
  );
  if (!out.ok) throw new Error(out.errorSummary);
  return out;
}

/** The fixture's header line plus hand-written data lines, as a CSV file. */
export const withRows = (name: 'sukun-cashflow.csv' | 'sukun-menu.csv', lines: string[]) =>
  Buffer.from([fixture(name).toString('utf8').split(/\r?\n/)[0], ...lines].join('\n'));
