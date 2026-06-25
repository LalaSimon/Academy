import { test as setup, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as path from 'path';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@test.academy';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234!';

export const ADMIN_STATE = 'e2e/.auth/admin.json';

setup('seed database and save admin auth state', async ({ page }) => {
  // Seed fixtures into DB
  execFileSync('node', [path.resolve(__dirname, 'helpers/seed.js')], {
    cwd: path.resolve(__dirname, '../apps/api'),
    env: { ...process.env },
    stdio: 'inherit',
  });

  // Log in as admin and persist storage state so tests can reuse the session
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/hasło/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /zaloguj/i }).click();

  await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  await page.context().storageState({ path: ADMIN_STATE });
});
