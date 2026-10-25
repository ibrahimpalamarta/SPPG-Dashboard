import { readFileSync } from 'node:fs';

/**
 * Anonymised slices of the Sukun baseline (Cashflow Transaksi_Kas, Master Data
 * Menu): same headers and the same dirty values as the real files, people and
 * suppliers renamed (B-FIXTURE-PII). The real files are never committed.
 */
export const fixture = (name: 'sukun-cashflow.csv' | 'sukun-menu.csv') =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
