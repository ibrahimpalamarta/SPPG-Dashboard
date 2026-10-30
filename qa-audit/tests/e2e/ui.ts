import type { Page } from '@playwright/test';

// MorphSelect is a button[role=combobox] that grows into a listbox, not a native <select>: open it, click the option.
export async function pilih(page: Page, name: string, label: string) {
  await page.getByRole('combobox', { name, exact: true }).click();
  // Scoped to this select's listbox: Ubah Mapping renders one (closed, inert) listbox per column, all with the same options.
  await page.getByRole('listbox', { name, exact: true }).getByRole('option', { name: label, exact: true }).click();
}
