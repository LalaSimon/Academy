# Roadmap — Plan Rozwoju

> **Zasada:** Nie przechodzimy do kolejnej fazy dopóki poprzednia nie jest w 100% ukończona.

---

## Faza 0 — Planowanie i Setup ✅

- [x] Dokumentacja projektu (`docs/`) — OVERVIEW, BUSINESS, ARCHITECTURE, TESTING, API, DATABASE, DOCKER
- [x] Inicjalizacja repozytorium Git + push na GitHub → https://github.com/LalaSimon/Academy (prywatne)
- [x] Konfiguracja `.gitignore` — chroni .env, node_modules, dist, coverage, playwright-report
- [~] Ochrona brancha `main` — wymaga GitHub Pro (niedostępne na darmowym planie dla prywatnych repo)
- [x] Setup monorepo — Turborepo + npm workspaces; `apps/api` (NestJS), `apps/web` (React), `packages/shared` (typy TS)
- [x] Docker Compose (`docker-compose.yml`) — PostgreSQL 16, Redis 7, MinIO; `docker-compose.test.yml` — izolowana baza testowa port 5433 tmpfs
- [x] NestJS boilerplate (`apps/api/src/`) — ValidationPipe, CORS, cookie-parser, global prefix `/api/v1`
- [x] React boilerplate (`apps/web/src/`) — Vite 8, TanStack Query, Zustand, Axios, React Router
- [x] Prisma schema (`apps/api/prisma/schema.prisma`) — wszystkie modele: User, Group, Class, Attendance, Material, Payment; migracja `init` wykonana
- [x] Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui — komponenty w `apps/web/src/components/ui/`
- [x] CI — GitHub Actions (`.github/workflows/ci.yml`): dwa równoległe joby `api` i `web`, każdy lint→build→test; Node 24
- [x] Playwright config (`playwright.config.ts`) — katalog `e2e/`, Chromium, webServer na dev
- [x] Dodatkowe biblioteki UI: Framer Motion, Recharts, React Big Calendar

**Jak uruchomić środowisko dev:**
```bash
docker compose up -d          # baza, redis, minio
cd apps/api && npm run dev    # NestJS na :3000
cd apps/web && npm run dev    # React na :5173
```

---

## Faza 1 — Core MVP 🔄

### 1.1 — Auth ✅

- [x] `PrismaService` + `PrismaModule` (@Global) — `apps/api/src/prisma/`
- [x] `AuthModule` — `apps/api/src/modules/auth/`
  - `AuthService` — login (argon2 verify), logout, refresh (token rotation), getMe
  - `AuthController` — POST `/login`, `/refresh`, `/logout`; GET `/me`
  - Refresh token w httpOnly cookie (`refresh_token`), access token w response body
  - `JwtStrategy` (Passport) — waliduje token, sprawdza czy user aktywny w DB
- [x] `JwtAuthGuard` + `RolesGuard` + `@Roles()` decorator — `apps/api/src/common/`
- [x] Testy jednostkowe (11 testów) — `auth.service.spec.ts`, `roles.guard.spec.ts`
- [x] Testy integracyjne (11 testów) — `test/auth.e2e-spec.ts`: login, refresh, /me, logout, walidacja
- [x] Axios client z auto-refresh interceptorem — `apps/web/src/lib/api.ts` (kolejkowanie failedQueue)
- [x] Zustand auth store — `apps/web/src/store/auth.store.ts` (persist user, token in memory)
- [x] `useLogin` / `useLogout` hooks (TanStack Query) — `apps/web/src/hooks/useAuth.ts`
- [x] `PrivateRoute` z role-based redirect — `apps/web/src/router/PrivateRoute.tsx`
- [x] Strona logowania (`LoginPage`) — `apps/web/src/pages/auth/LoginPage.tsx`; Framer Motion, violet palette

### 1.2 — Użytkownicy 🔜

- [ ] `UsersModule` w NestJS — CRUD z filtrem po roli, paginacja
- [ ] Endpoint powiązania rodzic ↔ uczeń
- [ ] Testy jednostkowe + integracyjne dla UsersModule
- [ ] TanStack Query hook `useUsers` / `useUser`
- [ ] Strona listy nauczycieli (tabela + wyszukiwarka)
- [ ] Strona listy uczniów (tabela + filtr po grupie)
- [ ] Modal tworzenia/edycji użytkownika (reużywalny formularz)
- [ ] Widok szczegółów ucznia (grupy, frekwencja, powiązani rodzice)

### 1.3 — Grupy

- [ ] `GroupsModule` — CRUD, przypisanie nauczyciela, przypisanie uczniów
- [ ] Testy jednostkowe + integracyjne
- [ ] Hook `useGroups` / `useGroup`
- [ ] Lista grup z filtrowaniem (język, poziom, nauczyciel)
- [ ] Strona szczegółów grupy
- [ ] UI zarządzania uczniami w grupie

### 1.4 — Zajęcia

- [ ] `ClassesModule` — CRUD, statusy (SCHEDULED→ONGOING→COMPLETED), manualny Meet link
- [ ] Testy jednostkowe + integracyjne
- [ ] Hook `useClasses` / `useClass`
- [ ] Widok kalendarza zajęć (React Big Calendar)
- [ ] Strona szczegółów zajęć z przyciskiem Meet
- [ ] Zarządzanie statusami zajęć

### 1.5 — Frekwencja

- [ ] `AttendanceModule` — bulk update, statystyki
- [ ] Testy jednostkowe + integracyjne
- [ ] Hook `useAttendance`
- [ ] UI zaznaczania obecności (lista uczniów + statusy)
- [ ] Widok historii frekwencji ucznia z procentami

### 1.6 — Materiały

- [ ] `MaterialsModule` — upload do MinIO, presigned URL, linki zewnętrzne
- [ ] Testy jednostkowe + integracyjne
- [ ] Hook `useMaterials`
- [ ] Drag & drop upload
- [ ] Biblioteka materiałów + przypisywanie do zajęć

**Cel Fazy 1:** Szkoła może działać operacyjnie — prowadzić zajęcia, zarządzać uczniami, zaznaczać obecność.

---

## Faza 2 — Płatności + Portal rodzica

### 2.0 — E2E (Playwright)
- [ ] Testy E2E: flow logowania dla każdej roli (`e2e/auth.spec.ts`)
- [ ] Testy E2E: tworzenie zajęć + zaznaczanie obecności
- [ ] Testy E2E: proces płatności (mock bramki)

### 2.1 — Płatności
- [ ] `PaymentsModule` — CRUD opłat, statusy, bulk tworzenie dla grupy
- [ ] Integracja Przelewy24 (checkout + webhook z weryfikacją podpisu)
- [ ] Ręczna zmiana statusu przez admina
- [ ] Cron: automatyczne oznaczanie OVERDUE
- [ ] Dashboard finansowy admina (Recharts)
- [ ] Strona płatności ucznia/rodzica

### 2.2 — Portal rodzica
- [ ] Widok frekwencji dziecka
- [ ] Widok płatności dziecka
- [ ] Powiadomienia email o nieobecności

### 2.3 — Powiadomienia email
- [ ] BullMQ kolejka + szablony HTML (Nodemailer)
- [ ] Cron: reminder 30 min przed zajęciami
- [ ] Cron: reminder o zalegających płatnościach
- [ ] In-app powiadomienia (bell icon w navbarze)

**Cel Fazy 2:** Właściciel ma pełny wgląd w finanse. Rodzice są informowani.

---

## Faza 3 — Rozszerzenia (przyszłość)

- [ ] Zadania domowe (upload, ocenianie)
- [ ] Testy poziomujące (quiz builder)
- [ ] Tracking postępów ucznia
- [ ] Google Calendar API (automatyczne Meet linki)
- [ ] Raporty i eksport CSV/PDF
- [ ] Powtarzające się zajęcia (recurrence rules)
- [ ] Aplikacja mobilna (React Native lub PWA)
- [ ] Czat wewnętrzny (nauczyciel ↔ uczeń)

---

## ▶ Co robimy teraz?

**Jesteśmy w Fazie 1.2 — Użytkownicy**

Kolejne kroki:
1. `UsersModule` w NestJS (`apps/api/src/modules/users/`) — serwis + kontroler + DTO + testy
2. Endpoint `/api/v1/users` z paginacją i filtrem po roli
3. Frontend: hook `useUsers`, strona listy nauczycieli i uczniów, modal tworzenia użytkownika

Żeby dodać nowego shadcn komponent: `npx shadcn@latest add <nazwa>` w `apps/web/` — pliki trafiają do `src/components/ui/`.
