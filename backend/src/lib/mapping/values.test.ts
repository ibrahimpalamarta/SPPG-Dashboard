import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { RawCell } from '../ingest/workbook.js';
import { normalizeUnit, parseDate, parseNumber, titleCase } from './values.js';

const s = (value: string): RawCell => ({ value, type: 'string' });

describe('parseNumber (SCRUM-27/73)', () => {
  test('money in both Indonesian and English notation, as the Sukun files mix them', () => {
    for (const [raw, n] of [
      ['Rp1.885.000', 1885000],
      ['Rp65.000', 65000],
      ['Rp3,500', 3500],
      ['Rp1,741,350', 1741350],
      ['220000', 220000],
      ['Rp800', 800],
      ['Rp0', 0],
    ] as const) {
      assert.equal(parseNumber(s(raw), true), n, raw);
    }
  });

  test('quantities: decimal comma, decimal dot, thousands with a decimal part', () => {
    for (const [raw, n] of [
      ['16,45', 16.45],
      ['31,25', 31.25],
      ['125.00', 125],
      ['1,212.00', 1212],
      ['10,675.00', 10675],
      ['1.5', 1.5],
    ] as const) {
      assert.equal(parseNumber(s(raw)), n, raw);
    }
  });

  test('empty, text and xlsx numbers', () => {
    assert.equal(parseNumber(undefined), null);
    assert.equal(parseNumber(s('  ')), null);
    assert.equal(parseNumber(s('dua')), null);
    assert.equal(parseNumber({ value: 7.25, type: 'number' }), 7.25);
  });
});

describe('parseDate / titleCase', () => {
  test('dd/mm/yyyy and xlsx date cells; impossible dates are null, not rolled over', () => {
    assert.equal(parseDate(s('22/02/2026')), '2026-02-22');
    assert.equal(parseDate(s('3/3/2026')), '2026-03-03');
    assert.equal(parseDate(s('31/02/2026')), null);
    assert.equal(parseDate(s('2026-02-22')), null);
    assert.equal(parseDate({ value: '2026-08-03T00:00:00.000Z', type: 'date', dateSerial: 46237 }), '2026-08-03');
  });

  test('segment spelling is folded', () => {
    assert.equal(titleCase('kecil'), 'Kecil');
    assert.equal(titleCase('BESAR'), 'Besar');
    assert.equal(titleCase(null), null);
  });
});

describe('DQ-002/003/010 normalisation', () => {
  test('accounting negatives in parentheses', () => {
    assert.equal(parseNumber(s('(Rp1.000)'), true), -1000);
  });

  test('dd-mm-yyyy and Excel serial dates; typo years are rejected', () => {
    assert.equal(parseDate(s('22-02-2026')), '2026-02-22');
    assert.equal(parseDate({ value: 46237, type: 'number' }), '2026-08-03');
    assert.equal(parseDate(s('03/09/0206')), null);
  });

  test('multi-word segment keeps each word capitalised', () => {
    assert.equal(titleCase('BUMIL & busui'), 'Bumil & Busui');
  });
});

describe('SCRUM-52 shared normalisation', () => {
  test('unit spellings fold to one code; unknown units are only lower-cased', () => {
    assert.deepEqual(['Kg', 'KG', 'Kilogram', 'gr', 'Ltr', 'Pax', 'porsi', 'Buah', 'ikat'].map(normalizeUnit), ['kg', 'kg', 'kg', 'g', 'l', 'pax', 'pax', 'pcs', 'ikat']);
    assert.equal(normalizeUnit(null), null);
  });

  test('impossible calendar dates are rejected, not rolled over', () => {
    assert.equal(parseDate(s('31/02/2026')), null);
    assert.equal(parseDate(s('29/02/2028')), '2028-02-29');
  });

  test('decimal comma and decimal dot read the same', () => {
    assert.equal(parseNumber(s('16,45')), 16.45);
    assert.equal(parseNumber(s('16.45')), 16.45);
  });
});
