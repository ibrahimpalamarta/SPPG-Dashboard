import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { assertSafeTarget } from '../../scripts/guard.js';
import { PORTS } from '../../scripts/lib.js';
import { type RoleKey } from './roles.js';

// Isolasi kitchen dan PII langsung ke API backend (tanpa UI): frontend menyembunyikan menu, tetapi
// yang menjaga data adalah backend. Dua akun Data Operasional (SKN dan LWG) saling mencoba
// membuka data dapur lain.
const API = `http://127.0.0.1:${PORTS.backend}/api`;
assertSafeTarget(API);

const accounts = JSON.parse(readFileSync('.auth/accounts.json', 'utf8')) as Record<string, { email: string; password: string }>;
const cashflow = readFileSync('../backend/src/lib/ingest/fixtures/sukun-cashflow.csv');

const FORBIDDEN_KITCHEN = { error: 'forbidden_kitchen', message: 'Anda tidak memiliki akses ke kitchen ini.' };

async function masuk(request: APIRequestContext, role: RoleKey) {
  const account = accounts[role];
  if (!account) throw new Error(`no seeded account for ${role}`);
  const res = await request.post(`${API}/auth/login`, { data: { email: account.email, password: account.password } });
  expect(res.status()).toBe(200);
  const { token } = (await res.json()) as { token: string };
  return { Authorization: `Bearer ${token}` };
}

async function dapur(request: APIRequestContext, headers: Record<string, string>, code: string) {
  const res = await request.get(`${API}/kitchens?pageSize=100`, { headers });
  const { data } = (await res.json()) as { data: { id: string; code: string }[] };
  const found = data.find((k) => k.code === code);
  if (!found) throw new Error(`kitchen ${code} not seeded`);
  return found.id;
}

test.describe.serial('Isolasi kitchen dan PII (API)', () => {
  let sukun = '';
  let lawang = '';
  let batchSukun = '';

  test('[ERR-08][P1-001] Data Operasional LWG ditolak membuka data dapur SKN: daftar, detail, file, ubah, unggah @smoke @rbac', async ({ request }) => {
    const skn = await masuk(request, 'data-operasional-skn');
    const lwg = await masuk(request, 'data-operasional-lwg');
    sukun = await dapur(request, skn, 'SKN');
    lawang = await dapur(request, skn, 'LWG');

    // SKN membuat satu batch, lalu LWG mencoba setiap pintu masuk ke batch itu.
    const up = await request.post(`${API}/upload-batches`, {
      headers: skn,
      multipart: { kitchenId: sukun, domain: 'CASHFLOW', file: { name: `isolasi-${Date.now()}.csv`, mimeType: 'text/csv', buffer: cashflow } },
    });
    expect(up.status()).toBe(201);
    batchSukun = ((await up.json()) as { id: string }).id;

    for (const path of [`/upload-batches/${batchSukun}`, `/upload-batches/${batchSukun}/file`, `/upload-batches/${batchSukun}/records`, `/upload-batches?kitchenId=${sukun}`, `/kpi/completeness?kitchenId=${sukun}`]) {
      const res = await request.get(`${API}${path}`, { headers: lwg });
      expect(res.status(), path).toBe(403);
      expect(await res.json(), path).toEqual(FORBIDDEN_KITCHEN);
    }

    const publish = await request.post(`${API}/upload-batches/${batchSukun}/publish`, { headers: lwg });
    expect(publish.status()).toBe(403);
    const ubah = await request.patch(`${API}/upload-batches/${batchSukun}`, { headers: lwg, data: { notes: 'silang' } });
    expect(ubah.status()).toBe(403);
    const hapus = await request.delete(`${API}/upload-batches/${batchSukun}`, { headers: lwg });
    expect(hapus.status()).toBe(403);
    const unggah = await request.post(`${API}/upload-batches`, {
      headers: lwg,
      multipart: { kitchenId: sukun, domain: 'CASHFLOW', file: { name: 'silang.csv', mimeType: 'text/csv', buffer: cashflow } },
    });
    expect(unggah.status()).toBe(403);
  });

  test('[ERR-08][P1-001] daftar batch tanpa filter hanya memuat dapur sendiri @smoke @rbac', async ({ request }) => {
    const lwg = await masuk(request, 'data-operasional-lwg');
    const res = await request.get(`${API}/upload-batches?pageSize=100`, { headers: lwg });
    const { data } = (await res.json()) as { data: { id: string; kitchenId: string }[] };
    expect(data.map((b) => b.id)).not.toContain(batchSukun);
    for (const b of data) expect(b.kitchenId).toBe(lawang);

    // Admin melihat semua dapur, termasuk batch SKN tadi.
    const admin = await masuk(request, 'admin');
    expect((await request.get(`${API}/upload-batches/${batchSukun}`, { headers: admin })).status()).toBe(200);
  });

  test('[P1-001] tanpa token atau dengan token palsu ditolak 401 @smoke @rbac', async ({ request }) => {
    expect((await request.get(`${API}/upload-batches`)).status()).toBe(401);
    expect((await request.get(`${API}/upload-batches`, { headers: { Authorization: 'Bearer palsu' } })).status()).toBe(401);
  });

  test('[P1-001] Data Operasional tidak bisa memakai endpoint khusus Admin @smoke @rbac', async ({ request }) => {
    const skn = await masuk(request, 'data-operasional-skn');
    // users:read dimiliki Data Operasional (QD-38), jadi yang diuji adalah izin kelola.
    expect((await request.get(`${API}/admin/roles`, { headers: skn })).status()).toBe(403);
    const undang = await request.post(`${API}/admin/users`, { headers: skn, data: { email: 'x@qa-audit.test', fullName: 'X', role: 'ADMIN' } });
    expect(undang.status()).toBe(403);
  });

  test('[AC-PRIV-01] respons dashboard dan unggahan tidak memuat NIK, telepon, atau alamat orang @smoke @pii', async ({ request }) => {
    // Daftar kunci pribadi dan pola NIK (16 digit). Alamat dapur (kitchens) bukan data pribadi dan tidak diperiksa.
    const kunciPribadi = /^(nik|phone|no_?hp|telepon|telp|alamat|address|home_?address)$/i;
    const nik = /(?<!\d)\d{16}(?!\d)/;
    const temuan: string[] = [];
    const telusuri = (path: string, node: unknown, where: string): void => {
      if (typeof node === 'string' && nik.test(node)) temuan.push(`${where} ${path} = pola NIK`);
      else if (Array.isArray(node)) node.forEach((n, i) => telusuri(`${path}[${i}]`, n, where));
      else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          if (kunciPribadi.test(k)) temuan.push(`${where} ${path}.${k}`);
          telusuri(`${path}.${k}`, v, where);
        }
      }
    };

    for (const role of ['admin', 'data-operasional-skn'] as const) {
      const headers = await masuk(request, role);
      const paths = ['/dashboard/summary', '/kpi/finance', '/kpi/menu', '/kpi/completeness', '/upload-batches?pageSize=100', `/upload-batches/${batchSukun}`, `/upload-batches/${batchSukun}/records`];
      for (const path of paths) {
        const res = await request.get(`${API}${path}`, { headers });
        // 403 pada endpoint yang memang bukan untuk role itu bukan kebocoran; yang diperiksa isi respons sukses.
        if (res.ok()) telusuri('$', await res.json(), `${role} ${path}`);
      }
    }
    expect(temuan).toEqual([]);
  });
});
