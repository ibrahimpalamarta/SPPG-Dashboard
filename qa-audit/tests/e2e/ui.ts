import { expect, type Page } from '@playwright/test';

// MorphSelect is a button[role=combobox] that grows into a listbox, not a native <select>: open it, click the option.
// A click before hydration is dropped silently (CI slowness left Jenis data on Cashflow), so retry until the choice shows.
export async function pilih(page: Page, name: string, label: string) {
  const combobox = page.getByRole('combobox', { name, exact: true });
  await expect(async () => {
    await combobox.click();
    // Scoped to this select's listbox: Ubah Mapping renders one (closed, inert) listbox per column, all with the same options.
    await page.getByRole('listbox', { name, exact: true }).getByRole('option', { name: label, exact: true }).click({ timeout: 2000 });
    await expect(combobox).toHaveText(label, { timeout: 1000 });
  }).toPass();
}
