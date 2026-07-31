import { test, expect, type Page } from '@playwright/test';

const TEACHER_EMAIL = 'teacher@test.academy';
const TEACHER_PASSWORD = 'Teacher1234!';

async function loginAsTeacher(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(TEACHER_EMAIL);
  await page.locator('#password').fill(TEACHER_PASSWORD);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page).toHaveURL(/\/teacher/, { timeout: 10_000 });
}

test.describe('Portal nauczyciela', () => {
  test('logowanie przenosi nauczyciela na jego dashboard', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /Cześć,/ })).toBeVisible();
  });

  test('sidebar pokazuje nawigację nauczyciela', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Moje zajęcia' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Rozliczenie godzin' })).toBeVisible();
  });

  test('lista zajęć renderuje się z zakładkami', async ({ page }) => {
    await loginAsTeacher(page);
    await page.getByRole('link', { name: 'Moje zajęcia' }).click();
    await expect(page).toHaveURL(/\/teacher\/classes/);
    await expect(page.getByRole('heading', { name: 'Moje zajęcia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nadchodzące' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Poprzednie' })).toBeVisible();
  });

  test('rozliczenie godzin pokazuje karty podsumowania', async ({ page }) => {
    await loginAsTeacher(page);
    await page.getByRole('link', { name: 'Rozliczenie godzin' }).click();
    await expect(page).toHaveURL(/\/teacher\/stats/);
    await expect(page.getByRole('heading', { name: 'Rozliczenie godzin' })).toBeVisible();
    await expect(page.getByText('Godziny', { exact: true })).toBeVisible();
    await expect(page.getByText('Zakończone', { exact: true })).toBeVisible();
  });

  test('nauczyciel nie ma dostępu do panelu admina', async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/admin/teachers');
    await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10_000 });
  });
});
