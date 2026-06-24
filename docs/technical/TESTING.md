# Strategia Testowania

## Podejście ogólne — Piramida testów

```
        /\
       /e2e\          ← mało, wolne, pokrywa krytyczne ścieżki
      /──────\
     / integ  \       ← średnio, testuje moduły z prawdziwą DB
    /──────────\
   / unit tests \     ← dużo, szybkie, izolowane
  /______________\
```

---

## Backend (NestJS)

### Testy jednostkowe — Jest

**Co testujemy:**
- Logika serwisów (services) — bez bazy danych, z mockami repozytoriów
- Transformacje danych, obliczenia (np. statystyki frekwencji, kwoty płatności)
- Guardy i Decoratory (role, JWT)
- Helpery i utilsy

**Narzędzia:**
- `jest` (wbudowany w NestJS)
- `@nestjs/testing` — `Test.createTestingModule()`

**Przykład — AttendanceService:**
```typescript
// attendance.service.spec.ts
it('should calculate attendance percentage correctly', () => {
  const stats = service.calculateStats([PRESENT, ABSENT, PRESENT, LATE]);
  expect(stats.percentage).toBe(75); // PRESENT + LATE = obecny
});
```

**Konwencja:** pliki `*.spec.ts` obok testowanego pliku.

---

### Testy integracyjne — Jest + test database

**Co testujemy:**
- Moduły API end-to-end (request → controller → service → DB)
- Migracje i zapytania Prisma
- Webhooks (np. potwierdzenie płatności Przelewy24)

**Narzędzia:**
- `@nestjs/testing` + `supertest`
- Osobna baza testowa PostgreSQL (w Docker Compose test)
- Prisma: `prisma migrate deploy` + seedy przed testami
- Czyszczenie DB między testami (`beforeEach` lub transakcje)

**Przykład:**
```typescript
// groups.e2e-spec.ts
it('POST /groups — should create group and assign teacher', async () => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/groups')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'English B2', teacherId: teacher.id });

  expect(res.status).toBe(201);
  expect(res.body.data.teacherId).toBe(teacher.id);
});
```

**Konwencja:** pliki `*.e2e-spec.ts` w katalogu `test/` modułu.

---

## Frontend (React)

### Testy jednostkowe — Vitest + Testing Library

**Co testujemy:**
- Hooki (`useAuth`, `useAttendance`, obliczenia)
- Komponenty prezentacyjne (render, propsów, warunkowe wyświetlanie)
- Helpery i utilsy (formatowanie dat, walut, statusów)
- Store (Zustand actions)

**Narzędzia:**
- `vitest` — szybszy odpowiednik Jest, natywny dla Vite
- `@testing-library/react` — testowanie przez UI (nie implementację)
- `@testing-library/user-event` — symulacja zdarzeń
- `msw` (Mock Service Worker) — mockowanie API w testach

**Przykład:**
```typescript
// AttendanceBadge.test.tsx
it('renders correct color for OVERDUE payment', () => {
  render(<PaymentStatusBadge status="OVERDUE" />);
  expect(screen.getByText('Zaległa')).toHaveClass('text-red-600');
});
```

**Konwencja:** pliki `*.test.tsx` obok testowanego komponentu.

---

### Testy E2E — Playwright

**Co testujemy:**
- Krytyczne ścieżki użytkownika (happy path)
- Flow logowania dla każdej roli
- Zaznaczanie obecności
- Proces płatności (mock bramki)
- Tworzenie zajęć i dołączanie do Meet

**Narzędzia:**
- `playwright` — E2E w prawdziwej przeglądarce (Chromium/Firefox)
- Osobne środowisko testowe z seeded DB

**Przykład:**
```typescript
// attendance.spec.ts
test('teacher can mark attendance after class', async ({ page }) => {
  await loginAs(page, 'teacher');
  await page.goto('/classes/123');
  await page.click('text=Zakończ zajęcia');
  await page.click('text=Zaznacz obecność');
  await page.click('[data-student="jan-kowalski"] >> text=Obecny');
  await page.click('text=Zapisz');
  await expect(page.locator('.attendance-saved')).toBeVisible();
});
```

---

## Pokrycie testami — priorytety

| Obszar | Typ | Priorytet | Uwagi |
|--------|-----|-----------|-------|
| Auth (login, refresh, role guards) | unit + integration | KRYTYCZNY | Bezpieczeństwo |
| Płatności (webhook, statusy) | unit + integration | KRYTYCZNY | Pieniądze |
| Frekwencja (obliczenia, bulk update) | unit | WYSOKI | |
| Tworzenie grup / przypisania | integration | WYSOKI | |
| Upload materiałów | integration | ŚREDNI | MinIO mock |
| Komponenty UI | unit | ŚREDNI | Tylko złożone |
| Krytyczne ścieżki | e2e (Playwright) | WYSOKI | Login, zajęcia, płatność |
| Raporty / statystyki | unit | NISKI | Faza 3 |

---

## Konfiguracja CI (GitHub Actions)

```yaml
jobs:
  test-api:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_DB: academy_test, ... }
    steps:
      - run: npm run test:unit        # szybkie, na każdy PR
      - run: npm run test:integration # z prawdziwą DB

  test-web:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test             # vitest

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - run: docker-compose -f docker-compose.test.yml up -d
      - run: npm run test:e2e         # playwright — tylko na main/staging
```

---

## Skrypty (package.json)

```json
// API
"test": "jest",
"test:watch": "jest --watch",
"test:integration": "jest --config jest.integration.config.js",
"test:cov": "jest --coverage"

// Web
"test": "vitest",
"test:ui": "vitest --ui",
"test:e2e": "playwright test"
```

---

## Co NIE jest testowane

- Konfiguracja Docker/Nginx — weryfikowana manualnie
- Zewnętrzne API (Google Meet, Przelewy24) — mockowane w testach
- Style CSS — weryfikowane wizualnie / Storybook (opcja faza 2)
