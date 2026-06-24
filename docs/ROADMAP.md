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
docker compose up -d   # wszystko: postgres, redis, minio, api, web
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
- [x] Docker dev stack — `apps/api/Dockerfile.dev` + `apps/web/Dockerfile.dev`; `docker-compose.yml` rozszerzony o serwisy `api` (:3000) i `web` (:5173)
  - Volume mounty tylko na `src/` i `prisma/` → hot-reload bez rebuildu obrazu
  - Networking wewnątrz Dockera: `postgres:5432`, `redis:6379`, `minio:9000`
  - Vite proxy kieruje na `http://api:3000` przez `VITE_API_TARGET`; lokalny dev bez zmian

**Jak uruchomić cały stack:**
```bash
docker compose up -d   # postgres + redis + minio + api + web
# http://localhost:5173  — frontend
# http://localhost:3000  — API
# http://localhost:9001  — MinIO console (minioadmin / minioadmin)
```

### 1.2 — Użytkownicy ✅

- [x] `UsersModule` — `apps/api/src/modules/users/`
  - `UsersService`: findAll (paginacja, filtr po roli, wyszukiwarka), findOne (z relacjami), create (argon2 hash), update, remove
  - `UsersController`: GET/POST/PATCH/DELETE `/users`, POST/DELETE `/users/:parentId/students/:studentId`
  - Wszystkie endpointy chronione `JwtAuthGuard` + `RolesGuard(@Roles(ADMIN))`
  - DTOs: `CreateUserDto`, `UpdateUserDto` (PartialType/OmitType bez pola password), `UserQueryDto`
- [x] Powiązanie rodzic ↔ uczeń — `ParentStudent` upsert/delete przez osobny endpoint
- [x] 10 testów jednostkowych — `users.service.spec.ts`
- [x] 12 testów integracyjnych — `test/users.e2e-spec.ts`: CRUD, walidacja, 409 na duplikat emaila, link rodzic↔uczeń
- [x] Hook `useUsers` / `useUser` / `useCreateUser` / `useUpdateUser` / `useDeleteUser` — `apps/web/src/hooks/useUsers.ts`
- [x] `UsersTable` — reużywalny komponent tabeli z wyszukiwarką, paginacją, przyciskami edycji/usuwania, badge'ami ról, animacjami Framer Motion — `apps/web/src/components/users/UsersTable.tsx`
- [x] `UserFormModal` — modal tworzenia/edycji z react-hook-form, Select roli — `apps/web/src/components/users/UserFormModal.tsx`
- [x] `TeachersPage` (`/admin/teachers`) + `StudentsPage` (`/admin/students`) — `apps/web/src/pages/admin/`

### 1.3 — Grupy ✅

- [x] `GroupsModule` — `apps/api/src/modules/groups/`
  - `GroupsService`: findAll (paginacja, filtr language/teacherId/isActive/search), findOne (z listą aktywnych uczniów), create, update, remove (kaskaduje GroupStudent), addStudent (upsert isActive=true), removeStudent (soft-delete isActive=false)
  - `GroupsController`: ADMIN+TEACHER mogą czytać, tylko ADMIN może pisać
  - DTOs: `CreateGroupDto`, `UpdateGroupDto`, `GroupQueryDto`
- [x] 12 testów jednostkowych — `groups.service.spec.ts`
- [x] 10 testów integracyjnych — `test/groups.e2e-spec.ts`
- [x] Hooki — `apps/web/src/hooks/useGroups.ts`: useGroups, useGroup, useCreateGroup, useUpdateGroup, useDeleteGroup, useAddStudentToGroup, useRemoveStudentFromGroup
- [x] `GroupsPage` — siatka kart z badge'ami języka/poziomu, licznikiem uczniów, wyszukiwarką, paginacją — `/admin/groups`
- [x] `GroupFormModal` — react-hook-form, Select nauczyciela ładowany z useUsers

**Uwaga architektoniczna:** `@base-ui/react` Select's `onValueChange` zwraca `string | null`, nie `string` — zawsze rzutuj: `(v: string | null) => v && setValue(...)`.

### 1.4 — Zajęcia ✅

- [x] `ClassesModule` — `apps/api/src/modules/classes/`
  - `ClassesService`: findAll (filter groupId/status/from/to, paginacja), findOne (z attendance), create, update, remove (kaskaduje Attendance), updateStatus
  - `ClassesController`: ADMIN+TEACHER read+updateStatus, tylko ADMIN create/update/delete
  - DTOs: `CreateClassDto`, `UpdateClassDto`, `ClassQueryDto`
- [x] 12 testów jednostkowych — `classes.service.spec.ts`
- [x] 12 testów integracyjnych — `test/classes.e2e-spec.ts`
- [x] Hooki — `apps/web/src/hooks/useClasses.ts`: useClasses, useClass, useCreateClass, useUpdateClass, useUpdateClassStatus, useDeleteClass
- [x] `ClassesPage` — przełącznik Kalendarz/Lista
  - Kalendarz: `react-big-calendar` widok miesiąc/tydzień/dzień, eventi kolorowane po statusie
  - Lista: karty z blokiem daty, badge statusu, przycisk Meet, szybkie Rozpocznij/Zakończ
- [x] `ClassFormModal` — datetime-local, Select grupy z nazwą, czas trwania, opcjonalny meetLink

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

**Jesteśmy w Fazie 1.5 — Frekwencja**

Kolejne kroki:
1. `AttendanceModule` w NestJS — bulk update obecności dla zajęć (lista uczniów grupy → PRESENT/ABSENT/LATE/EXCUSED)
2. Testy jednostkowe + integracyjne
3. Frontend: widok zaznaczania obecności na stronie szczegółów zajęć, statystyki frekwencji ucznia

Uwaga: po dodaniu shadcn komponentu trzeba naprawić importy — zmienić `src/lib/utils` → `@/lib/utils` oraz `src/components/ui/X` → `@/components/ui/X` (shadcn CLI generuje złe ścieżki).
