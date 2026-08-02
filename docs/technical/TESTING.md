# Strategia Testowania

## Aktualne pokrycie (2026-08-02)

| Poziom | Narzędzie | Liczba | Komenda | We flow | W CI |
|--------|-----------|--------|---------|---------|------|
| Backend (unit) | Jest | 207 | `cd apps/api && npm test` | ✅ | ✅ |
| Backend (integracyjne) | Jest + Postgres | 45 | `cd apps/api && npm run test:e2e` | ❌ (Docker) | ✅ |
| Frontend (unit) | Vitest + Testing Library | 86 | `cd apps/web && npm test` | ✅ | ✅ |
| E2E | Playwright | 42 | `npx playwright test` | ❌ (Docker) | ✅ |
| **Razem** | | **380** | | | ✅ |

**Testy integracyjne** mają osobny config (`test/jest-e2e.json`) i nie wchodzą
w skład `npm test`. Wymagają `docker compose -f docker-compose.test.yml up -d`
(Postgres na 5433, tmpfs) oraz `npx prisma migrate deploy`.

> ⚠ Do 2026-07-31 testy integracyjne nie były uruchamiane w CI i **38 z 45
> failowało** — regresja z Fazy 3.6 (login zaczął odrzucać `emailVerified: false`,
> a suity tworzą userów wprost przez Prisma). Od tamtej pory biegną przy każdym
> pushu, więc taka cisza już się nie powtórzy.

### Limity żądań a testy

Endpointy auth mają throttling (10/min, 3/min dla akcji wysyłających maile).
Zestawy testów logują się kilkanaście razy z jednego IP, dlatego
`AUTH_THROTTLE_LIMIT` i `MAIL_THROTTLE_LIMIT` są podnoszone do 1000
w `docker-compose.yml` oraz w **obu** jobach CI (`api` i `e2e`).
Produkcja tych zmiennych nie ustawia.

---

## Piramida testów

```
        /\
       /e2e\          ← 42 testy, Playwright, krytyczne ścieżki
      /──────\
     / integr.\       ← 45 testów, Jest + realny Postgres
    /──────────\
   /    unit    \     ← 293 testy, Jest + Vitest, izolowane
    /──────────\
```

---

## Backend — Jest

### Uruchomienie

```bash
cd apps/api
npm test             # wszystkie testy (119 w 9 suite'ach)
npm run test:watch   # watch mode
npm run test:cov     # coverage report
```

### Suity testowe

| Plik | Testy | Zakres |
|------|-------|--------|
| `auth.service.spec.ts` | 27 | Login (EMAIL_NOT_VERIFIED, isMinor bypass, needsChildSetup), register, verifyEmail, resendVerification, setupChild (CHILD_ALREADY_SET), refresh, logout |
| `users.service.spec.ts` | 25 | CRUD, isMinor flag, linkParent przez existingParentId, nowy rodzic inline, getTeacherStats (WHERE OR clause) |
| `groups.service.spec.ts` | 12 | CRUD, addStudent (upsert), removeStudent, generateClasses z GroupSchedule |
| `classes.service.spec.ts` | 14 | CRUD, bulk create, batch update/delete, statusy, 1:1 vs. grupowe |
| `attendance.service.spec.ts` | 7 | bulkUpdate, getStudentStats (OR branches dla teacherId null) |
| `materials.service.spec.ts` | 10 | upload (MinIO), link, assign do klasy/grupy, cascade GroupMaterial |
| `payments.service.spec.ts` | 15 | CRUD, Stripe checkout URL, webhook handler, bulk dla grupy, summary stats |
| `roles.guard.spec.ts` | 4 | RolesGuard — role matching, reflector, brak dekoratora |
| `mail.service.spec.ts` | 5 | send (success/error), dev vs. production error handling |

### Wzorce mockowania

```typescript
// Centralny mock Prisma — jeden obiekt na poziomie modułu testowego
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Izolacja — clearAllMocks w beforeEach
beforeEach(() => {
  jest.clearAllMocks();
});

// Scenariusze z wieloma wywołaniami findUnique (np. login → refresh):
mockPrisma.user.findUnique
  .mockReset()                                    // czyści mockResolvedValueOnce chain
  .mockResolvedValueOnce({ ...mockUser })         // 1. wywołanie
  .mockResolvedValueOnce(null);                   // 2. wywołanie

// Mockowanie serwisów wewnętrznych
const mockMail = { sendVerificationEmail: jest.fn(), sendAdminNewRegistration: jest.fn() };
const mockJwt = { sign: jest.fn(() => 'test-token'), verify: jest.fn() };
```

### Kluczowe pułapki w testach backendowych

**OR clause w Prisma** — statystyki nauczyciela i attendance muszą obsługiwać `Class.teacherId = null` (nauczyciel z grupy). Testy weryfikują strukturę WHERE, nie tylko wartości zwracane:

```typescript
it('should include classes where teacher comes from group', async () => {
  await service.getTeacherStats('teacher-id', {});
  expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { teacherId: 'teacher-id' },
          { teacherId: null, group: { teacherId: 'teacher-id' } },
        ],
      }),
    }),
  );
});
```

---

## Frontend — Vitest + Testing Library

### Uruchomienie

```bash
cd apps/web
npm run test           # Vitest (watch mode)
npm run test -- --run  # jednorazowe
```

### Suity testowe

| Plik | Testy | Zakres |
|------|-------|--------|
| `auth/__tests__/RegisterPage.test.tsx` | 13 | Render default, wybór AccountType (student/parent/minor), pola dla rodzica, submit, loading state, toggle hasła, link do logowania, AccountType info |
| `auth/__tests__/LoginPage.test.tsx` | 8 | Render, submit credentials, toggle hasła, generic error, EMAIL_NOT_VERIFIED banner, brak generic error przy EMAIL_NOT_VERIFIED, loading, link do rejestracji |
| `auth/__tests__/VerifyEmailPage.test.tsx` | 12 | No-token: header/email/generic text/resend/disabled/back link/link sent; With token: wywołanie verify, StrictMode guard (1x call), loading/success/error state, timer redirect 2500ms |
| `parent/__tests__/ParentSetupPage.test.tsx` | 9 | Render z imieniem rodzica, email format hint, pola firstName/lastName/password, submit mutation, toggle hasła, sukces (navigate + setUser), CHILD_ALREADY_SET error, generic error, disabled state |

### Konfiguracja

`vitest` z `jsdom` environment. Konfiguracja w `vite.config.ts`.

`tsconfig.app.json` wyklucza `src/**/__tests__/**` z kompilacji produkcyjnej (zapobiega błędom TypeScript dla `vi` w buildzie).

### Kluczowe pułapki w testach frontendowych

**framer-motion mock z cache** — proxy bez cache'owania tworzy nową referencję funkcji przy każdym property access. React widzi nowy komponent i unmountuje/remountuje drzewo, tracąc `useState` (np. `showPassword`). Rozwiązanie: cache w closure:

```typescript
vi.mock('framer-motion', () => {
  const cache: Record<string, unknown> = {};
  return {
    motion: new Proxy({}, {
      get: (_t: object, tag: string) => {
        if (!cache[tag]) {
          const Tag = tag as keyof JSX.IntrinsicElements;
          cache[tag] = ({ children, initial: _i, animate: _a, exit: _e,
                          transition: _tr, variants: _v, whileHover: _wh,
                          whileTap: _wt, layout: _l, layoutId: _lid, ...rest }: any) =>
            <Tag {...rest}>{children}</Tag>;
        }
        return cache[tag];
      },
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});
```

**Submit formularza** — `userEvent.click(submitButton)` nie zawsze triggeruje `onSubmit` w jsdom. Używaj:

```typescript
fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
fireEvent.submit(submitButton.closest('form')!);
```

**Fake timers + waitFor** — `vi.useFakeTimers()` blokuje `waitFor` (który wewnętrznie używa `setTimeout`). Zamiast tego: `act` + synchroniczny assert:

```typescript
vi.useFakeTimers();
// ...trigger onSuccess...
act(() => {
  capturedCallback.onSuccess?.();
  vi.advanceTimersByTime(2500);
});
expect(mockNavigate).toHaveBeenCalledWith('/login'); // synchronicznie po act
vi.useRealTimers();
```

**Moduł-level state w mockach** — `vi.mock` factory jest hoistowany przed importami; zamiast `vi.mocked(fn).mockReturnValue(...)` (które nie działa na wartości zwrócone z factory), używaj zmiennej na poziomie modułu:

```typescript
let mockError: Error | null = null;
let mockIsPending = false;

vi.mock('@/hooks/useRegister', () => ({
  useRegister: () => ({
    mutate: mockMutate,
    error: mockError,
    isPending: mockIsPending,
  }),
}));

// W konkretnym teście:
it('shows error', () => {
  mockError = new Error('Registration failed');
  render(<RegisterPage />);
  // ...
});
```

**JSX w vi.mock factory** — `vi.mock` jest hoistowany, co oznacza że `React.createElement` może nie być dostępny. Używaj składni JSX (automatic JSX runtime używa `_jsx` z `react/jsx-runtime`, nie `React`).

---

## E2E — Playwright

### Uruchomienie

```bash
# Wymaga: docker compose up -d
npx playwright test                           # wszystkie
npx playwright test e2e/registration.spec.ts  # konkretny plik
npx playwright test --ui                      # tryb interaktywny
npx playwright show-report                    # wyniki ostatniego runu
```

### Konfiguracja

`playwright.config.ts` — baseURL: `http://localhost:5173`, workers: 1 (serial, testy dzielą DB).  
W dev: `webServer` auto-startuje Vite jeśli nie ma procesu na :5173 (`reuseExistingServer: true`).

### Suity E2E

**`e2e/global.setup.ts`** — seed DB przed wszystkimi testami (admin, teacher, student, group), zapisuje `storageState` admina.

**`e2e/auth.spec.ts`** — formularz logowania, błędne dane, redirect per rola, ochrona prywatnych tras, wylogowanie, sesja po reload.

**`e2e/classes.spec.ts`** — lista zajęć, tworzenie, zmiana statusu, modal obecności, toggle grupowe/1:1.

**`e2e/registration.spec.ts`** (6 testów):

| Test | Opis |
|------|------|
| `registers, verifies email and logs in as student` | Pełny flow: formularz rejestracji → verify API → login → /student |
| `blocks login before email verification` | POST /auth/register (API) → login → sprawdza EMAIL_NOT_VERIFIED banner |
| `resend verification from login warning banner` | Klik "wyślij link" w banner → /verify-email → resend |
| `registers parent, sets up child account and logs in` | Formularz rejestracji jako rodzic → verify API → login → /parent/setup → wypełnij dziecko → /parent/dashboard |
| `child can log in with generated academy.pl email` | API: register+verify+login+setupChild → login dziecka w przeglądarce → /student |

### DB helpers

```
e2e/helpers/
├── getVerificationToken.js  # node getVerificationToken.js <email> → wypisuje token na stdout
└── deleteUser.js            # node deleteUser.js <email> [<email2>...] → FK-safe cascade delete
```

Uruchamiane przez `execFileSync` z `cwd: apps/api` (Prisma client z apps/api/node_modules).

**`deleteUser.js` — kolejność usuwania (FK constraints):**
1. `parentStudent` (obie strony relacji)
2. `refreshToken`
3. `attendance`
4. `groupStudent`
5. `payment`
6. `user`

### Weryfikacja email w E2E

Verify-email page używa TanStack Query `useMutation` → axios GET → Vite proxy. W środowisku dev/Playwright ta kombinacja jest zawodna (React StrictMode + mutation state reset po remount). Dlatego E2E testy weryfikują email przez bezpośrednie wywołanie API:

```typescript
// ✅ Niezawodne w E2E
const verifyRes = await page.request.get(
  `http://localhost:3000/api/v1/auth/verify-email?token=${token}`,
);
expect(verifyRes.ok()).toBeTruthy();

// Verify-email UI jest pokryte 12 testami jednostkowymi (VerifyEmailPage.test.tsx)
```

---

## Priorytety pokrycia

| Obszar | Typ testów | Priorytet | Status |
|--------|-----------|-----------|--------|
| Auth (login, register, verify, refresh) | unit + E2E | KRYTYCZNY | ✅ |
| Płatności (Stripe webhook, statusy) | unit | KRYTYCZNY | ✅ |
| Frekwencja (obliczenia, bulk update, OR clause) | unit | WYSOKI | ✅ |
| Grupy / przypisania | unit | WYSOKI | ✅ |
| Formularze rejestracji/logowania | unit | WYSOKI | ✅ |
| Krytyczne ścieżki user journey | E2E Playwright | WYSOKI | ✅ |
| Portal ucznia (E2E) | E2E | ŚREDNI | planowane |
| Upload materiałów | unit | ŚREDNI | ✅ |
| Statystyki nauczyciela | unit | ŚREDNI | ✅ |

---

## CI (GitHub Actions)

```yaml
# .github/workflows/ci.yml
jobs:
  api:
    steps:
      - run: npx eslint "{src,apps,libs,test}/**/*.ts"
      - run: npm test
      - run: npm run build

  web:
    steps:
      - run: npm run lint
      - run: npm run build

  e2e:
    services:
      postgres: { image: postgres:16-alpine }
    steps:
      - run: docker compose up -d
      - run: npx prisma migrate deploy
      - run: node e2e/helpers/seed.js
      - run: npx playwright test
      - uses: actions/upload-artifact@v4  # HTML report
        with: { path: playwright-report }
```
