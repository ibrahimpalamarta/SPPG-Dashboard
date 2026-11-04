import { expect, type Page } from '@playwright/test';

// MorphSelect is a button[role=combobox] that grows into a listbox, not a native <select>: open it, click the option.
// A click before hydration is dropped silently (CI slowness left Jenis data on Cashflow), so retry until the choice shows.
export async function pilih(page: Page, name: string, label: string) {
  const combobox = page.getByRole('combobox', { name, exact: true });
  await expect(async () => {
    await combobox.click();
    // Scoped to this select's listbox: the mapping step renders one (closed, inert) listbox per column, all with the same options.
    await page.getByRole('listbox', { name, exact: true }).getByRole('option', { name: label, exact: true }).click({ timeout: 2000 });
    await expect(combobox).toHaveText(label, { timeout: 1000 });
  }).toPass();
}

// Unggah Data after the file is picked: Validasi Data → mapping → Simpan & Cek dengan AI → grid, where every row the AI flagged
// is checked one by one before Publish turns on. `beforeGrid` runs on the mapping step.
export async function validasiDanPublish(page: Page, beforeGrid?: () => Promise<void>) {
  await page.getByRole('button', { name: 'Validasi Data' }).click();
  await beforeGrid?.();
  await page.getByRole('button', { name: 'Simpan & Cek dengan AI' }).click();
  const publish = page.getByRole('button', { name: 'Publish', exact: true });
  const cek = page.getByRole('button', { name: 'Cek data' });
  if (await cek.isVisible()) {
    await cek.click();
    const sudah = page.getByRole('button', { name: 'Sudah dicek' });
    while (await sudah.isVisible()) await sudah.click();
  }
  await expect(publish).toBeEnabled();
  await publish.click();
}
