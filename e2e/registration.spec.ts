import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as path from 'path';

const API_DIR = path.resolve(__dirname, '../apps/api');
const HELPERS = path.resolve(__dirname, 'helpers');

// ── Test DB helpers ────────────────────────────────────────────────────────

function getVerificationToken(email: string): string {
  return execFileSync('node', [path.join(HELPERS, 'getVerificationToken.js'), email], {
    cwd: API_DIR,
    env: { ...process.env },
  })
    .toString()
    .trim();
}

function cleanupUsers(...emails: string[]): void {
  const valid = emails.filter(Boolean);
  if (!valid.length) return;
  try {
    execFileSync('node', [path.join(HELPERS, 'deleteUser.js'), ...valid], {
      cwd: API_DIR,
      env: { ...process.env },
    });
  } catch {
    // ignore cleanup errors
  }
}

// ── Adult Student flow ─────────────────────────────────────────────────────

test.describe('Registration flow — adult student', () => {
  const testEmail = 'e2e.student@test.academy';
  const testPassword = 'TestPass1234!';

  test.beforeEach(() => cleanupUsers(testEmail));
  test.afterAll(() => cleanupUsers(testEmail));

  test('registers, verifies email and logs in as student', async ({ page }) => {
    // ── Register ─────────────────────────────────────────────────────────
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Załóż konto' })).toBeVisible();

    await page.locator('input[placeholder="Jan"]').fill('E2E');
    await page.locator('input[placeholder="Kowalski"]').fill('Student');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[placeholder="+48 123 456 789"]').fill('+48 500 000 001');
    await page.locator('input[placeholder="Min. 8 znaków"]').fill(testPassword);
    await page.getByRole('button', { name: /załóż konto/i }).click();

    // ── Redirected to verify-email page ──────────────────────────────────
    await expect(page).toHaveURL('/verify-email', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Sprawdź swoją skrzynkę' })).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();

    // ── Verify email via direct API call ─────────────────────────────────
    // (TanStack Query mutation via Vite proxy is tested in unit tests;
    //  here we test the user journey: register → verify → login)
    const token = getVerificationToken(testEmail);
    expect(token).toBeTruthy();

    const verifyRes = await page.request.get(
      `http://localhost:3000/api/v1/auth/verify-email?token=${token}`,
    );
    expect(verifyRes.ok()).toBeTruthy();

    // ── Navigate to login ─────────────────────────────────────────────────
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5_000 });

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /zaloguj się/i }).click();

    await expect(page).toHaveURL(/\/student/, { timeout: 10_000 });
  });

  test('blocks login before email verification', async ({ page }) => {
    // Register via API (faster than UI)
    await page.request.post('/api/v1/auth/register', {
      data: {
        email: testEmail,
        password: testPassword,
        firstName: 'E2E',
        lastName: 'Student',
        accountType: 'student',
      },
    });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /zaloguj się/i }).click();

    await expect(
      page.getByText(/Adres email nie został jeszcze potwierdzony/i),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL('/login');
  });

  test('resend verification from login warning banner', async ({ page }) => {
    // Register unverified user via API
    await page.request.post('/api/v1/auth/register', {
      data: {
        email: testEmail,
        password: testPassword,
        firstName: 'E2E',
        lastName: 'Student',
        accountType: 'student',
      },
    });

    // Attempt login → get EMAIL_NOT_VERIFIED warning
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: /zaloguj się/i }).click();

    await expect(page.getByText(/Adres email nie został jeszcze potwierdzony/i)).toBeVisible({
      timeout: 5_000,
    });

    // Click link to verify-email page (carries email in state)
    await page.getByRole('link', { name: /wyślij link weryfikacyjny/i }).click();
    await expect(page).toHaveURL('/verify-email');

    // Resend button enabled because email is in location state
    const resendBtn = page.getByRole('button', { name: /wyślij link ponownie/i });
    await expect(resendBtn).toBeEnabled({ timeout: 3_000 });
    await resendBtn.click();

    await expect(page.getByText('Link wysłany ponownie!')).toBeVisible({ timeout: 5_000 });
  });
});

// ── Parent + child flow ────────────────────────────────────────────────────

test.describe('Registration flow — parent with child', () => {
  const parentEmail = 'e2e.parent@test.academy';
  const parentPassword = 'ParentPass1234!';
  const childFirstName = 'E2EMaks';
  const childLastName = 'Dziecko';

  // Derive expected child email (slugified)
  const expectedChildEmail = `${childFirstName.toLowerCase()}.${childLastName.toLowerCase()}@academy.pl`;

  test.beforeEach(() =>
    cleanupUsers(parentEmail, expectedChildEmail, `${expectedChildEmail.replace('@', '2@')}`),
  );
  test.afterAll(() =>
    cleanupUsers(parentEmail, expectedChildEmail, `${expectedChildEmail.replace('@', '2@')}`),
  );

  test('registers parent, sets up child account and logs in', async ({ page }) => {
    // ── Register as parent ─────────────────────────────────────────────────
    await page.goto('/register');

    await page.getByText('Rodzic').click();
    await expect(page.getByText(/Jako rodzic/i)).toBeVisible();

    await page.locator('input[placeholder="Jan"]').fill('E2E');
    await page.locator('input[placeholder="Kowalski"]').fill('Rodzic');
    await page.locator('input[type="email"]').fill(parentEmail);
    await page.locator('input[placeholder="Min. 8 znaków"]').fill(parentPassword);
    await page.getByRole('button', { name: /załóż konto/i }).click();

    // ── Verify-email page ──────────────────────────────────────────────────
    await expect(page).toHaveURL('/verify-email', { timeout: 10_000 });
    await expect(page.getByText(parentEmail)).toBeVisible();

    // ── Verify parent email via direct API call ────────────────────────────
    const token = getVerificationToken(parentEmail);
    expect(token).toBeTruthy();

    const verifyParent = await page.request.get(
      `http://localhost:3000/api/v1/auth/verify-email?token=${token}`,
    );
    expect(verifyParent.ok()).toBeTruthy();

    // ── Login as parent → redirected to /parent/setup ──────────────────────
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5_000 });
    await page.locator('input[type="email"]').fill(parentEmail);
    await page.locator('input[type="password"]').fill(parentPassword);
    await page.getByRole('button', { name: /zaloguj się/i }).click();

    await expect(page).toHaveURL('/parent/setup', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Skonfiguruj konto dziecka' })).toBeVisible();
    await expect(page.getByText('E2E')).toBeVisible(); // parent first name
    await expect(page.getByText(/imie\.nazwisko@academy\.pl/i)).toBeVisible();

    // ── Fill child setup form ──────────────────────────────────────────────
    await page.locator('input[placeholder="Jan"]').fill(childFirstName);
    await page.locator('input[placeholder="Kowalski"]').fill(childLastName);
    await page.locator('input[placeholder="Min. 8 znaków"]').fill('ChildPass1234!');
    await page.getByRole('button', { name: /utwórz konto dziecka/i }).click();

    // ── Navigated to parent dashboard ─────────────────────────────────────
    await expect(page).toHaveURL('/parent/dashboard', { timeout: 10_000 });
  });

  test('child can log in with generated academy.pl email', async ({ page }) => {
    // Create parent + verify via API
    const registerRes = await page.request.post('/api/v1/auth/register', {
      data: {
        email: parentEmail,
        password: parentPassword,
        firstName: 'E2E',
        lastName: 'Rodzic',
        accountType: 'parent',
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    const token = getVerificationToken(parentEmail);
    expect(token).toBeTruthy();

    // Verify email via API
    const verifyRes = await page.request.get(
      `http://localhost:3000/api/v1/auth/verify-email?token=${token}`,
    );
    expect(verifyRes.ok()).toBeTruthy();

    // Login as parent to get access token
    const loginRes = await page.request.post('http://localhost:3000/api/v1/auth/login', {
      data: { email: parentEmail, password: parentPassword },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { accessToken } = await loginRes.json();

    // Setup child via API
    const childRes = await page.request.post('http://localhost:3000/api/v1/auth/setup-child', {
      data: { firstName: childFirstName, lastName: childLastName, password: 'ChildPass1234!' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(childRes.ok()).toBeTruthy();
    const child = await childRes.json();
    expect(child.email).toContain('@academy.pl');

    // Login as child in browser
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(child.email);
    await page.locator('input[type="password"]').fill('ChildPass1234!');
    await page.getByRole('button', { name: /zaloguj się/i }).click();

    // Child has STUDENT role → student dashboard
    await expect(page).toHaveURL(/\/student/, { timeout: 10_000 });
  });
});
