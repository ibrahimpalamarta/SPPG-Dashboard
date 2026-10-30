import { expect, test, type Browser, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './evidence.js';
import { storageState, type RoleKey } from './roles.js';

// Alur sesudah unggah (skenario C-F dokumen pengujian manual): Kirim ke PM, review PM,
// Kembalikan, Publish, koreksi. Satu database dipakai bersama dan tiap langkah memakai hasil
// langkah sebelumnya, jadi semuanya serial. Nama berkas unik per run supaya baris daftar tidak
// bentrok dengan run lain atau unggah-data.spec.ts.
//
// K-06: SCRUM-95 menulis publish oleh Data Operasional tanpa review, SCRUM-117 menulis review PM
// dulu. Kode mengikuti SCRUM-117 (D-17), jadi spec ini juga begitu.
const cashflow = readFileSync('../backend/src/lib/ingest/fixtures/sukun-cashflow.csv');
const awal = Buffer.concat([cashflow, Buffer.from('\n\n')]);
const FILE = `review-publish-${Date.now()}.csv`;

async function sebagai<T>(browser: Browser, role: RoleKey, fn: (page: Page) => Promise<T>) {
  const ctx = await browser.newContext({ storageState: storageState(role) });
  try {
    return await fn(await ctx.newPage());
  } finally {
    await ctx.close();
  }
}

type Jenis = { domain: RegExp | null; profil: RegExp };
const CASHFLOW: Jenis = { domain: null, profil: /MAP-SKN-CF-001/ };
const MENU: Jenis = { domain: /^Master Menu/, profil: /MAP-SKN-MENU-001/ };

// `replaces`: UI hanya mengirim field ini saat mengulang batch NEEDS_MAPPING_UPDATE, jadi untuk
// koreksi batch Published (SCRUM-96) field disisipkan ke form; server action dan backend tetap asli.
async function unggah(page: Page, name: string, buffer: Buffer, jenis = CASHFLOW, replaces?: string) {
  await page.goto('unggah-data');
  await page.getByRole('combobox').selectOption(await page.getByRole('option', { name: /SKN/ }).getAttribute('value') ?? '');
  if (jenis.domain) await page.getByRole('button', { name: jenis.domain }).click();
  await page.getByRole('button', { name: 'Lanjut pilih file' }).click();
  await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'text/csv', buffer });
  if (replaces) {
    await page.locator('input[type=file]').evaluate((el, id) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'replaces';
      input.value = id;
      (el as HTMLInputElement).form?.append(input);
    }, replaces);
  }
  await page.getByRole('button', { name: 'Unggah', exact: true }).click();
  await expect(page.getByText(new RegExp(`Profil terdeteksi:\\s*${jenis.profil.source}`))).toBeVisible();
}

async function bukaBatch(page: Page, name: string) {
  await page.goto('mapping-validasi');
  await page.getByRole('link', { name: `Buka ${name}` }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

// Temuan "Wajib diperbaiki" menahan Kirim ke PM sampai ditandai sudah dicek.
async function tandaiTemuan(page: Page) {
  await page.getByRole('tab', { name: 'Yang perlu ditangani' }).click();
  const wajib = page.getByRole('button', { name: /Belum diperbaiki/ });
  for (let sisa = await wajib.count(); sisa > 0; sisa--) {
    await wajib.first().click();
    await page.getByLabel('Catatan').fill('Dicek QA, sesuai sumber');
    await page.getByRole('button', { name: 'Tandai sudah dicek' }).click();
    await expect(wajib).toHaveCount(sisa - 1);
  }
}

const batchId = (page: Page) => new URL(page.url()).searchParams.get('batch') ?? '';

// Data Steward mengunggah dan mengirim ke PM; PM mempublish. Mengembalikan id batch.
async function unggahKirimPublish(browser: Browser, name: string, buffer: Buffer, jenis = CASHFLOW, replaces?: string) {
  await sebagai(browser, 'data-steward', async (page) => {
    await unggah(page, name, buffer, jenis, replaces);
    await bukaBatch(page, name);
    await tandaiTemuan(page);
    await page.getByRole('button', { name: 'Kirim ke PM' }).click();
    await expect(page.getByText('Menunggu Review PM')).toBeVisible();
  });
  return sebagai(browser, 'pm', async (page) => {
    await bukaBatch(page, name);
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Published')).toBeVisible();
    return batchId(page);
  });
}

// Nilai kartu di Finance (mis. "Jumlah transaksi" -> "9"), dibaca dari teks halaman.
async function kartu(page: Page, label: string) {
  await page.goto('finance');
  const teks = (await page.getByRole('main').innerText()).split('\n').map((l) => l.trim()).filter(Boolean);
  return teks[teks.indexOf(label) + 1] ?? '';
}

// Rp format ringkas dashboard ("Rp122,4 jt") dari jumlah rupiah.
const juta = (n: number) => `Rp${(n / 1e6).toFixed(1).replace('.', ',')} jt`;

// Total belanja Supplier A yang TERKONFIRMASI di fixture (kolom jumlah_baris, tanpa baris PERLU_REVIEW).
function belanjaSupplierA() {
  const [head = '', ...rows] = cashflow.toString('utf8').trim().split(/\r?\n/);
  const col = head.split(',');
  return rows
    .map((r) => r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/))
    .filter((c) => c[col.indexOf('tipe')] === 'BELANJA' && c[col.indexOf('status_review')] === 'TERKONFIRMASI' && c[col.indexOf('nama_penerima')] === 'Supplier A')
    .reduce((jumlah, c) => jumlah + Number((c[col.indexOf('jumlah_baris')] ?? '').replace(/\D/g, '')), 0);
}

test.describe.serial('Review dan publish', () => {
  let batchAwal = '';
  let belanja = '';
  let transaksi = '';

  test('[SCRUM-117] Kirim ke PM ditolak selama temuan wajib belum dicek, lalu tampil di Inbox PM @smoke', async ({ browser }) => {
    await sebagai(browser, 'data-steward', async (page) => {
      await unggah(page, FILE, awal);
      await bukaBatch(page, FILE);
      await page.getByRole('button', { name: 'Kirim ke PM' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Wajib diperbaiki' })).toBeVisible();
      await expect(page.getByText('Needs Review')).toBeVisible();
      await shot(page, 'SCRUM-117', 1, 'kirim-ditolak-temuan-wajib');
      await tandaiTemuan(page);
      await page.getByRole('button', { name: 'Kirim ke PM' }).click();
      await expect(page.getByText('Menunggu Review PM')).toBeVisible();
      await shot(page, 'SCRUM-117', 2, 'menunggu-review-pm');
    });
    await sebagai(browser, 'pm', async (page) => {
      await page.goto('inbox');
      await expect(page.getByRole('link', { name: new RegExp(FILE.replace('.', '\\.')) })).toBeVisible();
      await shot(page, 'SCRUM-117', 3, 'inbox-pm');
    });
  });

  test('[SCRUM-117] PM mengembalikan batch: catatan wajib, status Dikembalikan, muncul di Inbox pengunggah @smoke', async ({ browser }) => {
    await sebagai(browser, 'pm', async (page) => {
      await bukaBatch(page, FILE);
      await page.getByRole('button', { name: 'Kembalikan' }).click();
      await page.getByRole('button', { name: 'Kirim pengembalian' }).click();
      // Kolom required: browser menahan submit kosong, batch tetap menunggu review.
      await expect(page.locator('textarea:invalid')).toHaveCount(1);
      await expect(page.getByText('Menunggu Review PM')).toBeVisible();
      await page.getByLabel('Alasan dikembalikan').fill('Periksa baris tanpa ID transaksi');
      await shot(page, 'SCRUM-117', 4, 'alasan-pengembalian');
      await page.getByRole('button', { name: 'Kirim pengembalian' }).click();
      await expect(page.getByText('Dikembalikan PM: Periksa baris tanpa ID transaksi')).toBeVisible();
      await shot(page, 'SCRUM-117', 5, 'dikembalikan');
    });
    await sebagai(browser, 'data-steward', async (page) => {
      await page.goto('inbox');
      await expect(page.getByText('File ditahan atau dikembalikan')).toBeVisible();
      await expect(page.getByRole('link', { name: new RegExp(FILE.replace('.', '\\.')) })).toBeVisible();
    });
  });

  test('[SCRUM-95][SCRUM-117] pengunggah tidak bisa publish batchnya sendiri @smoke', async ({ browser }) => {
    await sebagai(browser, 'data-steward', async (page) => {
      await bukaBatch(page, FILE);
      await page.getByRole('button', { name: 'Kirim ke PM' }).click();
      await expect(page.getByText('Menunggu Review PM')).toBeVisible();
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'tidak bisa dipublish oleh pengunggahnya sendiri' })).toBeVisible();
      await shot(page, 'SCRUM-95', 1, 'publish-sendiri-ditolak');
    });
  });

  test('[AC-PUB-01][SCRUM-95][SCRUM-78] PM publish, batch Published dan tidak bisa dipublish ulang @smoke', async ({ browser }) => {
    await sebagai(browser, 'pm', async (page) => {
      await bukaBatch(page, FILE);
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Published')).toBeVisible();
      batchAwal = batchId(page);
      await shot(page, 'SCRUM-95', 2, 'published');
      await page.reload();
      await expect(page.getByText('Published')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);
    });
  });

  test('[SCRUM-62][SCRUM-97][SCRUM-66][SCRUM-102][SCRUM-54] Finance hanya memuat baris TERKONFIRMASI dari batch Published @smoke @kpi', async ({ browser }) => {
    await sebagai(browser, 'pm', async (page) => {
      belanja = await kartu(page, 'Belanja ke supplier');
      transaksi = await kartu(page, 'Jumlah transaksi');
      const main = page.getByRole('main');
      // Top 5 Supplier: peringkat 1 = Supplier A, total dari fixture (SCRUM-62).
      await expect(main.getByText(juta(belanjaSupplierA())).first()).toBeVisible();
      // Baris PERLU_REVIEW ditahan, tidak dihitung (SCRUM-54): 4 transaksi di fixture.
      await expect(main.getByText('Ditahan (belum dikonfirmasi)')).toBeVisible();
      await expect(main.getByText('4transaksi')).toBeVisible();
      // Transfer EFI terakhir tampil dengan nomor referensi, bukan belanja supplier (SCRUM-66).
      await expect(main.getByText('23 Feb 2026 · TXN-I0001')).toBeVisible();
      await expect(main.getByText('Belum ada data saldo yang dipublish untuk dapur ini.')).toBeVisible();
      await shot(page, 'SCRUM-62', 1, 'finance-top-supplier');
      await shot(page.getByRole('main'), 'SCRUM-66', 1, 'transfer-efi-terakhir');
    });
  });

  // PRD dokumen pengujian D: gaji, petty cash, dan transfer internal bukan belanja supplier. Saat
  // ini "No Rekening Relawan" (PENGGAJIAN, Rp26,8 jt) masuk Top 5 Supplier dan Komposisi
  // Pengeluaran. Temuan aplikasi, dicatat di docs/roadmap.md; test ini menunggu perbaikannya.
  test.fixme('[SCRUM-62][SCRUM-63] baris PENGGAJIAN tidak masuk Top 5 Supplier @kpi', async ({ browser }) => {
    await sebagai(browser, 'pm', async (page) => {
      await page.goto('finance');
      await expect(page.getByRole('main').getByText('No Rekening Relawan')).toHaveCount(0);
    });
  });

  test('[SCRUM-103][SCRUM-65] Overview menampilkan "Belum ada data", bukan 0, untuk Penerima Manfaat dan Saldo @smoke @kpi', async ({ browser }) => {
    await sebagai(browser, 'pm', async (page) => {
      await page.goto('overview');
      const main = page.getByRole('main');
      await expect(main.getByText('Penerima Manfaat / hari')).toBeVisible();
      await expect(main.getByText('Belum ada data', { exact: true })).toHaveCount(2);
      await shot(page, 'SCRUM-103', 1, 'overview-belum-ada-data');
    });
  });

  test('[SCRUM-36][SCRUM-74][SCRUM-76] Master Menu dipublish, Top 5 Menu dan Informasi Gizi terisi @smoke @kpi', async ({ browser }) => {
    const menu = readFileSync('../backend/src/lib/ingest/fixtures/sukun-menu.csv');
    await unggahKirimPublish(browser, `menu-${FILE}`, Buffer.concat([menu, Buffer.from('\n\n')]), MENU);
    await sebagai(browser, 'pm', async (page) => {
      await page.goto('overview');
      const main = page.getByRole('main');
      await expect(main.getByText('Belum ada data menu yang dipublish.')).toHaveCount(0);
      await expect(main.getByText('Gizi rata-rata per porsi')).toBeVisible();
      // Porsi tersalurkan tidak ada di sumber Sukun: label, bukan 0.
      await expect(main.getByText(/Belum ada data porsi tersalurkan/)).toBeVisible();
      await shot(page, 'SCRUM-74', 1, 'top-5-menu-dan-gizi');
    });
  });

  test('[AC-PUB-02][SCRUM-78][SCRUM-96] unggah ulang isi sama dan dipublish tidak menggandakan angka Finance @smoke @kpi', async ({ browser }) => {
    const ulang = Buffer.concat([cashflow, Buffer.from('\n\n\n')]);
    await unggahKirimPublish(browser, `ulang-${FILE}`, ulang);
    await sebagai(browser, 'pm', async (page) => {
      expect(await kartu(page, 'Belanja ke supplier')).toBe(belanja);
      expect(await kartu(page, 'Jumlah transaksi')).toBe(transaksi);
      await shot(page, 'SCRUM-78', 1, 'finance-tidak-ganda');
    });
  });

  test('[AC-PUB-02][SCRUM-96][SCRUM-78] koreksi batch Published: batch lama Diganti, riwayat tetap ada, angka tetap @smoke @kpi', async ({ browser }) => {
    const koreksi = Buffer.concat([cashflow, Buffer.from('\n\n\n\n')]);
    const nama = `koreksi-${FILE}`;
    const baru = await unggahKirimPublish(browser, nama, koreksi, CASHFLOW, batchAwal);
    expect(baru).not.toBe(batchAwal);
    await sebagai(browser, 'pm', async (page) => {
      await page.goto(`mapping-validasi?batch=${batchAwal}`);
      await expect(page.getByRole('heading', { level: 1, name: FILE })).toBeVisible();
      await expect(page.getByText('Diganti').first()).toBeVisible();
      await page.getByRole('tab', { name: 'Riwayat' }).click();
      await expect(page.getByRole('list').filter({ hasText: 'File diunggah' })).toBeVisible();
      await shot(page, 'SCRUM-96', 1, 'batch-lama-diganti');
      await page.goto('mapping-validasi');
      await expect(page.getByRole('row', { name: new RegExp(`^${FILE.replace('.', '\\.')}`) }).getByText('Diganti')).toBeVisible();
      await expect(page.getByRole('row', { name: new RegExp(`^${nama.replace('.', '\\.')}`) }).getByText('Published')).toBeVisible();
      expect(await kartu(page, 'Belanja ke supplier')).toBe(belanja);
      expect(await kartu(page, 'Jumlah transaksi')).toBe(transaksi);
    });
  });

  for (const role of ['management', 'finance', 'kepala-kitchen-skn'] as const) {
    test(`[SCRUM-117][SCRUM-95] ${role} tidak punya tombol Kirim ke PM, Kembalikan, atau Publish @smoke @rbac`, async ({ browser }) => {
      await sebagai(browser, role, async (page) => {
        await page.goto(`mapping-validasi?batch=${batchAwal}`);
        await expect(page.getByRole('heading', { level: 1, name: FILE })).toBeVisible();
        for (const nama of ['Kirim ke PM', 'Kembalikan', 'Publish']) await expect(page.getByRole('button', { name: nama })).toHaveCount(0);
      });
    });
  }
});
