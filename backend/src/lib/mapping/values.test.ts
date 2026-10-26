import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { RawCell } from '../ingest/workbook.js';
import { parseDate, parseNumber, titleCase } from './values.js';

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
