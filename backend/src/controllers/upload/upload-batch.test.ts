import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import type { Db } from '../../db.js';
import type { Role } from '../../auth/roles.js';
import type { AppUser } from '../../auth/user.js';
import { createUploadBatch, listUploadBatchHistory, listUploadBatchRecords, listUploadBatches, updateUploadBatch } from './upload-batch.js';
import { InMemoryStagingRepository } from '../../lib/ingest/staging.js';
import { fixture } from '../../lib/ingest/fixtures.js';

const userWith = (role: Role, kitchenId: bigint | null = null): AppUser =>
  ({ id: 1n, role, kitchenScopes: kitchenId === null ? [] : [{ kitchenId }] }) as AppUser;

/** One importable row, built in memory so the suite needs no fixture file. */
async function validWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Menu');
  sheet.addRow([
    'Tanggal',
    'Menu Type',
    'Porsi',
    'Menu',
    'Bahan',
    'Berat Bersih',
    'Berat Kotor',
    'BDD',
    'Energi',
    'Protein',
    'Lemak',
    'Karbohidrat',
    'Jumlah PM',
  ]);
  sheet.addRow([
    new Date('2026-08-03'),
    'Basah',
    'Kecil',
    'Ayam Goreng Lengkuas',
    'Ayam',
    75,
    100,
    75,
    180.5,
    16.2,
    11.4,
    0,
    240,
  ]);
  return Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
}

interface Captured {
  status?: number;
  body?: Record<string, unknown>;
  nexted: boolean;
}

async function run(handler: ReturnType<typeof createUploadBatch>, req: Partial<Request>) {
  const captured: Captured = { nexted: false };
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: unknown) {
      captured.body = payload as Record<string, unknown>;
      return this;
    },
  } as unknown as Response;

  await handler(req as Request, res, () => {
    captured.nexted = true;
  });
  return captured;
}

/** Records what the handler asked the database to do. */
function fakeDb(
  overrides: Partial<Record<string, unknown>> = {},
  kitchen: Partial<Record<string, unknown>> = {},
  openCritical = 0,
) {
  const calls: { findManyWhere?: unknown; created?: unknown; updates: unknown[]; audits: string[] } = { updates: [], audits: [] };
  let row: Record<string, unknown> = {};
  const db = {
    uploadBatch: {
      findMany: async (args: { where: unknown }) => {
        calls.findManyWhere = args.where;
        return [];
      },
      count: async () => 0,
      findUnique: async () => null,
      findFirst: async () => null,
      create: async (args: { data: Record<string, unknown> }) => {
        calls.created = args.data;
        row = { id: 9n, publicId: 'pub-1', status: 'PROCESSING', rowCount: 0, ...args.data };
        return row;
      },
      update: async (args: { data: Record<string, unknown> }) => {
        calls.updates.push(args.data);
        row = { ...row, ...args.data };
        return row;
      },
      ...overrides,
    },
    kitchen: { findUnique: async () => ({ id: 3n }), ...kitchen },
    validationIssue: { count: async () => openCritical, groupBy: async () => [] },
    referenceEntry: { findFirst: async () => null },
    auditLog: {
      create: async (args: { data: { action: string } }) => {
        calls.audits.push(args.data.action);
        return {};
      },
    },
  } as unknown as Db;

  return { db, calls };
}

describe('listUploadBatches (SCRUM-7)', () => {
  test('a DATA_ADMIN only ever queries its own dapur', async () => {
    const { db, calls } = fakeDb();
    const out = await run(listUploadBatches(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { query: { page: 1, pageSize: 25 } },
    });

    assert.equal(out.status, 200);
    assert.deepEqual((calls.findManyWhere as { kitchenId?: unknown }).kitchenId, { in: [3n] });
  });

  test('a DATA_ADMIN cannot widen the filter to another dapur', async () => {
    const { db } = fakeDb();
    const out = await run(listUploadBatches(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { query: { page: 1, pageSize: 25, kitchenId: 4n } },
    });

    assert.equal(out.status, 403);
    assert.equal(out.body?.error, 'forbidden_kitchen');
  });

  test('a SUPER_ADMIN is not kitchen-filtered', async () => {
    const { db, calls } = fakeDb();
    await run(listUploadBatches(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { query: { page: 1, pageSize: 25 } },
    });

    assert.equal('kitchenId' in (calls.findManyWhere as object), false);
  });
});

describe('createUploadBatch (SCRUM-22/37)', () => {
  const body = { kitchenId: 3n, domain: 'MENU', sourceSystem: 'INTERNAL', period: '2026-08', notes: null };

  /** The file multer would have put on the request. */
  const withFile = async (buffer?: Buffer, dryRun = false) => {
    const bytes = buffer ?? (await validWorkbook());
    return {
      user: userWith('DATA_ADMIN', 3n),
      valid: { body, query: { dryRun } },
      file: { buffer: bytes, originalname: 'menu-agustus.xlsx', size: bytes.length } as Express.Multer.File,
    };
  };

  /** Records what would have been written to S3 without touching the network. */
  function fakePut(fail = false) {
    const puts: { key: string; bytes: number }[] = [];
    const put = async (key: string, bytes: Buffer) => {
      if (fail) throw new Error('s3 down');
      puts.push({ key, bytes: bytes.length });
      return key;
    };
    return { put, puts };
  }

  test('opens a PROCESSING batch with full metadata and never publishes it', async () => {
    const { db, calls } = fakeDb();
    const { put, puts } = fakePut();

    const out = await run(createUploadBatch(db, put, new InMemoryStagingRepository()), await withFile());

    assert.equal(out.status, 201);
    const created = calls.created as Record<string, unknown>;
    assert.equal(created.status, undefined, 'starts at the column default, PROCESSING');
    assert.equal(created.uploaderId, 1n);
    assert.equal(created.domain, 'MENU');
    assert.equal(created.period, '2026-08');
    assert.equal(created.fileName, 'menu-agustus.xlsx');
    assert.match(String(created.fileHash), /^[a-f0-9]{64}$/);
    assert.equal(typeof created.fileSize, 'number');
    // Staging only: nothing canonical rides along any more.
    assert.equal('menuPlans' in created, false);

    // Kitchen 3 has no code and so no profile (SCRUM-39): quarantined, never READY.
    const final = calls.updates.at(-1) as Record<string, unknown>;
    assert.equal(final.status, 'NEEDS_MAPPING_UPDATE');
    assert.equal(final.errorCode, 'PROFILE_NOT_DETECTED');

    // The key is the batch's public id, never the user's file name.
    assert.deepEqual(puts.map((p) => p.key), ['upload-batches/pub-1.xlsx']);
    assert.equal(final.storageKey, 'upload-batches/pub-1.xlsx');
    assert.equal(out.body?.warning, undefined);
  });

  test('a CSV export is stored as .csv and staged like a workbook (SCRUM-24)', async () => {
    const { db, calls } = fakeDb();
    const puts: { key: string; type: string }[] = [];
    const put = async (key: string, _b: Buffer, type: string) => (puts.push({ key, type }), key);
    const staging = new InMemoryStagingRepository();
    const bytes = fixture('sukun-menu.csv');
    const req = { ...(await withFile(bytes)), file: { buffer: bytes, originalname: 'MENU - 12.csv', size: bytes.length } as Express.Multer.File };

    const out = await run(createUploadBatch(db, put, staging), req);

    assert.equal(out.status, 201);
    assert.deepEqual(puts, [{ key: 'upload-batches/pub-1.csv', type: 'text/csv' }]);
    assert.equal((calls.updates.at(-1) as Record<string, unknown>).rowCount, 22);
    assert.equal((await staging.getBatch('pub-1'))?.rows.length, 22);
  });

  test('the same file again is a new batch plus a duplicate warning, not a 409', async () => {
    const { db, calls } = fakeDb({ findFirst: async () => ({ publicId: 'pub-old' }) });
    const { put } = fakePut();

    const out = await run(createUploadBatch(db, put, new InMemoryStagingRepository()), await withFile());

    assert.equal(out.status, 201);
    assert.ok(calls.created, 'a batch was still created');
    const warning = out.body?.warning as { code: string; duplicateOf: string; message: string };
    assert.equal(warning.code, 'DUPLICATE_FILE');
    assert.equal(warning.duplicateOf, 'pub-old');
    assert.match(warning.message, /File identik sudah pernah diupload \(batch pub-old\)/);
  });

  test('a storage failure leaves the batch FAILED, not stuck in PROCESSING', async () => {
    const { db, calls } = fakeDb();
    const { put } = fakePut(true);

    await assert.rejects(run(createUploadBatch(db, put, new InMemoryStagingRepository()), await withFile()), /s3 down/);
    const final = calls.updates.at(-1) as Record<string, unknown>;
    assert.equal(final.status, 'FAILED');
    assert.equal(final.errorCode, 'STORAGE_FAILED');
  });

  test('a non-zip file renamed to .xlsx is a FAILED batch that is never stored (SCRUM-24)', async () => {
    const { db, calls } = fakeDb();
    const { put, puts } = fakePut();

    const out = await run(createUploadBatch(db, put, new InMemoryStagingRepository()), await withFile(Buffer.from('not a workbook')));

    assert.equal(out.status, 201, 'the attempt still gets its batch id (FR-UP-03)');
    const final = calls.updates.at(-1) as Record<string, unknown>;
    assert.equal(final.status, 'FAILED');
    assert.equal(final.errorCode, 'NOT_XLSX');
    assert.equal(puts.length, 0);
  });

  test('a password-protected (OLE) file fails as ENCRYPTED_FILE', async () => {
    const { db, calls } = fakeDb();
    const { put } = fakePut();
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

    await run(createUploadBatch(db, put, new InMemoryStagingRepository()), await withFile(ole));

    assert.equal((calls.updates.at(-1) as Record<string, unknown>).errorCode, 'ENCRYPTED_FILE');
  });

  test('a valid workbook is staged under the batch and its row count recorded (SCRUM-24)', async () => {
    const { db, calls } = fakeDb();
    const { put } = fakePut();
    const staging = new InMemoryStagingRepository();

    const out = await run(createUploadBatch(db, put, staging), await withFile());

    const final = calls.updates.at(-1) as Record<string, unknown>;
    assert.equal(final.rowCount, 1);
    const staged = await staging.getBatch('pub-1');
    assert.equal(staged?.rows.length, 1);
    assert.equal(staged?.rows[0].uploadBatchId, 'pub-1');
    assert.equal((out.body?.sheets as { name: string }[])[0].name, 'Menu');
  });

  test('a corrupt zip is FAILED with no staged rows left behind', async () => {
    const { db, calls } = fakeDb();
    const { put } = fakePut();
    const staging = new InMemoryStagingRepository();
    const corrupt = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64, 7)]);

    await run(createUploadBatch(db, put, staging), await withFile(corrupt));

    assert.equal((calls.updates.at(-1) as Record<string, unknown>).errorCode, 'CORRUPT_FILE');
    assert.equal(await staging.getBatch('pub-1'), undefined);
  });

  test('an unknown kitchen id is a 400, not a 500 from the FK', async () => {
    const { db, calls } = fakeDb({}, { findUnique: async () => null });
    const { put } = fakePut();

    const out = await run(createUploadBatch(db, put, new InMemoryStagingRepository()), {
      ...(await withFile()),
      user: userWith('SUPER_ADMIN'),
    });

    assert.equal(out.status, 400);
    assert.equal(calls.created, undefined);
  });

  test('dryRun reports columns and row count without writing anything', async () => {
    const { db, calls } = fakeDb();
    const { put, puts } = fakePut();

    const out = await run(createUploadBatch(db, put, new InMemoryStagingRepository()), await withFile(undefined, true));

    assert.equal(out.status, 200);
    assert.equal(out.body?.rowCount, 1);
    assert.ok(Object.values((out.body?.sheets as { headers: Record<string, string> }[])[0].headers).includes('Jumlah PM'));
    assert.equal(calls.created, undefined);
    assert.equal(puts.length, 0);
  });

  /** A Sukun CSV upload, so the SKN profiles apply. */
  const sukun = (bytes: Buffer, domain: string, extra: Record<string, unknown> = {}) => ({
    user: userWith('DATA_ADMIN', 3n),
    valid: { body: { ...body, domain, ...extra }, query: { dryRun: false } },
    file: { buffer: bytes, originalname: 'CASHFLOW_SUKUN - Transaksi_Kas.csv', size: bytes.length } as Express.Multer.File,
  });
  const skn = { findUnique: async () => ({ id: 3n, code: 'SKN' }) };

  test('a recognised Sukun file is NEEDS_REVIEW with its profile recorded and audited (SCRUM-39)', async () => {
    const { db, calls } = fakeDb({}, skn);
    const out = await run(createUploadBatch(db, fakePut().put, new InMemoryStagingRepository()), sukun(fixture('sukun-cashflow.csv'), 'CASHFLOW'));

    const final = calls.updates.at(-1) as Record<string, unknown>;
    assert.equal(final.status, 'NEEDS_REVIEW');
    assert.equal(final.mappingProfileId, 'MAP-SKN-CF-001');
    assert.equal(final.templateVersion, '1');
    assert.equal(final.errorCode, undefined);
    assert.deepEqual(calls.audits, ['upload_batch.created', 'upload_batch.profile_detected']);
    assert.equal((out.body?.mapping as { records: number }).records, 15);
    assert.deepEqual(out.body?.columnDiff, []);
    // Kept on the batch for the Validasi Data page (B-MAPOUT).
    const stored = final.mappingResult as { mapping: { issues: unknown[]; columns: { header: string; field: string | null }[] } };
    // 12 adapter issues + RECON_NO_SUMMARY + one UNMAPPED_CATEGORY per label (this fake has no Master Reference).
    assert.equal(stored.mapping.issues.length, 15);
    assert.deepEqual(stored.mapping.columns.find((c) => c.header === 'jumlah_baris'), { sheet: 'Transaksi_Kas', column: 'M', header: 'jumlah_baris', field: 'line_amount' });
  });

  test('a file missing a profile column is quarantined with the diff (SCRUM-94)', async () => {
    const csv = fixture('sukun-cashflow.csv').toString('utf8').replace('jumlah_baris', 'jml');
    const { db, calls } = fakeDb({}, skn);
    const out = await run(createUploadBatch(db, fakePut().put, new InMemoryStagingRepository()), sukun(Buffer.from(csv), 'CASHFLOW'));

    const final = calls.updates.at(-1) as Record<string, unknown>;
    assert.equal(final.status, 'NEEDS_MAPPING_UPDATE');
    assert.equal(final.errorCode, 'PROFILE_NOT_DETECTED');
    assert.match(String(final.errorSummary), /Kolom tidak ditemukan: jumlah_baris\./);
    assert.deepEqual(out.body?.columnDiff, [{ sheet: 'Transaksi_Kas', missing: ['jumlah_baris'], unexpected: ['jml'] }]);
    assert.equal(out.body?.mapping, null);
    assert.deepEqual((final.mappingResult as { columnDiff: unknown }).columnDiff, out.body?.columnDiff);
  });

  test('a re-upload closes the quarantined batch it replaces as SUPERSEDED (SCRUM-124)', async () => {
    const old = { id: 7n, publicId: '11111111-1111-4111-8111-111111111111', kitchenId: 3n, domain: 'CASHFLOW', status: 'NEEDS_MAPPING_UPDATE' };
    const { db, calls } = fakeDb({ findUnique: async () => old }, skn);
    await run(createUploadBatch(db, fakePut().put, new InMemoryStagingRepository()), sukun(fixture('sukun-cashflow.csv'), 'CASHFLOW', { replaces: old.publicId }));

    assert.deepEqual(calls.updates.at(-1), { status: 'SUPERSEDED', errorCode: 'REPLACED', errorSummary: 'Diganti oleh batch pub-1.' });
    assert.ok(calls.audits.includes('upload_batch.replaced'));
  });

  test('replaces must name an open batch of the same kitchen and domain', async () => {
    for (const old of [null, { id: 7n, kitchenId: 4n, domain: 'CASHFLOW', status: 'NEEDS_MAPPING_UPDATE' }, { id: 7n, kitchenId: 3n, domain: 'MENU', status: 'NEEDS_MAPPING_UPDATE' }, { id: 7n, kitchenId: 3n, domain: 'CASHFLOW', status: 'READY' }]) {
      const { db, calls } = fakeDb({ findUnique: async () => old }, skn);
      const out = await run(createUploadBatch(db, fakePut().put, new InMemoryStagingRepository()), sukun(fixture('sukun-cashflow.csv'), 'CASHFLOW', { replaces: '11111111-1111-4111-8111-111111111111' }));
      assert.equal(out.status, 400, JSON.stringify(old, (_k, v) => (typeof v === 'bigint' ? String(v) : v)));
      assert.equal(calls.created, undefined);
    }
  });

  test('a correction of a published batch leaves it published until the correction is (SCRUM-96)', async () => {
    const old = { id: 7n, publicId: '11111111-1111-4111-8111-111111111111', kitchenId: 3n, domain: 'CASHFLOW', status: 'PUBLISHED' };
    const { db, calls } = fakeDb({ findUnique: async () => old }, skn);
    const out = await run(createUploadBatch(db, fakePut().put, new InMemoryStagingRepository()), sukun(fixture('sukun-cashflow.csv'), 'CASHFLOW', { replaces: old.publicId }));
    assert.equal(out.status, 201);
    assert.equal((calls.created as { replacesBatchId: string }).replacesBatchId, old.publicId);
    assert.ok(!calls.updates.some((u) => (u as { status?: string }).status === 'SUPERSEDED'));
    assert.ok(!calls.audits.includes('upload_batch.replaced'));
  });

  test('a DATA_ADMIN cannot upload for another dapur', async () => {
    const { db, calls } = fakeDb();
    const { put } = fakePut();
    const req = await withFile();

    const out = await run(createUploadBatch(db, put, new InMemoryStagingRepository()), {
      ...req,
      valid: { body: { ...body, kitchenId: 4n }, query: { dryRun: false } },
    });

    assert.equal(out.status, 403);
    assert.equal(out.body?.error, 'forbidden_kitchen');
    assert.equal(calls.created, undefined);
  });
});

describe('Validasi Data records/history (B-MAPOUT)', () => {
  const handlers = [listUploadBatchRecords, listUploadBatchHistory];
  const req = (role: Role, kitchenId: bigint | null) => ({ user: userWith(role, kitchenId), valid: { params: { id: 9n }, query: { page: 1, pageSize: 25 } } });

  test('404 when the batch does not exist', async () => {
    for (const handler of handlers) {
      const { db } = fakeDb();
      assert.equal((await run(handler(db), req('SUPER_ADMIN', null))).status, 404);
    }
  });

  test('another dapur’s batch is refused', async () => {
    for (const handler of handlers) {
      const { db } = fakeDb({ findUnique: async () => ({ id: 9n, publicId: 'pub-1', kitchenId: 4n }) });
      assert.equal((await run(handler(db), req('DATA_ADMIN', 3n))).status, 403);
    }
  });

  test('records are the batch’s transactions, history its audit rows', async () => {
    const where: unknown[] = [];
    const capture = async (args: { where: unknown }) => {
      where.push(args.where);
      return [];
    };
    const db = {
      uploadBatch: { findUnique: async () => ({ id: 9n, publicId: 'pub-1', kitchenId: 3n }) },
      financeTransaction: { findMany: capture, count: async () => 0 },
      auditLog: { findMany: capture },
    } as unknown as Db;
    assert.equal((await run(listUploadBatchRecords(db), req('DATA_ADMIN', 3n))).status, 200);
    assert.equal((await run(listUploadBatchHistory(db), req('DATA_ADMIN', 3n))).status, 200);
    assert.deepEqual(where, [{ uploadBatchId: 'pub-1' }, { entity: 'upload_batches', entityId: 9n }]);
  });
});

describe('updateUploadBatch (SCRUM-22)', () => {
  test('404 when the batch does not exist', async () => {
    const { db } = fakeDb();
    const out = await run(updateUploadBatch(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { params: { id: 9n }, body: { status: 'READY' } },
    });

    assert.equal(out.status, 404);
  });

  test('cannot review another dapur’s batch', async () => {
    const { db } = fakeDb({ findUnique: async () => ({ id: 9n, kitchenId: 4n, status: 'NEEDS_REVIEW' }) });
    const out = await run(updateUploadBatch(db), {
      user: userWith('DATA_ADMIN', 3n),
      valid: { params: { id: 9n }, body: { status: 'READY' } },
    });

    assert.equal(out.status, 403);
  });

  test('an illegal transition is refused with 409 and nothing is written', async () => {
    const { db, calls } = fakeDb({
      findUnique: async () => ({ id: 9n, kitchenId: 3n, status: 'FAILED' }),
    });
    const out = await run(updateUploadBatch(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { params: { id: 9n }, body: { status: 'READY' } },
    });

    assert.equal(out.status, 409);
    assert.equal(out.body?.error, 'invalid_transition');
    assert.equal(calls.updates.length, 0);
  });

  test('records a legal review outcome', async () => {
    const { db, calls } = fakeDb({
      findUnique: async () => ({ id: 9n, kitchenId: 3n, status: 'NEEDS_REVIEW' }),
    });
    const out = await run(updateUploadBatch(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { params: { id: 9n }, body: { status: 'FAILED', notes: 'kolom BDD kosong' } },
    });

    assert.equal(out.status, 200);
    assert.deepEqual(calls.updates, [{ status: 'FAILED', notes: 'kolom BDD kosong' }]);
  });

  test('open CRITICAL issues keep the batch out of READY (SCRUM-51 quarantine)', async () => {
    const { db, calls } = fakeDb({ findUnique: async () => ({ id: 9n, publicId: 'pub-1', kitchenId: 3n, status: 'NEEDS_REVIEW' }) }, {}, 2);
    const out = await run(updateUploadBatch(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { params: { id: 9n }, body: { status: 'READY' } },
    });

    assert.equal(out.status, 409);
    assert.equal(out.body?.error, 'batch_blocked');
    assert.deepEqual(out.body?.details, { openCritical: 2 });
    assert.equal(calls.updates.length, 0);
  });

  test('READY once every CRITICAL issue is resolved', async () => {
    const { db, calls } = fakeDb({ findUnique: async () => ({ id: 9n, publicId: 'pub-1', kitchenId: 3n, status: 'NEEDS_REVIEW' }) });
    const out = await run(updateUploadBatch(db), {
      user: userWith('SUPER_ADMIN'),
      valid: { params: { id: 9n }, body: { status: 'READY' } },
    });

    assert.equal(out.status, 200);
    assert.deepEqual(calls.updates, [{ status: 'READY' }]);
  });
});
