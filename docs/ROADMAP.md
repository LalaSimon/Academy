# Roadmap — Plan Rozwoju

> **Zasada:** Nie przechodzimy do kolejnej fazy dopóki poprzednia nie jest w 100% ukończona.

---

## Faza 0 — Planowanie i Setup ✅

- [x] Dokumentacja projektu (`docs/`) — OVERVIEW, BUSINESS, ARCHITECTURE, TESTING, API, DATABASE, DOCKER
- [x] Inicjalizacja repozytorium Git + push na GitHub → https://github.com/LalaSimon/Academy (prywatne)
- [x] Konfiguracja `.gitignore` — chroni .env, node_modules, dist, coverage, playwright-report
- [x] Ochrona brancha `main` — **włączona 2026-07-31** po upublicznieniu repo (wcześniej blokowana: `403 Upgrade to GitHub Pro` dla repo prywatnego). Wymagane zielone `API`, `Web`, `E2E`; `strict` (branch musi być zaktualizowany o `main` przed merge); force-push i kasowanie `main` zablokowane; `enforce_admins` obejmuje właściciela
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
- [x] Hooki — `useGroups`, `useGroup`, `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup`, `useAddStudentToGroup`, `useRemoveStudentFromGroup`, `useAddGroupSchedule`, `useRemoveGroupSchedule`, `useGenerateClasses`
- [x] `GroupsPage` — siatka kart, wyszukiwarka, paginacja
- [x] `GroupDetailPage` — lista uczniów; sekcja "Zajęcia w kalendarzu" (rzeczywiste Class records); sekcja "Szablon harmonogramu" (GroupSchedule slots + generowanie zajęć na miesiąc)
- [x] `GroupFormModal`
- [x] `GroupSchedule` model — wzorce cykliczne (dayOfWeek, startTime, durationMin, pricePerClass); wiele slotów = wiele dni w tygodniu

### 1.4 — Zajęcia ✅

- [x] `ClassesModule`
  - CRUD + `updateStatus` + bulk create (`POST /classes/bulk`) + bulk delete (`DELETE /classes/batch/:batchId`)
  - `PATCH /classes/batch/:batchId` — bulk edit serii: title, description, teacherId, durationMin, meetLink; `scheduledAtTemplate` przesuwa wszystkie daty proporcjonalnie (dayShift + nowa godzina)
  - Auto-fallback: `Class.teacherId` null → nauczyciel dziedziczony z grupy (spójność z listą i statystykami)
  - `Class.groupId` nullable — zajęcia mogą być grupowe lub indywidualne (1:1)
  - `Class.studentId` — nowe pole dla zajęć 1:1; auto-tworzy attendance + payment przy tworzeniu
- [x] 12 testów jednostkowych — `classes.service.spec.ts`
- [x] 12 testów integracyjnych — `test/classes.e2e-spec.ts`
- [x] Hooki — `useClasses`, `useClass`, `useCreateClass`, `useUpdateClass`, `useUpdateClassStatus`, `useDeleteClass`, `useCreateBulkClasses`, `useDeleteBatch`, `useUpdateBatch`
- [x] `ClassesPage` — przełącznik Kalendarz/Lista; zajęcia cykliczne grupowane w sekcje batchId z bulk-delete; usunięty przycisk "Cyklicznie" (zastąpiony przez GroupSchedule workflow)
- [x] `ClassFormModal` — toggle "Dla grupy / Dla ucznia (1:1)" przy tworzeniu; toggle "Tylko te zajęcia / Całą serię" dla edycji zajęć z batchId
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
- [x] 73 testy jednostkowe przechodzą (8 suite'ów) — *stan na koniec Fazy 1; aktualne liczby w sekcji „Stan testów" na końcu pliku*

**Cel Fazy 1:** Szkoła może działać operacyjnie — prowadzić zajęcia, zarządzać uczniami, zaznaczać obecność, zarządzać materiałami, rozliczać nauczycieli.

---

## Faza 2 — Płatności + Portal rodzica

### 2.0 — E2E (Playwright) ✅

- [x] `global.setup.ts` — seed DB (admin/teacher/student/group) + zapis storageState admina
- [x] `e2e/helpers/seed.js` — fixture'y przez Prisma (upsert, idempotentne)
- [x] `auth.spec.ts` — formularz logowania, błędne dane, redirect do /admin, ochrona tras, wylogowanie, sesja po reload
- [x] `classes.spec.ts` — lista zajęć, tworzenie klasy, zmiana statusu, modal obecności, toggle trybu grupowego/1:1
- [x] `registration.spec.ts` — rejestracja ucznia pełnoletniego (weryfikacja + login), blokada logowania przed weryfikacją, resend z banera, rejestracja rodzica + setup dziecka, login dziecka na `@academy.pl` (dodane w 3.6)
- [x] CI e2e job — postgres service, build API + start, build web + serve, wait-on, run Playwright, upload HTML report jako artifact
- **Stan: 19 testów E2E przechodzi** (auth + classes + registration)
- [ ] Testy E2E: proces płatności (mock bramki) — nadal niezrobione; wymaga mocka Stripe Checkout (redirect na zewnętrzną domenę)

### 2.1 — Płatności ✅

- [x] `PaymentsModule` — CRUD opłat (tworzenie pojedyncze + bulk dla grupy), statusy (PENDING/PAID/OVERDUE/REFUNDED/CANCELLED), paginacja, filtrowanie
- [x] Integracja Stripe Checkout — `POST /payments/:id/checkout` generuje sesję Stripe; webhook weryfikuje podpis i oznacza PAID
- [x] Ręczna zmiana statusu przez admina (Select w tabeli)
- [x] Auto-tworzenie płatności przy tworzeniu zajęć z ceną (dla grupy: wszyscy uczniowie; dla 1:1: pojedynczy uczeń)
- [x] Dashboard finansowy admina — karty statystyk (łącznie/zapłacone/zaległe/oczekujące), wykres słupkowy Recharts, tabela z paginacją, filtry
- [x] Strona płatności ucznia (`StudentPaymentsPage`) — podsumowanie pending/paid, tabela, przycisk Stripe Checkout
- [x] `PaymentFormModal` — tryb "dla ucznia" i "dla grupy (bulk)"
- [x] Hooki — `usePayments`, `usePaymentStats`, `useCreatePayment`, `useCreateBulkPayments`, `useUpdatePaymentStatus`, `useDeletePayment`, `useCheckoutPayment`
- [x] Fix bramki: `@IsUrl({ require_tld: false })` — localhost URL przechodzi walidację
- [x] Fix autoryzacji: `GET /payments` auto-filtruje po `req.user.id` dla STUDENT/PARENT; checkout sprawdza ownership
- [x] UX przepływu Stripe: redirect w tej samej zakładce (`window.location.href`), toast przed redirect, obsługa `?status=success|cancelled` po powrocie, `invalidateQueries` po 3s
- [x] Stripe CLI w Docker Compose (`stripe` service) — automatyczne forwarding webhooków na `http://api:3000/api/v1/payments/webhook/stripe`; `docker compose up -d` startuje cały stack w tym listener

### 2.2 — Portal ucznia ✅

- [x] `StudentLayout` — dedykowany sidebar z nawigacją ucznia (dashboard/zajęcia/frekwencja/grupy/materiały/płatności)
- [x] Dark/light mode toggle wspólny z AdminLayout (Zustand persist)
- [x] `StudentDashboardPage` — nadchodzące zajęcia (useQueries dla wielu grup), ring frekwencji SVG, stan płatności, przegląd grup
- [x] `StudentClassesPage` — zakładki Nadchodzące/Poprzednie/Wszystkie; multi-group fetch; link "Dołącz" do Meet
- [x] `StudentAttendancePage` — 4 karty statystyk, wykres per-grupę, historia
- [x] `StudentGroupsPage` — karty grup z language/level badge, nauczyciel, pojemność
- [x] `StudentMaterialsPage` — sekcje per-grupę, badge typu, download przez blob
- [x] `StudentPaymentsPage` — Stripe Checkout z poziomu portalu ucznia
- [x] `useStudentProfile` hook — `GET /users/:id` z danymi grup (reused across student pages)
- [x] Routing: `PrivateRoute allowedRoles=['STUDENT']` → StudentLayout → `/student/*`
- [x] API: `GET /users/:id`, `GET /classes`, `GET /attendance/student/:id`, `GET /groups/:id` otwarte dla STUDENT (z self-check)
- [x] Fix: zajęcia ucznia w wielu grupach — `useQueries` zamiast `useClasses({ groupId: groupIds[0] })`

### 2.3 — UX / Design ✅

- [x] Ciemny motyw (dark mode) — Tailwind `dark:` variant, klasa `dark` na `document.documentElement`; naprawia React portale (Dialog/Select/Popover)
- [x] Premium light mode — nowe `:root` CSS vars (oklch, violet-500 accent, off-white background)
- [x] Sun/Moon toggle w sidebarze z animacją obrotu (AnimatePresence)
- [x] Animacje przejść między stronami — `AnimatePresence initial={false}` + `key={location.key}`; brak migotania
- [x] Sidebar footer zawsze widoczny — `h-screen sticky top-0` na `<aside>`
- [x] Wszystkie modale zamienione z hardcoded `bg-gray-*` na semantyczne tokeny (`bg-muted`, `bg-card`, `border-border`)

### 2.4 — Uproszczenie modelu zajęć ✅

- [x] Usunięto przycisk "Cyklicznie" z ClassesPage — jeden spójny workflow: GroupSchedule → "Generuj zajęcia"
- [x] `GroupDetailPage` — "Zajęcia w kalendarzu" (Class records) oddzielone od "Szablon harmonogramu" (GroupSchedule)
- [x] Wskazówka UI: "Dwa terminy = 2x w tygodniu" przy pustym szablonie
- [x] Zajęcia 1:1 (`Class.groupId` nullable, `Class.studentId`) — migracja `add_individual_class_student`
- [x] `ClassFormModal` toggle "Dla grupy / Dla ucznia (1:1)" przy tworzeniu

**Cel Fazy 2:** Szkoła może działać operacyjnie finansowo. Uczniowie mają własny portal. Właściciel ma pełny wgląd.

---

## Faza 3 — Portal Rodzica + Typy Uczniów

### 3.1 — Model danych: uczeń pełnoletni vs. niepełnoletni ✅

- [x] Migracja: `User.isMinor: Boolean @default(false)` (`20260626083355_add_user_is_minor`)
- [x] Admin `UserFormModal` — typ konta przy tworzeniu (5-przyciskowy selector):
  - Nauczyciel / Uczeń pełnoletni / Uczeń niepełnoletni / Rodzic / Admin
  - Dla "Uczeń niepełnoletni": sekcja "Rodzic" — wybór istniejącego lub tworzenie nowego konta rodzica inline (jeden request = dwa konta + link)
- [x] `StudentLayout` ukrywa zakładkę "Płatności" gdy `user.isMinor = true`
- [x] API `POST /users` obsługuje `isMinor` + opcjonalne `parentData` / `existingParentId` (tworzy i linkuje rodzica w jednej transakcji)
- [x] `isMinor` w JWT response (`login`, `getMe`) + Zustand store + `AuthUser` interface
- [x] Testy jednostkowe: isMinor flag, linkowanie przez existingParentId, tworzenie nowego rodzica, konflikt emaila rodzica (99 testów łącznie *— stan na Fazę 3.1*)
- [x] CI fix: dummy `STRIPE_SECRET_KEY` w E2E job + `jest.mock('stripe')` w unit testach

### 3.2 — Portal rodzica ✅

- [x] `ParentLayout` — sidebar z listą dzieci, rozwijana nawigacja per-dziecko (Zajęcia/Frekwencja/Grupy/Materiały/Płatności)
- [x] `ParentDashboardPage` — karty dzieci z miniaturą płatności + nadchodzące zajęcia, klik przechodzi do widoku dziecka
- [x] `ParentChildClassesPage`, `ParentChildAttendancePage`, `ParentChildGroupsPage`, `ParentChildMaterialsPage`, `ParentChildPaymentsPage` — widoki per-dziecko
- [x] `ParentChildPaymentsPage` — Stripe Checkout z returnUrl `/parent/children/:id/payments?status=...`
- [x] API: PARENT role dodana do GET /users/:id, /classes, /groups/:id, /attendance/student/:id z weryfikacją parent-child
- [x] GET /payments dla PARENT — wymaga `studentId` dziecka w query, backend weryfikuje powiązanie
- [x] POST /payments/:id/checkout dla PARENT — weryfikacja przez powiązanie płatność→dziecko→rodzic
- [x] useParentProfile hook + useChildProfile hook
- [x] Fix: dashboard ucznia ukrywa sekcję płatności gdy `user.isMinor = true` (query disabled + sekcja ukryta)

### 3.3 — Administracja powiązań rodzic-dziecko ✅

- [x] `StudentProfilePage` (admin) — sekcja "Rodzic / Opiekun": wyświetla powiązanego rodzica z przyciskiem "Odłącz"; gdy brak — selektor istniejących rodziców + "Przypisz" (ostrzeżenie dla niepełnoletnich bez opiekuna)
- [x] `UsersTable` — kolumna "Rodzic" (tylko dla uczniów): badge z imieniem rodzica, "Brak rodzica" (amber) dla niepełnoletnich bez opiekuna, "Pełnoletni" dla dorosłych
- [x] `StudentsPage` / `UsersTable` — filtr toggle "Tylko niepełnoletni"
- [x] Backend: `findAll` zwraca relację `asStudent.parent`; filtr `isMinor` w `UserQueryDto` (`@Transform` + `@IsBoolean` — odrzuca nieprawidłowe wartości)
- [x] Hooki `useLinkParentStudent` / `useUnlinkParentStudent` (invalidacja `['users']`); endpointy link/unlink istniały od 3.1
- [x] Zweryfikowane na żywo (Playwright): filtr, badge, przypisanie i odłączenie rodzica z reaktywną aktualizacją

---

### 3.4 — Strona glowna (Landing Page) ✅

- [x] `LandingPage.tsx` — nowoczesny, ciemny landing page dla prywatnej szkoly jezykowej online
- [x] Hero z animowanym naglowkiem (rotating language + blur reveal) i floating bubbles
- [x] Sekcja statystyk (500+ uczniow, 8 językow, 4 lata, 97% poleca)
- [x] "Jak to dziala" — 3 kroki z ikonami i stagger reveal
- [x] Bento features — 4 kafle (male grupy z obrazem, elastyczne godziny, nagrania, materialy z obrazem)
- [x] Marquee z jezykami (jeden na strone)
- [x] Opinie uczniow — 3 karty z awatarami i ocenami
- [x] FAQ — accordion z AnimatePresence
- [x] CTA section z linkiem do `/login`
- [x] Footer z nawigacja i danymi kontaktowymi
- [x] Route `/` → `LandingPage` w `App.tsx`
- [x] Responsywnosc (hamburger menu, mobile collapse dla wszystkich sekcji)
- [x] prefers-reduced-motion support przez `useReducedMotion`

---

### 3.5 — Logowanie i obserwowalność backendu ✅

- [x] `RequestLoggerMiddleware` (`common/middleware/`) — globalny access-log każdego żądania HTTP
  - Loguje na `res.on('finish')`: metoda, URL, status, czas (ms), użytkownik (`email [ROLE]` lub `anon`)
  - Poziom dopasowany do statusu: `LOG` (2xx) / `WARN` (4xx) / `ERROR` (5xx)
  - Middleware działa PRZED guardami → łapie też odrzucenia auth (401/403), czego interceptor by nie zobaczył
  - Rejestracja globalna w `AppModule` przez `configure(consumer)` z `forRoutes({ path: '*path', method: RequestMethod.ALL })`
- [x] `AllExceptionsFilter` (`common/filters/`) — globalny filtr wyjątków
  - Loguje pełny stack trace dla błędów 5xx (nieobsłużone wyjątki) — wskazuje plik:linię źródła błędu
  - Rozszerza `BaseExceptionFilter` i deleguje do `super.catch()` → NIE zmienia kształtu odpowiedzi (zero ryzyka dla frontendu i e2e)
  - Rejestracja w `main.ts` z wstrzykniętym `httpAdapter` (`app.get(HttpAdapterHost)`)
- [x] Bugfix (wyłapany przez logi): `GET /payments/stats?from=<niepoprawna_data>` zwracał 500 zamiast 400
  - Endpoint przyjmował query przez inline typ zamiast klasy DTO → ValidationPipe nie walidował wejścia
  - Fix: `QueryStatsDto` z `@IsDateString()` na `from`/`to`; kontroler i serwis używają DTO
- [x] Bugfix: weryfikacja emaila zawieszała się na „Weryfikacja..." mimo 200 z backendu
  - Przyczyna: `useVerifyEmail` było mutacją wołaną w `useEffect`; React 19 StrictMode gubił obserwatora mutacji przy remoncie
  - Fix: zamiana mutacji na `useQuery` keszowany po `['verify-email', token]` (przeżywa podwójny mount); nawigacja przez efekt na `isSuccess`
  - Zweryfikowane na żywo (Playwright): sukces natychmiast → redirect do `/login` po 2s, backend trafiony raz

---

### 3.6 — Rejestracja publiczna, weryfikacja email i onboarding dziecka ✅

> Uzupełnione wstecznie 2026-07-31 podczas audytu — funkcjonalność była zaimplementowana i pokryta testami, ale nie miała wpisu w ROADMAP (wcześniej wspominana tylko mimochodem jako bugfix w 3.5).

- [x] Migracja `20260626120000_add_email_verification` — `emailVerified`, `emailVerificationToken` (unique), `emailVerificationExpiry`
- [x] `POST /auth/register` — samodzielna rejestracja; `accountType: 'student' | 'parent'` mapowany na rolę STUDENT/PARENT (admina i nauczyciela zakłada wyłącznie admin)
  - Token weryfikacyjny 32B hex, ważny 24 h; konto powstaje z `emailVerified: false`
  - Konflikt emaila → `ConflictException('EMAIL_TAKEN')`
- [x] `GET /auth/verify-email?token=` + `POST /auth/resend-verification` (brak enumeracji — zawsze `{ message: 'ok' }`)
- [x] **Login blokowany przed weryfikacją** — warunek `!emailVerified && !isMinor`; niepełnoletni są wyłączeni, bo `@academy.pl` to nie skrzynka
- [x] `POST /auth/setup-child` — rodzic zakłada konto dziecka po rejestracji
  - Login generowany automatycznie na domenie `CHILD_EMAIL_DOMAIN` (domyślnie `@academy.pl`), `isMinor: true`, `emailVerified: true` z automatu
  - Limit: jedno dziecko na rodzica (`CHILD_ALREADY_SET`) — do rozszerzenia gdy pojawi się case rodzeństwa
  - Dane logowania dziecka lecą mailem do RODZICA (`sendChildCredentials`)
- [x] **Mail do admina o nowej rejestracji** (`sendAdminNewRegistration`) — wysyłany gdy ustawiony `ADMIN_EMAIL`
- [x] Frontend: `RegisterPage`, `VerifyEmailPage`, `ParentSetupPage` (trasy publiczne), `useRegister` hook, baner „zweryfikuj email" z resendem na loginie
- [x] Testy: 42 jednostkowe frontendu (Vitest) + E2E `registration.spec.ts`

---

## Faza 4 — Rozszerzenia

### 4.1 — Powiadomienia email (uczeń pełnoletni + rodzic) ✅

- [x] `NotificationsService` (`modules/notifications/`) — centralizuje powiadomienia; deps Prisma + Mail (oba `@Global`)
- [x] **Routing odbiorcy:** niepełnoletni → email RODZICA (login dziecka @academy.pl to nie skrzynka), pełnoletni → własny adres. Helper `resolveRecipient`
- [x] Metody event-driven NIGDY nie rzucają wyjątku do wywołującego (błąd maila nie psuje logiki biznesowej)
- [x] **Potwierdzenie płatności** — webhook Stripe (`checkout.session.completed`) + ręczne oznaczenie PAID
- [x] **Nieobecność** — przy zapisie `ABSENT` w `attendance.bulkUpdate`; flaga `Attendance.absenceNotifiedAt` (idempotencja, reset przy zmianie statusu)
- [x] **Zaległość płatności** — w cronie `markOverdue` (pobiera przed update, powiadamia nowo zaległe)
- [x] **Przypomnienie o zajęciach (~30 min)** — cron co 5 min; flaga `Class.reminderSentAt`; uczniowie grupy + zajęcia 1:1
- [x] **Przypomnienie o płatności (termin <= 3 dni)** — cron dzienny; flaga `Payment.reminderSentAt`
- [x] **Dane logowania dziecka** — mail do rodzica po `setup-child`
- [x] **Reset hasła** — migracja (`passwordResetToken/Expiry`), endpointy `POST /auth/forgot-password` + `/auth/reset-password` (token 1h, unieważnia sesje, brak enumeracji emaili), szablon maila, frontend `ForgotPasswordPage` + `ResetPasswordPage` + link na loginie
  - **Reset hasła dziecka:** gdy login należy do niepełnoletniego (`@academy.pl` = nie skrzynka), link resetu idzie na email RODZICA (z kontekstem `forChildName`); token siedzi na koncie dziecka, więc resetuje hasło dziecka. Bez powiązanego rodzica — brak wysyłki
- [x] 3 nowe szablony HTML (zaległość, dane dziecka, reset) spójne z `baseLayout`
- [x] Testy: 14 nowych (routing odbiorcy, crony, reset hasła); zweryfikowane na żywo (reset end-to-end, potwierdzenie płatności, strony resetu)
- [x] **Powiadomienie admina o nowej rejestracji** — `sendAdminNewRegistration` na `ADMIN_EMAIL` (zaimplementowane w 3.6). To jedyny kanał admina i na razie wystarcza
- **Finansowe alerty dla admina — świadomie pominięte** (decyzja 2026-07-31). Rozważane były: nieudana płatność, narastające zaległości, dzienny digest. Brak realnego case'u — admin widzi te dane w panelu (`/admin/payments` + statystyki), a alert bez konkretnej akcji do podjęcia to tylko szum. Do rewizji dopiero przy skali, w której przeglądanie panelu przestanie wystarczać

### 4.2 — Powiadomienia in-app (dzwonek w navbarze) ✅

- [x] Moduł `notifications` (REST + polling co 45 s), dzwonek z licznikiem nieprzeczytanych w layoutach admina/ucznia/rodzica, panel z listą i „oznacz wszystkie"
- [x] **Podział odpowiedzialności** (po merge z 4.1): `InAppNotificationsService` = zapis/odczyt wierszy `Notification` (`create`/`createMany`/`notifyStudents`/`findAll`/`unreadCount`/`markRead`/`markAllRead`), `NotificationsService` = orkiestrator zdarzeń ucznia wołający OBA kanały (e-mail + in-app)
- [x] `NotificationsController` (GET `/notifications`, GET `/unread-count`, PATCH `/:id/read`, PATCH `/read-all`) scoped do zalogowanego usera przez `JwtAuthGuard`
- [x] Model `Notification` już w schemacie (z Fazy 0)
- [x] Triggery: `CLASS_CANCELLED` (anulowanie zajęć), `ATTENDANCE_ALERT` (nieobecność), `PAYMENT_REMINDER` (nowa płatność + zaległość + zbliżający się termin z crona), `CLASS_REMINDER` (cron co 5 min, ~30 min przed zajęciami)
- [x] `notifyStudents` powiadamia ucznia ORAZ powiązanych rodziców (dzwonek rodzica dostaje zdarzenia dziecka)
- [x] Zapis in-app jest niezależny od dostarczalności maila — niepełnoletni bez powiązanego rodzica i tak dostaje wpis in-app
- [x] Front: `useNotifications` (TanStack Query, polling licznika + invalidacja), `NotificationBell` (base-ui Popover, ikony/kolory per typ, relatywny czas)
- [x] Testy: jednostkowe `InAppNotificationsService` + `NotificationsService`; live (curl + Playwright): dzwonek + badge + panel + mark-all-read, triggery płatności i anulowania zajęć zweryfikowane end-to-end

### 4.3 — Raporty (eksport XLSX) ✅

- [x] Moduł `reports` (`modules/reports/`) — endpointy **ADMIN-only** generujące pliki Excel (exceljs)
- [x] `GET /reports/payments` — płatności z filtrami (status, grupa, zakres dat) + podsumowanie kwot wg statusu (RAZEM / Zapłacone / Zaległe / Oczekujące)
- [x] `GET /reports/attendance` — frekwencja per uczeń (grupa, zakres dat); % = (obecny + spóźniony) / razem
- [x] `GET /reports/students` — użytkownicy (rola, wiek, szukaj) z powiązaniem rodzic-dziecko
- [x] Wspólny builder `xlsx-builder.ts` — blok tytułowy, opis zastosowanych filtrów, nagłówek (biały na fioletowym, zamrożony), format walutowy/dat/procent, kolor tła statusu, wiersze podsumowania, auto-szerokość kolumn
- [x] DTO z walidacją (zły `from`/`to` → 400, brak admina → 401/403) — analogicznie do `QueryStatsDto`
- [x] Frontend: `ReportsPage` (3 karty z filtrami + „Generuj XLSX"), hook `useReportDownload` (pobranie blob + nazwa z `Content-Disposition`), trasa `/admin/reports` + link „Raporty" w nawigacji admina
- [x] Testy jednostkowe serwisu (4): agregacja płatności/frekwencji, mapowanie ról/wieku/rodzica, przełożenie filtrów na zapytanie Prisma
- [x] Zweryfikowane na żywo: curl (200 + XLSX, 400 zły date, 401 bez auth) oraz Playwright (render 3 kart + realne pobranie pliku)

### 4.4 — Date-picker (shadcn/react-day-picker) ✅

- [x] `DatePicker` (`components/ui/date-picker.tsx`) + `calendar.tsx` + `popover.tsx` — zastępuje natywne `<input type="date">`
- [x] Wdrożony w `ClassFormModal`, `PaymentFormModal`, `GroupDetailPage`, `StudentProfilePage`, `TeacherProfilePage`, `ReportsPage`
- [x] Fix: kalendarz renderowany w portalu (Popover) nie rozpycha już formularza po otwarciu

### ⚠ Znane luki (wykryte w audycie 2026-07-31)

- [x] ~~**Portal nauczyciela — NIE ISTNIEJE**~~ — zamknięte 2026-07-31, patrz Faza 5
- [x] ~~Testy E2E procesu płatności (z 2.0)~~ — zamknięte 2026-07-31: `e2e/payments.spec.ts` (4 testy). Dane zakłada API, bo formularz używa DatePickera w popoverze, a celem jest proces płatniczy, nie obsługa kalendarza. **Test wykrył realny defekt**: Select statusu pokazywał `PAID` zamiast `Zapłacone` — ten sam błąd `@base-ui Select.Value`, który naprawiono wcześniej w `ReportsPage`. Sam redirect do Stripe pozostaje poza pokryciem (zewnętrzna domena)
- [~] Testy jednostkowe frontendu: **65 testów w 6 plikach** (było 42 w 4). Dodane `PaymentsPage` (12 — arytmetyka kwot na wykresie, filtr, `confirm` przy usuwaniu, powrót ze Stripe) i `TeacherClassesPage` (11 — podział na zakładki, przejścia statusów, zajęcia odwołane). Nadal bez pokrycia: panele grup, materiałów, użytkowników oraz dashboardy ucznia i rodzica
- [x] ~~Testy frontendu poza obowiązkowym flow~~ — naprawione 2026-07-31: `npm test` w `apps/web` dodany jako krok 5 w `CLAUDE.md`. Przy okazji poprawiony skrypt, który uruchamiał Vitest w trybie **watch** (`vitest` zamiast `vitest run`) — dlatego lokalnie nikt go nie wołał, bo wieszał terminal. CI łapało te testy od początku (`npx vitest run`), więc realny koszt był taki, że o awarii dowiadywano się dopiero po pushu
- [x] ~~Testy integracyjne API nie są uruchamiane w CI~~ — naprawione 2026-07-31 (job `api`, krok „Integration tests"). **Przy okazji okazało się, że były zepsute: 38 z 45 failowało.** Regresja z Fazy 3.6 — login zaczął odrzucać konta z `emailVerified: false`, a testy tworzą userów bezpośrednio przez Prisma z domyślnym `false`, więc `beforeAll` nie dostawał tokenu i cały suite leciał na 401. Nikt tego nie zauważył, bo testy nie były ani we flow, ani w CI. Dodatkowo naprawiona idempotencja `users.e2e-spec` (cleanup pomijał `delete.me@` i `parent.link@`, więc drugie uruchomienie na tej samej bazie padało na unique(email))
- [x] ~~CI nie odpalało się na feature branchach~~ — naprawione 2026-07-31: trigger `push: branches: ["**"]` + `concurrency` z `cancel-in-progress`. Wcześniej `on.push` był ograniczony do `main`, więc pushe na branche nie uruchamiały **niczego** aż do otwarcia PR
- [x] ~~Brak warstwy wymuszającej flow~~ — dodany `.githooks/pre-push` (kroki 1-6, bez E2E i integracyjnych, które wymagają Dockera); aktywowany automatycznie przez `prepare` → `core.hooksPath`
- [x] ~~Branch protection niedostępne~~ — zamknięte 2026-07-31: repo upublicznione, ochrona `main` włączona (szczegóły w Fazie 0). Odblokowało też darmowe dla repo publicznych: **secret scanning + push protection** (GitHub blokuje push zawierający sekret) oraz **Dependabot alerts + automated security fixes**. Minuty Actions przestały być limitowane, więc CI na każdym pushu nic nie kosztuje
- [x] **Podatności zależności — 12 → 6** (2026-07-31). Naprawione przez celowe podniesienie dwóch bezpośrednich zależności (`@nestjs/platform-express` 11.1.27→11.1.28, `vite` 8.1.0→8.2.0) i `npm update` trzech tranzytywnych. Zamknięte: **multer** (DoS przy uploadzie — jedyna podatność na ścieżce przyjmującej dane od użytkownika), **postcss** (path traversal), **fast-xml-parser** (przez `minio`, też runtime), **js-yaml**, **fast-uri**
  - ⚠ `npm audit fix` jest tu **szkodliwe** — podbija liczbę podatności z 12 do 32 (kaskada przez `brace-expansion`). Nie używać; podnosić zależności celowo
  - Po scaleniu 4.3 doszedł `uuid@8.3.2` (moderate) — zapinowany przez `exceljs@4.4.0` (najnowszy), więc bez podniesienia `exceljs` nie da się go ruszyć; dotyczy generowania plików po stronie serwera
  - **Druga tura (2026-07-31): 8 → 5.** `npm update` domknął `@hono/node-server` (przez CLI `shadcn`) i `esbuild` → 0.28.1. Zamknęło to PR-y Dependabota #7 i #11
  - **Pozostałe 3, świadomie nienaprawione**, wszystkie poza ścieżką produkcyjną: `react-router` (tryb RSC, którego SPA nie używa; łatka dopiero w v8, a `react-router-dom` nie ma linii 8.x — wymaga migracji majora), `brace-expansion` (dev-tooling; w drzewie 3 równoległe majory, `npm update` wywołuje kaskadę do 32 podatności), `uuid` (zapinowany przez `exceljs`)
- [x] Higiena sekretów zweryfikowana przed upublicznieniem (2026-07-31): `.env` nigdy nie był w historii, brak kluczy Stripe/Resend w commitach, brak plików `.pem`/`.key`, `.env.example` zawiera wyłącznie placeholdery

---

## Faza 5 — Portal nauczyciela i bezpieczeństwo

### 5.1 — Layout, zajęcia i rozliczenie godzin ✅

Zamyka najpoważniejszą lukę z audytu: `/teacher` był placeholderem `<div>Teacher Dashboard — WIP</div>`, więc jedna z trzech ról produktowych nie miała UI mimo gotowego backendu.

**Backend — scoping (bezpieczeństwo):**
- [x] `GET /classes` **nie filtrował po nauczycielu w ogóle** — `findAll` przyjmował tylko `groupId`/`studentId`/`status`, więc portal pokazywałby cudze zajęcia. Dodany `teacherId` w `ClassQueryDto` + gałąź `OR` w `where`
- [x] Gałąź `OR: [{ teacherId }, { teacherId: null, group: { teacherId } }]` — ten sam wzorzec co `getTeacherStats`; bez niej nauczyciel nie zobaczyłby zajęć odziedziczonych po grupie (`Class.teacherId` bywa null)
- [x] Kontroler **nadpisuje** `teacherId` z query wartością `req.user.id` dla roli TEACHER — filtra nie da się obejść parametrem w URL-u
- [x] `GET /users/:id/stats` otwarte dla TEACHER z self-checkiem (`ForbiddenException` przy cudzym id); wcześniej całe `UsersController` było ADMIN-only
- [x] 3 testy jednostkowe weryfikujące strukturę `WHERE` (gałęzie OR, łączenie z innymi filtrami, brak scope'u bez `teacherId`)

**Frontend:**
- [x] `TeacherLayout` — sidebar w konwencji pozostałych layoutów, z dzwonkiem powiadomień i przełącznikiem motywu
- [x] `TeacherDashboardPage` — zajęcia na dziś, najbliższe 5, skrót statystyk z 30 dni
- [x] `TeacherClassesPage` — zakładki Nadchodzące/Poprzednie/Wszystkie, przyciski „Rozpocznij"/„Zakończ", modal obecności (reużyty `AttendanceModal`), link do Meet
- [x] `TeacherStatsPage` — rozliczenie godzin z filtrem okresu, rozbicie miesięczne i na grupy
- [x] Routing `/teacher/*` zamiast placeholdera; redirect po logowaniu (`TEACHER → /teacher`) już istniał

**Naprawiony przy okazji:** `AnimatePresence` bez `mode="wait"` montował nowy widok, zanim stary zniknął — przez moment renderowały się **dwie kopie strony**. Wykrył to niestabilny test E2E; naprawiona przyczyna, nie test. **Ten sam wzorzec jest nadal w `AdminLayout`, `StudentLayout` i `ParentLayout`** — do poprawy osobno.

- [x] 5 testów E2E (`e2e/teacher.spec.ts`): redirect po logowaniu, nawigacja, lista zajęć, rozliczenie godzin, brak dostępu do panelu admina. Stabilność potwierdzona trzema przebiegami
- [x] Zweryfikowane na żywo (curl): nauczyciel widzi 39 zajęć, admin 66; podanie cudzego `teacherId` w URL nie zmienia wyniku; własne statystyki 200, cudze 403

**Do zrobienia dalej:** widok materiałów i listy uczniów grupy w portalu nauczyciela (backend gotowy po 5.2–5.3).

### 5.2 — Kontrola dostępu w warstwie odczytu ✅

Audyt przy okazji portalu nauczyciela wykazał, że `@Roles()` przepuszczał **rolę**, ale nikt nie sprawdzał, **czyj** jest zasób.

**Co przeciekało (potwierdzone realnymi żądaniami, nie teorią):**
- `GET /groups/:id` → uczeń pobierał **dowolną** grupę razem z imionami, nazwiskami i **e-mailami** jej uczniów (dane osobowe)
- `GET /classes` → uczeń i rodzic dostawali **harmonogram całej szkoły** (69 z 69 zajęć)
- `GET /materials/group/:id` → materiały dowolnej grupy

**Rozwiązanie:** `AccessControlService` (`common/access/`, `@Global` jak Prisma) — jedno miejsce odpowiadające na pytanie „do czyich danych ten użytkownik ma prawo zajrzeć", zamiast kopiowania self-checków do kolejnych kontrolerów.
- `getAccessibleGroupIds` — `null` dla admina (bez ograniczeń), celowo różne od `[]` („żadne")
- `assertCanReadGroup` — rzuca 403; nauczyciel prowadzący pojedyncze zajęcia grupy też ma dostęp, choć nie jest do niej przypisany
- `GET /classes` dla ucznia/rodzica: `AND` z `OR: [groupId in …, studentId in …]` — **zajęcia 1:1 nie mają `groupId`**, więc sam filtr po grupach by je zgubił
- Warunki przeniesione z `OR` na `AND`, żeby scope nauczyciela i ucznia się nie nadpisywały
- `GET /groups` zawężone dla nauczyciela (nadpisanie `teacherId` z query)

**Naprawiony przy okazji bug funkcjonalny:** `GET /materials/group/:id` nie miał roli `PARENT`, choć portal rodzica woła ten endpoint od Fazy 3.2 — zakładka „Materiały" dziecka zwracała 403.

- [x] 13 testów jednostkowych `AccessControlService` + 3 na strukturę `WHERE` w `classes`
- [x] 7 testów E2E (`e2e/access-control.spec.ts`) — cudze zasoby zwracają 403, własne 200, `teacherId` z URL-a nie zmienia widoczności
- [x] Zweryfikowane na żywo dla wszystkich ról: uczeń (własna grupa 200 / cudza 403, zajęcia 55 z 70), rodzic (grupa i materiały dziecka 200, cudza 403, zajęcia 43 z 70), nauczyciel (1 grupa z 3, 42 zajęcia z 70), admin bez zmian
- [x] Sprawdzone, że uczeń nie stracił zajęć 1:1 (utworzone i zweryfikowane na żywo)

### 5.3 — Kontrola dostępu: zapis i materiały ✅

Pytanie „czy jest już szczelne?" skłoniło do przeglądu **wszystkich** endpointów dostępnych dla ról nie-admin. 5.2 naprawiła trzy miejsca, do których doprowadził pierwszy trop; ten przegląd znalazł kolejne — w tym **operacje zapisu**, groźniejsze od odczytu, bo mają skutki uboczne.

**Zapis (najpoważniejsze):**
- [x] `PATCH /classes/:id/status` — nauczyciel mógł **odwołać cudze zajęcia**, co dodatkowo rozsyłało powiadomienia uczniom obcej grupy
- [x] `PATCH /attendance/bulk` — mógł zapisać frekwencję na cudzych zajęciach (oznaczenie nieobecności wysyła mail i powiadomienie)

**Odczyt:**
- [x] `GET /payments/:id` — uczeń widział **cudzą płatność** (kwota, opis, dane). Lista miała self-check od 2.1, pojedyncza płatność nie
- [x] `GET /payments` — **nauczyciel widział finanse całej szkoły**; rola `TEACHER` usunięta z płatności (brak przypadku użycia, zasada najmniejszych uprawnień)
- [x] `GET /materials`, `/materials/:id`, `/materials/:id/file` — dostęp do dowolnego materiału i pobranie pliku; biblioteka filtrowana przez `isPublic` / grupy / zajęcia / własne wgranie (nauczyciel)
- [x] `GET /materials/class/:classId`, `GET /classes/:id`, `GET /attendance?classId` — scope zajęć

`AccessControlService` rozszerzony o `assertCanAccessClass` (używane też przy zapisie), `assertCanReadMaterial` i `getAccessibleClassIds`.

- [x] 24 testy jednostkowe serwisu (było 13)
- [x] 13 testów E2E (było 7) — osobno dla zapisu i odczytu
- [x] Zweryfikowane na żywo: wszystkie osiem dziur zwraca 403, a własne zasoby nadal 200 (nauczyciel: własne zajęcia i frekwencja, uczeń: 7 materiałów, 2 płatności, własna płatność po `id`)

### 5.4 — Security review całego API ✅

Systematyczny przegląd `apps/api/src` (nie diff — audyt na czystym `main`), zamiast podążania za pojedynczym tropem jak w 5.2–5.3.

**Znaleziony 1 problem, naprawiony:**
- [x] **Fail-open weryfikacji webhooka Stripe** — `process.env.STRIPE_WEBHOOK_SECRET ?? ''`. Bez ustawionej zmiennej podpis byłby weryfikowany **kluczem pustym**, możliwym do odtworzenia przez każdego → dowolna płatność do oznaczenia jako `PAID` bez przepływu pieniędzy. Zamienione na `config.getOrThrow()` (ten sam wzorzec co `JWT_SECRET`); przy okazji tak samo dla `STRIPE_SECRET_KEY`. Test jednostkowy pilnuje, że oba idą przez `getOrThrow`

**Sprawdzone, bez zastrzeżeń:** eskalacja uprawnień (`PATCH/DELETE /users/:id` są ADMIN-only, brak możliwości zmiany własnej roli) · rola czytana **z bazy** przy każdym żądaniu, nie z payloadu JWT (degradacja i dezaktywacja działają natychmiast) · rotacja refresh tokenów (64B losowe, jednorazowe) · reset hasła (token 32B, 1 h, kasuje wszystkie sesje, brak enumeracji e-maili) · cookie `httpOnly`/`sameSite`/`secure` · CORS na konkretny origin · kwota checkoutu brana z bazy, nie z żądania · replay webhooka idempotentny · `fileKey` nigdy z parametru żądania · `Content-Disposition: attachment` blokuje XSS z uploadu · `passwordHash` poza wszystkimi `select` · brak `$queryRaw`

**Świadomie nieraportowane:** open redirect przez `returnUrl` (ofiarą może być tylko sam wywołujący), `Content-Type` z klienta (zneutralizowany przez `attachment`), warunkowe sprawdzanie wygaśnięcia tokenu resetu (stan nieosiągalny — oba pola zawsze ustawiane razem).

**Poza zakresem:** infrastruktura (MinIO, sieć Dockera), zależności third-party (Dependabot), rate limiting i DoS.

### 5.5 — Utwardzenie pod produkcję ✅

Cztery pozycje wskazane po security review jako „potrzebne przed publikacją", nie będące podatnościami w kodzie, ale realnym ryzykiem na produkcji.

- [x] **Rate limiting na endpointach auth** (`@nestjs/throttler`). Guard **nie jest globalny** — celuje tylko w auth, żeby nie dławić normalnego korzystania z aplikacji. Dwie niezależne pule:
  - `auth` (10/min) — `login`, `reset-password`: brute force hasła i zgadywanie tokenu
  - `mail` (3/min) — `register`, `resend-verification`, `forgot-password`: bez tego endpoint działa jak **otwarty relay** na cudze adresy przez nasze konto Resend
  - Zweryfikowane na żywo: przy limicie 2/min trzecie żądanie dostaje `429`, a pule działają niezależnie od siebie
  - `AUTH_THROTTLE_LIMIT` / `MAIL_THROTTLE_LIMIT` podniesione do 1000 w `docker-compose.yml` i w jobie E2E — zestaw testów loguje się kilkanaście razy z jednego IP. **Produkcja nie ustawia tych zmiennych** i zostaje przy wartościach z kodu
- [x] **Domyślne hasła infrastruktury usunięte** — `${POSTGRES_PASSWORD:-academy}` i `${MINIO_ROOT_PASSWORD:-minioadmin}` zamienione na `:?`. Dokładnie ten sam wzorzec fail-open co przy sekrecie Stripe (5.4): brak zmiennej cicho podstawiał znane hasło. Teraz compose odmawia startu z czytelnym komunikatem — zweryfikowane przez tymczasowe usunięcie zmiennej z `.env`
- [x] **E-maile znikają z logów** — `RequestLoggerMiddleware` logował adres użytkownika przy każdym żądaniu. Zamienione na `id`: do diagnostyki wystarcza, a logi wędrują dalej niż baza
- [x] **Nagłówki bezpieczeństwa** (`helmet`) — `X-Frame-Options`, `nosniff`, HSTS potwierdzone na żywo. `nosniff` domyka wektor uploadu, który dotąd trzymał się wyłącznie na `Content-Disposition`. CSP wyłączone: API zwraca JSON i pliki, nie HTML

**Pozostaje przed publikacją** (poza zakresem tej zmiany): porty `5432`/`6379`/`9000`/`9001` są mapowane na hosta — w dev wygodne, na produkcji baza, Redis i storage nie powinny być publiczne; sekrety w GitHub Actions; kopie zapasowe i szyfrowanie w spoczynku; przegląd frontendu.

### 5.6 — Portal nauczyciela: grupy i materiały ✅

Domyka rolę nauczyciela. Backend był gotowy po 5.2–5.3 (scoping `GET /groups`, `assertCanReadGroup`, `GET /materials/group/:id` z rolą TEACHER), więc doszła wyłącznie warstwa UI.

- [x] `TeacherGroupsPage` — karty grup prowadzonych przez zalogowanego nauczyciela: liczba uczniów wobec limitu, język i poziom, harmonogram
- [x] `TeacherGroupDetailPage` — lista uczniów z danymi kontaktowymi, harmonogram z nazwami dni, materiały grupy
- [x] **Reużyty `MaterialsPanel`** zamiast pisania własnego — nauczyciel ma uprawnienia do uploadu i przypinania materiałów (`@Roles(ADMIN, TEACHER)`), więc dostaje pełną funkcjonalność bez duplikowania kodu
- [x] Trasy `/teacher/groups` i `/teacher/groups/:groupId` + pozycja w nawigacji
- [x] Strona pokazuje czytelny komunikat, gdy backend odmówi dostępu (403 na cudzą grupę), zamiast pustego szkieletu
- [x] 7 testów jednostkowych (`TeacherGroupDetailPage`) + 2 E2E
- [x] Zweryfikowane realnym żądaniem per rola (zgodnie z regułą 8 z `CLAUDE.md`): nauczyciel widzi 1 grupę z 3, własna grupa i jej materiały 200, cudza grupa i jej materiały **403**

### 5.7 — Automatyczne linki Google Meet ✅

**Uwaga: połowa tej funkcji już istniała.** `Class.meetLink` był w modelu od Fazy 1, a przycisk „Dołącz" renderował się we wszystkich czterech portalach (nauczyciel, uczeń — `SCHEDULED` i `ONGOING`, rodzic — `SCHEDULED`, admin). Brakowało wyłącznie **automatycznego generowania** — link wpisywał ręcznie admin.

- [x] `GoogleCalendarService` (`modules/google/`, `@Global`) — OAuth2 + refresh token. Meet nie pozwala zbudować linku z identyfikatora; jedyna droga to wydarzenie w Kalendarzu z `conferenceData`, skąd Google odsyła `hangoutLink`. **Service account nie zadziała** bez Workspace z domain-wide delegation
- [x] Integracja **opcjonalna i domyślnie wyłączona** (`GOOGLE_CALENDAR_ENABLED`). Dopiero po włączeniu wymagany jest komplet sekretów przez `getOrThrow` — połowicznie skonfigurowana integracja ma zatrzymać start, a nie „prawie działać"
- [x] Ręcznie wpisany link ma **pierwszeństwo** — admin może wskazać Zoom albo stały pokój
- [x] `createMeetLink` **nigdy nie rzuca**: gdy Google odmówi, zajęcia powstają bez linku, a błąd trafia do logów. Brak linku nie może zablokować utworzenia lekcji
- [x] Działa dla zajęć pojedynczych i całych serii (`POST /classes/bulk`) — każde zajęcia dostają własne spotkanie
- [x] 9 testów jednostkowych + instrukcja konfiguracji w `docs/GOOGLE_MEET.md`

⚠ **Niezweryfikowane na żywo:** brak credentials Google, więc prawdziwe wywołanie do Calendar API nie zostało wykonane. Przetestowane jest wszystko poza nim: zachowanie z wyłączoną integracją (na żywo — zajęcia powstają, aplikacja startuje), pierwszeństwo ręcznego linku (na żywo), oraz kształt żądania, obsługa błędów i wymóg sekretów (testy z zamockowanym `googleapis`). **Pierwsze włączenie wymaga sprawdzenia, czy Google faktycznie zwraca `hangoutLink`.**

### 5.8 — Meet: pełny cykl życia ✅

Analiza flow tworzenia zajęć wykazała, że 5.7 pokryła **niewłaściwe ścieżki**: integracja działała dla zajęć pojedynczych (żywa ścieżka) i `bulk` (**martwa** — `RecurringClassModal` nie jest podpięty do żadnej strony od Fazy 2.4), a **pomijała generowanie z harmonogramu** — czyli sposób, w jaki powstaje większość zajęć.

- [x] Migracja `add_class_google_event_id` — `Class.googleEventId`; bez niego nie da się wskazać wydarzenia do zmiany ani usunięcia
- [x] `ClassCalendarService` (`modules/google/`, `@Global`) — jedno miejsce utrzymujące kalendarz w zgodzie z zajęciami. Ten sam wzorzec co `AccessControlService`: logika w jednym serwisie, żeby kolejne miejsce tworzące zajęcia nie musiało jej odkrywać od nowa
- [x] `GoogleCalendarService` rozszerzony o `updateEvent` i `deleteEvent`; `createEvent` zwraca teraz **link ORAZ id**
- [x] **Osiem ścieżek pokrytych:** `create`, `createBulk`, **`groups.generateClasses`**, `update`, `updateBatch`, `updateStatus(CANCELLED)`, `remove`, `removeBatch`
- [x] `detach` woła się **przed** usunięciem zajęć — potem nie ma skąd wziąć `googleEventId`
- [x] Zasada bez zmian: Google **nigdy nie blokuje** operacji w Academy; nieudana synchronizacja trafia do logów
- [x] 24 testy jednostkowe (13 klienta + 11 warstwy domenowej)

**Zweryfikowane na żywo, na prawdziwym kalendarzu** (mamy działające credentials):
- generowanie z harmonogramu → 4 zajęcia, każde z własnym linkiem i `googleEventId`
- zmiana terminu → wydarzenie przesunięte w Google (`2026-11-06T21:00+01:00`)
- odwołanie → `status = cancelled` w Google, powiązanie wyczyszczone w bazie
- usunięcie → wydarzenie usunięte

Synchronizacja jest **jednokierunkowa** (Academy → Kalendarz). Dwukierunkowa wymagałaby webhooków Google i rozstrzygania konfliktów — nieproporcjonalne przy jednoosobowej szkole.

**Hotfix 5.8.1** — zgłoszone przez właściciela: zajęcia utworzone przez formularz nie miały linku. Przyczyna: `create` ma **dwa wyjścia** (gałąź grupowa i 1:1), a zmiana z 5.8 objęła tylko drugie. Zajęcia 1:1 i generowane z harmonogramu działały, grupowe nie — czyli najczęstszy przypadek. Przy okazji:
- `update` woła teraz `attach`, więc zajęcia sprzed włączenia integracji dostają link przy edycji (`attach` sam pomija te, które link już mają)
- `create` i `update` zwracają dane odczytane **po** dopięciu spotkania, żeby front dostał link od razu w odpowiedzi
- testy regresyjne na **obie** gałęzie `create` oraz na uzupełnianie przy edycji

### Pozostałe rozszerzenia (przyszłość)

- [ ] Zadania domowe (upload, ocenianie)
- [ ] Testy poziomujące (quiz builder)
- [ ] Tracking postępów ucznia
- [ ] Raporty: dodatkowe typy + eksport PDF
- [ ] Aplikacja mobilna (React Native lub PWA)
- [ ] Czat wewnętrzny (nauczyciel ↔ uczeń)

---

## ▶ Co robimy teraz?

**Fazy 1–5 zamknięte.** Wszystkie trzy role produktowe mają UI, kontrola dostępu przeszła systematyczny audyt, aplikacja jest utwardzona pod produkcję.

**Publikacja NIE jest jeszcze planowana** — przed nami kolejny etap developmentu. Przygotowania wdrożeniowe robimy zawczasu, żeby sam deploy był formalnością (patrz „Przygotowanie do produkcji" niżej).

**Portal nauczyciela domknięty (5.6).** Następne do wyboru — produkt:
1. **Zadania domowe** (upload + ocenianie) — pierwszy naprawdę nowy obszar produktowy
2. **Tracking postępów ucznia**


**Następne do wyboru — jakość:**
- Testy jednostkowe paneli bez pokrycia: grupy, materiały, użytkownicy, dashboardy ucznia i rodzica (dziś 65 testów w 6 plikach, wszystkie z `pages/auth`, `PaymentsPage` i `TeacherClassesPage`)
- Migracja `react-router` v7 → v8 — zamknęłaby 2 z 3 pozostałych alertów Dependabota. **Nadal odradzana**: major z realną pracą na routingu, a podatność dotyczy trybu RSC, którego to SPA nie używa

---

## Przygotowanie do produkcji

Stan na 2026-08-02. Publikacja nieplanowana — lista istnieje po to, żeby wdrożenie było mechaniczne, gdy przyjdzie moment.

### Zrobione

- [x] Rate limiting na endpointach auth (5.5)
- [x] Brak domyślnych haseł w `docker-compose.yml` — compose odmawia startu bez konfiguracji (5.5)
- [x] Nagłówki bezpieczeństwa (helmet), e-maile poza logami (5.5)
- [x] Sekrety przez `getOrThrow` — aplikacja nie wstanie z pustym kluczem (5.4)
- [x] Kontrola dostępu na wszystkich endpointach nie-admin, z regresją w E2E (5.2–5.3)
- [x] Ochrona `main` + secret scanning + Dependabot (Faza 0)

### Do zrobienia przed pierwszym wdrożeniem

- [ ] **Usunąć Redis** — stoi w `docker-compose.yml` i `.env`, ale w kodzie API **nie ma ani jednego odwołania**. Martwa zależność: zbędny RAM, kolejny kontener do aktualizowania
- [ ] **`docker-compose.prod.yml`** — bez mapowania `5432`/`9000`/`9001` na hosta (baza i storage nie mogą być publiczne), `restart: always`, bez volume mountów na `src/`
- [ ] **Reverse proxy z TLS** (Caddy — automatyczny Let's Encrypt) przed API i web
- [ ] **Webhook Stripe na produkcji** — dziś w compose działa `stripe listen --skip-verify` (tryb dev). Potrzebny endpoint zarejestrowany w dashboardzie Stripe i `STRIPE_WEBHOOK_SECRET` stamtąd
- [ ] **Backup bazy + przetestowany restore** — `pg_dump` w cronie **systemowym** (nie w API) z wysyłką poza serwer. Backup, którego nie odtworzono, nie jest backupem. To największe ryzyko operacyjne całego wdrożenia
- [ ] `FRONTEND_URL` i CORS na prawdziwą domenę
- [ ] Sekrety w GitHub Actions (jeśli deploy ma iść z CI)

### ⚠ Ograniczenie architektoniczne: crony blokują skalowanie poziome

Cztery `@Cron` działają **wewnątrz procesu API** (`payments.service`: `markOverdue`, cykl miesięczny; `notifications.service`: przypomnienia o zajęciach co 5 min i o płatnościach dziennie).

**API musi działać w dokładnie jednej instancji.** Druga instancja = uczniowie dostają maile i powiadomienia po dwa razy. Awaria trudna do zdiagnozowania, bo objawia się u użytkowników, nie w logach.

Jeśli kiedyś potrzebne będzie skalowanie: wydzielić crony do osobnego procesu (worker) albo wprowadzić blokadę rozproszoną — **wtedy** Redis, dziś nieużywany, nabrałby sensu.

### Rekomendowany kierunek wdrożenia

**VPS + Docker Compose** (Hetzner CX22 lub odpowiednik, ~5 EUR/mies.), Caddy z automatycznym TLS.

Uzasadnienie: obecny compose działa 1:1 bez przepisywania, jedna instancja jest stanem naturalnym (patrz crony wyżej), MinIO zostaje bez zmian w `MinioService`, koszt przewidywalny. PaaS (Railway/Render) wymagałby wymiany MinIO na S3/R2 i twardego pilnowania liczby instancji.

Rozważyć **managed Postgres** (Neon, Supabase) zamiast kontenera — zdejmuje backupy, czyli największe ryzyko solo-deploymentu.

## Stan testów (2026-08-02)

| Zestaw | Liczba | Komenda | We flow | W CI |
|---|---|---|---|---|
| API — jednostkowe (15 suite'ów) | 208 | `cd apps/api && npm test` | ✅ | ✅ |
| API — integracyjne (5 spec) | 45 | `cd apps/api && npm run test:e2e` | ❌ (Docker) | ✅ |
| Web — jednostkowe (7 plików, Vitest) | 72 | `cd apps/web && npm test` | ✅ | ✅ |
| E2E — Playwright (6 spec) | 42 | `npx playwright test` | ❌ (Docker) | ✅ |

**Razem 367 testów, wszystkie w CI.** Testy integracyjne (`test/*.e2e-spec.ts`) mają osobny config i nie wchodzą w skład `npm test` — wymagają `docker compose -f docker-compose.test.yml up -d` (postgres na 5433, tmpfs) i migracji. Poza flow lokalnym trzymają je wyłącznie wymagania Dockera; w CI biegną przy każdym pushu.
