import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const accounts = JSON.parse(readFileSync('.auth/accounts.json', 'utf8')) as Record<string, { email: string; password: string }>;
// Single-use links minted by scripts/seed-qa.ts, one per test below.
const tokens = JSON.parse(readFileSync('.auth/tokens.json', 'utf8')) as Record<'reset' | 'invite', { email: string; token: string }>;

// Meets the policy (12+ chars, 3 of 4 classes) and differs on every run.
const newPassword = () => `Qa9-${randomBytes(9).toString('base64url')}`;

test('[QA-AUTH] lupa kata sandi: jawaban sama untuk email terdaftar dan tidak dikenal @smoke', async ({ page }) => {
  for (const email of [accounts.finance!.email, 'tidak.dikenal@qa-audit.test']) {
    await page.goto('lupa-kata-sandi');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Kirim link reset' }).click();
    await expect(page.getByText('Jika email terdaftar, link reset kata sandi sudah dikirim.')).toBeVisible();
  }
  await page.getByRole('link', { name: 'Kembali ke halaman masuk' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('[QA-AUTH] reset password: link sekali pakai, lalu masuk dengan password baru @smoke', async ({ page }) => {
  const { email, token } = tokens.reset;
  const password = newPassword();
  await page.goto(`reset-password/${token}`);
  await page.getByLabel('Password baru').fill(password);
  await page.getByLabel('Ulangi password').fill(`${password}x`);
  await page.getByRole('button', { name: 'Simpan password' }).click();
  await expect(page.getByText('Konfirmasi password tidak sama.')).toBeVisible();

  // The failed submit clears the form, so both fields are filled again.
  await page.getByLabel('Password baru').fill(password);
  await page.getByLabel('Ulangi password').fill(password);
  await page.getByRole('button', { name: 'Simpan password' }).click();
  await expect(page).toHaveURL(/\/admin\/login\?reset=1$/);
  await expect(page.getByText('Password diperbarui. Silakan masuk.')).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Kata sandi' }).fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/overview$/);

  // The same link is void now.
  await page.context().clearCookies();
  await page.goto(`reset-password/${token}`);
  const again = newPassword();
  await page.getByLabel('Password baru').fill(again);
  await page.getByLabel('Ulangi password').fill(again);
  await page.getByRole('button', { name: 'Simpan password' }).click();
  await expect(page.getByText('Link tidak valid atau sudah kedaluwarsa.')).toBeVisible();
});

test('[SCRUM-122] aktivasi: email, nama, dan peran tampil, password pertama membuka Overview @smoke', async ({ page }) => {
  const { email, token } = tokens.invite;
  await page.goto(`aktivasi/${token}`);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText('QA Anggota Baru')).toBeVisible();
  await expect(page.getByText('PIC/Data Admin Kitchen')).toBeVisible();

  const password = newPassword();
  await page.getByLabel('Password baru').fill(password);
  await page.getByLabel('Ulangi password').fill(password);
  await page.getByRole('button', { name: 'Aktifkan & masuk' }).click();
  await expect(page).toHaveURL(/\/admin\/overview$/);

  // An accepted invitation cannot be opened again.
  await page.context().clearCookies();
  await page.goto(`aktivasi/${token}`);
  await expect(page.getByText('Tautan undangan kedaluwarsa atau dibatalkan.')).toBeVisible();
});

test('[SCRUM-122] aktivasi: link tidak dikenal ditolak @smoke', async ({ page }) => {
  await page.goto(`aktivasi/${randomBytes(16).toString('hex')}`);
  await expect(page.getByText('Tautan undangan kedaluwarsa atau dibatalkan.')).toBeVisible();
  await expect(page.getByLabel('Password baru')).toHaveCount(0);
});

test('[QA-AUTH] sesi berakhir: cookie dihapus lalu diarahkan ke login dengan pemberitahuan @smoke', async ({ page }) => {
  await page.goto('sesi-berakhir');
  await expect(page).toHaveURL(/\/admin\/login\?expired=1$/);
  await expect(page.getByText('Sesi Anda berakhir. Silakan masuk kembali.')).toBeVisible();
});
