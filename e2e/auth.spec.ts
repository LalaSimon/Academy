import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@test.academy';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234!';

test.describe('Auth — login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /zaloguj/i })).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/hasło/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zaloguj/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.getByLabel(/e-mail/i).fill('notexist@example.com');
    await page.getByLabel(/hasło/i).fill('wrongpassword');
    await page.getByRole('button', { name: /zaloguj/i }).click();

    await expect(page.getByText(/nieprawidłowy|błędny|invalid/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL('/login');
  });

  test('redirects to /admin after successful admin login', async ({ page }) => {
    await page.getByLabel(/e-mail/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/hasło/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /zaloguj/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });
});

test.describe('Auth — protected routes', () => {
  test('redirects unauthenticated user from /admin to /login', async ({ page }) => {
    await page.goto('/admin/teachers');
    await expect(page).toHaveURL('/login');
  });

  test('redirects unauthenticated user from /admin/groups to /login', async ({ page }) => {
    await page.goto('/admin/groups');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Auth — logout', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('logs out and redirects to /login', async ({ page }) => {
    await page.goto('/admin/teachers');
    await expect(page).toHaveURL(/\/admin/);

    // Find and click logout button
    await page.getByRole('button', { name: /wyloguj/i }).click();

    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

  test('cannot access /admin after logout', async ({ page }) => {
    await page.goto('/admin/teachers');
    await page.getByRole('button', { name: /wyloguj/i }).click();
    await expect(page).toHaveURL('/login');

    await page.goto('/admin/teachers');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Auth — session persistence', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('admin stays logged in after page reload', async ({ page }) => {
    await page.goto('/admin/teachers');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
    await expect(page.getByText(/nauczyciel|teacher/i).first()).toBeVisible();
  });
});
