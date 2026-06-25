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

## Faza 1 — Core MVP ✅

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
- [x] `AuthInitializer` — proaktywnie odświeża access token przy ładowaniu strony; ref-guard zapobiega podwójnemu wywołaniu (React StrictMode)
- [x] Docker dev stack — `apps/api/Dockerfile.dev` + `apps/web/Dockerfile.dev`; `docker-compose.yml` rozszerzony o serwisy `api` (:3000) i `web` (:5173)
  - Volume mounty tylko na `src/` i `prisma/` → hot-reload bez rebuildu obrazu
  - Vite proxy kieruje na `http://api:3000` przez `VITE_API_TARGET`

### 1.2 — Użytkownicy ✅

- [x] `UsersModule` — `apps/api/src/modules/users/`
  - `UsersService`: findAll (paginacja, filtr po roli, wyszukiwarka), findOne, create, update, remove, linkParentStudent, unlinkParentStudent
  - `UsersController`: GET/POST/PATCH/DELETE `/users`, POST/DELETE `/users/:parentId/students/:studentId`
  - `GET /users/:id/stats` — statystyki nauczyciela (zajęcia, godziny, breakdown per miesiąc i grupę)
- [x] 19 testów jednostkowych — `users.service.spec.ts` (w tym 7 dla getTeacherStats)
- [x] 12 testów integracyjnych — `test/users.e2e-spec.ts`
- [x] Hooki — `useUsers`, `useUser`, `useCreateUser`, `useUpdateUser`, `useDeleteUser`, `useTeacherStats`
- [x] `UsersTable` — reużywalny komponent; ikona BarChart2 → profil ucznia lub statystyki nauczyciela
- [x] `TeachersPage` + `StudentsPage`
- [x] `TeacherProfilePage` (`/admin/teachers/:teacherId`) — filtr okresu (30d/90d/6m/rok szkolny/własny), karty summary, tabela miesięczna do rozliczeń, breakdown per grupę
- [x] `StudentProfilePage` (`/admin/students/:studentId`) — frekwencja z filtrem okresu

### 1.3 — Grupy ✅

- [x] `GroupsModule` — findAll, findOne, create, update, remove, addStudent (upsert), removeStudent (soft-delete)
- [x] 12 testów jednostkowych — `groups.service.spec.ts`
- [x] 10 testów integracyjnych — `test/groups.e2e-spec.ts`
- [x] Hooki — `useGroups`, `useGroup`, `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup`, `useAddStudentToGroup`, `useRemoveStudentFromGroup`
- [x] `GroupsPage` — siatka kart, wyszukiwarka, paginacja
- [x] `GroupDetailPage` — lista uczniów, sekcja materiałów grupy
- [x] `GroupFormModal`

### 1.4 — Zajęcia ✅

- [x] `ClassesModule`
  - CRUD + `updateStatus` + bulk create (`POST /classes/bulk`) + bulk delete (`DELETE /classes/batch/:batchId`)
  - `PATCH /classes/batch/:batchId` — bulk edit serii: title, description, teacherId, durationMin, meetLink; `scheduledAtTemplate` przesuwa wszystkie daty proporcjonalnie (dayShift + nowa godzina)
  - Auto-fallback: `Class.teacherId` null → nauczyciel dziedziczony z grupy (spójność z listą i statystykami)
- [x] 12 testów jednostkowych — `classes.service.spec.ts`
- [x] 12 testów integracyjnych — `test/classes.e2e-spec.ts`
- [x] Hooki — `useClasses`, `useClass`, `useCreateClass`, `useUpdateClass`, `useUpdateClassStatus`, `useDeleteClass`, `useCreateBulkClasses`, `useDeleteBatch`, `useUpdateBatch`
- [x] `ClassesPage` — przełącznik Kalendarz/Lista; zajęcia cykliczne grupowane w sekcje batchId z bulk-delete
- [x] `ClassFormModal` — toggle "Tylko te zajęcia / Całą serię" dla zajęć z batchId; w trybie serii pole daty działa jako wzorzec przesunięcia
- [x] `RecurringClassModal` — wybór dni tygodnia, zakres dat, podgląd listy przed zapisem
- [x] Przyciski statusu w liście: Zaplanowane → "Rozpocznij" → W trakcie → "Zakończ" → Zakończone

### 1.5 — Frekwencja ✅

- [x] `AttendanceModule` — `GET /attendance?classId`, `PATCH /attendance/bulk`, `GET /attendance/student/:id?from=&to=`
  - Auto-tworzy rekordy dla wszystkich aktywnych uczniów grupy przy pierwszym GET
  - Statystyki ogółem + per-grupę + historia; filtr po zakresie dat
  - Zapytanie stats uwzględnia klasy gdzie `teacherId` null → nauczyciel z grupy
- [x] 7 testów jednostkowych — `attendance.service.spec.ts`
- [x] Hooki — `useClassAttendance`, `useBulkUpdateAttendance`, `useStudentStats`
- [x] `AttendanceModal` — lista uczniów, 4 statusy (P/S/N/U), "ustaw wszystkich", licznik
- [x] `StudentProfilePage` — frekwencja z filtrem okresu (presety + własny zakres)

### 1.6 — Materiały ✅

- [x] `MaterialsModule` + `MinioService` — upload plików (stream przez API, nie presigned URL), linki zewnętrzne
  - `GET /materials/:id/file` — streaming przez API (MinIO `minio:9000` niedostępne z przeglądarki)
  - `POST /materials/:id/classes/:classId` — przypisuje do zajęć + automatycznie do grupy tych zajęć (cascade)
  - `POST /materials/:id/groups/:groupId`, `DELETE` odpowiedniki
- [x] `GroupMaterial` model (migracja `add_group_material`)
- [x] 10 testów jednostkowych — `materials.service.spec.ts`
- [x] Hooki — `useMaterials`, `useClassMaterials`, `useGroupMaterials`, `useUploadMaterial`, `useCreateLinkMaterial`, `useDeleteMaterial`, `useAssignMaterialToClass`, `useUnassignMaterialFromClass`, `useAssignMaterialToGroup`, `useUnassignMaterialFromGroup`
- [x] `MaterialsPage` — drag & drop upload, modal linku, biblioteka z filtrowaniem, paginacja, download (blob)
- [x] `MaterialsPanel` — reużywalny panel (upload, link, biblioteka, download, odepnij); używany w `ClassesPage` i `GroupDetailPage`

### 1.7 — Jakość i spójność danych ✅

- [x] Naprawiono bug: `getTeacherStats` pomijało klasy gdzie `Class.teacherId = null` (nauczyciel z grupy)
  - Zapytanie używa `OR: [{ teacherId }, { teacherId: null, group: { teacherId } }]`
  - Testy weryfikują strukturę WHERE, nie tylko logikę agregacji
- [x] Naprawiono bug: React StrictMode powodował podwójny refresh token → wylogowanie przy odświeżeniu strony
  - Fix: `refreshInitiated` ref w `AuthInitializer` blokuje drugie wywołanie
- [x] Uzupełniono `invalidateQueries` we wszystkich hookach mutacji:
  - `useBulkUpdateAttendance` → invaliduje `['attendance','student']`
  - Mutacje klas → invalidują `['users']` (statystyki nauczyciela) i `['attendance','student']`
  - `useUpdateGroup` → invaliduje `['classes']` (klasy osadzają dane grupy)
  - `useAddStudentToGroup` / `useRemoveStudentFromGroup` → invalidują `['users', studentId]`
  - `useAssignMaterialToClass` → invaliduje `['materials','group']` (cascade GroupMaterial)
  - `useUnassignMaterial*` → invalidują `['materials']`
- [x] 73 testy jednostkowe przechodzą (8 suite'ów)

**Cel Fazy 1:** Szkoła może działać operacyjnie — prowadzić zajęcia, zarządzać uczniami, zaznaczać obecność, zarządzać materiałami, rozliczać nauczycieli.

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
- [ ] Aplikacja mobilna (React Native lub PWA)
- [ ] Czat wewnętrzny (nauczyciel ↔ uczeń)

---

## ▶ Co robimy teraz?

**Faza 1 ukończona. Przechodzimy do Fazy 2.**

Następna funkcjonalność do ustalenia z użytkownikiem.
