import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@test.academy';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234!';

test.describe('Auth — login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Witaj z powrotem!' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('notexist@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Zaloguj się' }).click();

    await expect(page.getByText('Nieprawidłowy email lub hasło')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL('/login');
  });

  test('redirects to /admin after successful admin login', async ({ page }) => {
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Zaloguj się' }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });
});

test.describe('Auth — protected routes', () => {
  test('redirects unauthenticated user from /admin/teachers to /login', async ({ page }) => {
    await page.goto('/admin/teachers');
    await expect(page).toHaveURL('/login');
  });

  test('redirects unauthenticated user from /admin/groups to /login', async ({ page }) => {
    await page.goto('/admin/groups');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Auth — logout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('logs out and redirects to /login', async ({ page }) => {
    await page.getByRole('button', { name: 'Wyloguj' }).click();
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

  test('cannot access /admin after logout', async ({ page }) => {
    await page.getByRole('button', { name: 'Wyloguj' }).click();
    await expect(page).toHaveURL('/login');

    await page.goto('/admin/teachers');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Auth — session persistence', () => {
  test('admin stays logged in after page reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/teachers');
    await expect(page).toHaveURL(/\/admin/);

    await page.reload();
    // AuthInitializer refreshes token — must stay on /admin
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });
});
