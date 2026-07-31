import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@test.academy';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234!';
const STUDENT_EMAIL = 'student@test.academy';
const STUDENT_PASSWORD = 'Student1234!';

// Opis unikalny per przebieg — testy dzielą bazę, więc bez tego kolejne
// uruchomienie widziałoby płatności z poprzedniego.
const RUN_ID = Date.now().toString(36);
const DESCRIPTION = `E2E płatność ${RUN_ID}`;

let paymentId = '';

async function apiToken(request: APIRequestContext, email: string, password: string) {
  const res = await request.post('/api/v1/auth/login', { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

async function loginUi(page: Page, email: string, password: string, urlRe: RegExp) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page).toHaveURL(urlRe, { timeout: 10_000 });
}

test.describe('Płatności', () => {
  // Płatność zakładamy przez API — formularz używa DatePickera w popoverze,
  // a celem tych testów jest proces płatniczy, nie obsługa kalendarza.
  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    const token = await apiToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);

    const usersRes = await request.get('/api/v1/users?role=STUDENT&limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const students = (await usersRes.json()).data as { id: string; email: string }[];
    const student = students.find((s) => s.email === STUDENT_EMAIL);
    expect(student, 'seed powinien zawierać konto ucznia').toBeTruthy();

    const created = await request.post('/api/v1/payments', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        studentId: student!.id,
        amount: '199.99',
        description: DESCRIPTION,
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      },
    });
    expect(created.ok()).toBeTruthy();
    paymentId = (await created.json()).id;
    await request.dispose();
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    if (!paymentId) return;
    const request = await playwright.request.newContext({ baseURL });
    const token = await apiToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await request.delete(`/api/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await request.dispose();
  });

  test('admin widzi płatność na liście', async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin/);
    await page.goto('/admin/payments');

    await expect(page.getByRole('heading', { name: 'Płatności' })).toBeVisible();
    await expect(page.getByText(DESCRIPTION)).toBeVisible({ timeout: 10_000 });
  });

  test('wyszukiwarka zawęża listę do szukanej płatności', async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin/);
    await page.goto('/admin/payments');
    await expect(page.getByText(DESCRIPTION)).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder(/szukaj/i).fill(RUN_ID);
    await expect(page.getByText(DESCRIPTION)).toBeVisible();

    await page.getByPlaceholder(/szukaj/i).fill('nieistniejąca-fraza-xyz');
    await expect(page.getByText(DESCRIPTION)).not.toBeVisible();
  });

  test('admin oznacza płatność jako zapłaconą', async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin/);
    await page.goto('/admin/payments');
    await page.getByPlaceholder(/szukaj/i).fill(RUN_ID);

    const row = page.locator('tr', { hasText: DESCRIPTION });
    await expect(row).toBeVisible({ timeout: 10_000 });

    await row.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Zapłacone' }).click();

    // Status wraca z backendu — po odświeżeniu musi być trwały.
    await page.reload();
    await page.getByPlaceholder(/szukaj/i).fill(RUN_ID);
    await expect(
      page.locator('tr', { hasText: DESCRIPTION }).getByRole('combobox'),
    ).toContainText('Zapłacone', { timeout: 10_000 });
  });

  test('uczeń widzi własną płatność', async ({ page }) => {
    await loginUi(page, STUDENT_EMAIL, STUDENT_PASSWORD, /\/student/);
    await page.goto('/student/payments');

    await expect(page.getByText(DESCRIPTION)).toBeVisible({ timeout: 10_000 });
  });
});
