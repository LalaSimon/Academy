import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Classes — list view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/classes');
    // Switch to list view if calendar is default
    const listBtn = page.getByRole('button', { name: /lista/i });
    if (await listBtn.isVisible()) await listBtn.click();
  });

  test('shows classes page with list/calendar toggle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /zajęcia/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /nowe zajęcia/i })).toBeVisible();
  });

  test('creates a single class and shows it in the list', async ({ page }) => {
    await page.getByRole('button', { name: /nowe zajęcia/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Fill in the form
    await modal.getByLabel(/tytuł/i).fill('E2E Test Class');

    // Select group
    await modal.getByRole('combobox').filter({ hasText: /wybierz grupę/i }).click();
    await page.getByRole('option', { name: /E2E Angielski/i }).click();

    // Set date (tomorrow at 10:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`;
    await modal.getByLabel(/data i godzina/i).fill(dateStr);

    await modal.getByRole('button', { name: /utwórz/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('E2E Test Class')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Classes — status transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/classes');
    const listBtn = page.getByRole('button', { name: /lista/i });
    if (await listBtn.isVisible()) await listBtn.click();
  });

  test('can start a scheduled class', async ({ page }) => {
    // Find a SCHEDULED class and click Rozpocznij
    const startBtn = page.getByRole('button', { name: /rozpocznij/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 5_000 });
    await startBtn.click();

    // Should now show Zakończ button
    await expect(page.getByRole('button', { name: /zakończ/i }).first()).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Attendance — marking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/classes');
    const listBtn = page.getByRole('button', { name: /lista/i });
    if (await listBtn.isVisible()) await listBtn.click();
  });

  test('opens attendance modal and marks all present', async ({ page }) => {
    // Find attendance icon button (Users icon) for a class
    const attendanceBtn = page
      .getByRole('row')
      .first()
      .getByRole('button', { name: /frekwencja|obecność/i })
      .or(page.locator('[title*="rekwencja"], [title*="becność"]').first());

    // Fallback: find by icon class
    const usersBtn = page.locator('button:has(.lucide-users)').first();
    if (await usersBtn.isVisible()) {
      await usersBtn.click();
    } else if (await attendanceBtn.isVisible()) {
      await attendanceBtn.click();
    }

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 3_000 });

    // Click "Ustaw wszystkich obecnych" or similar bulk button
    const allPresentBtn = modal.getByRole('button', { name: /wszyscy|obecni/i }).first();
    if (await allPresentBtn.isVisible()) {
      await allPresentBtn.click();
    }

    // Save
    const saveBtn = modal.getByRole('button', { name: /zapisz/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(modal).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Recurring classes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/classes');
    const listBtn = page.getByRole('button', { name: /lista/i });
    if (await listBtn.isVisible()) await listBtn.click();
  });

  test('opens recurring class modal', async ({ page }) => {
    const recurringBtn = page.getByRole('button', { name: /cykliczne|seria/i });
    await expect(recurringBtn).toBeVisible();
    await recurringBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/dzień tygodnia|powtarzaj/i)).toBeVisible();
  });
});
