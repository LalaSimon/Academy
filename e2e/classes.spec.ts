import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Classes — list view', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/classes');
    const listBtn = page.getByRole('button', { name: 'Lista' });
    if (await listBtn.isVisible()) await listBtn.click();
  });

  test('shows classes page with add buttons', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Zajęcia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dodaj zajęcia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cyklicznie' })).toBeVisible();
  });

  test('creates a single class and shows it in the list', async ({ page }) => {
    await page.getByRole('button', { name: 'Dodaj zajęcia' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const title = `E2E Nowe Zajęcia ${Date.now()}`;
    await modal.getByLabel('Tytuł').fill(title);

    // Select group (Radix UI Select trigger has role="combobox")
    await modal.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /E2E Angielski/i }).click();

    // Set date (tomorrow at 11:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T11:00`;
    await modal.getByLabel('Data i godzina').fill(dateStr);

    await modal.getByRole('button', { name: 'Utwórz zajęcia' }).click();

    await expect(modal).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Classes — status transitions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/classes');
    const listBtn = page.getByRole('button', { name: 'Lista' });
    if (await listBtn.isVisible()) await listBtn.click();
  });

  test('can start a scheduled class', async ({ page }) => {
    // Seeded class 'E2E Scheduled Class' has status SCHEDULED
    const startBtn = page.getByRole('button', { name: 'Rozpocznij' }).first();
    await expect(startBtn).toBeVisible({ timeout: 5_000 });
    await startBtn.click();

    await expect(page.getByRole('button', { name: 'Zakończ' }).first()).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Attendance — marking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/classes');
    const listBtn = page.getByRole('button', { name: 'Lista' });
    if (await listBtn.isVisible()) await listBtn.click();
  });

  test('opens attendance modal and saves', async ({ page }) => {
    const attendanceBtn = page.getByRole('button', { name: 'Obecność' }).first();
    await expect(attendanceBtn).toBeVisible({ timeout: 5_000 });
    await attendanceBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 3_000 });
    await expect(modal.getByText('Lista obecności')).toBeVisible();

    // Save changes (Zapisz saves without closing, Zamknij closes)
    await modal.getByRole('button', { name: 'Zapisz' }).click();
    // Verify save succeeded — button returns to non-pending state
    await expect(modal.getByRole('button', { name: 'Zapisz' })).toBeEnabled({ timeout: 3_000 });

    // Close the modal
    await modal.getByRole('button', { name: 'Zamknij' }).click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Recurring classes', () => {
  test('opens recurring class modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/classes');
    await page.getByRole('button', { name: 'Cyklicznie' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('Tytuł')).toBeVisible();
  });
});
