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
- [x] 73 testy jednostkowe przechodzą (8 suite'ów)

**Cel Fazy 1:** Szkoła może działać operacyjnie — prowadzić zajęcia, zarządzać uczniami, zaznaczać obecność, zarządzać materiałami, rozliczać nauczycieli.

---

## Faza 2 — Płatności + Portal rodzica

### 2.0 — E2E (Playwright) ✅

- [x] `global.setup.ts` — seed DB (admin/teacher/student/group) + zapis storageState admina
- [x] `e2e/helpers/seed.js` — fixture'y przez Prisma (upsert, idempotentne)
- [x] `auth.spec.ts` — formularz logowania, błędne dane, redirect do /admin, ochrona tras, wylogowanie, sesja po reload
- [x] `classes.spec.ts` — lista zajęć, tworzenie klasy, zmiana statusu, modal obecności, toggle trybu grupowego/1:1
- [x] CI e2e job — postgres service, build API + start, build web + serve, wait-on, run Playwright, upload HTML report jako artifact
- [ ] Testy E2E: proces płatności (mock bramki) — do dodania po Fazie 2.1

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
- [x] Testy jednostkowe: isMinor flag, linkowanie przez existingParentId, tworzenie nowego rodzica, konflikt emaila rodzica (99 testów łącznie)
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

## Faza 4 — Rozszerzenia

### 4.1 — Raporty (eksport XLSX) ✅

- [x] Moduł `reports` (`modules/reports/`) — endpointy **ADMIN-only** generujące pliki Excel (exceljs)
- [x] `GET /reports/payments` — płatności z filtrami (status, grupa, zakres dat) + podsumowanie kwot wg statusu (RAZEM / Zapłacone / Zaległe / Oczekujące)
- [x] `GET /reports/attendance` — frekwencja per uczeń (grupa, zakres dat); % = (obecny + spóźniony) / razem
- [x] `GET /reports/students` — użytkownicy (rola, wiek, szukaj) z powiązaniem rodzic-dziecko
- [x] Wspólny builder `xlsx-builder.ts` — blok tytułowy, opis zastosowanych filtrów, nagłówek (biały na fioletowym, zamrożony), format walutowy/dat/procent, kolor tła statusu, wiersze podsumowania, auto-szerokość kolumn
- [x] DTO z walidacją (zły `from`/`to` → 400, brak admina → 401/403) — analogicznie do `QueryStatsDto`
- [x] Frontend: `ReportsPage` (3 karty z filtrami + „Generuj XLSX"), hook `useReportDownload` (pobranie blob + nazwa z `Content-Disposition`), trasa `/admin/reports` + link „Raporty" w nawigacji admina
- [x] Testy jednostkowe serwisu (4): agregacja płatności/frekwencji, mapowanie ról/wieku/rodzica, przełożenie filtrów na zapytanie Prisma
- [x] Zweryfikowane na żywo: curl (200 + XLSX, 400 zły date, 401 bez auth) oraz Playwright (render 3 kart + realne pobranie pliku)

### Pozostałe rozszerzenia (przyszłość)

- [ ] In-app powiadomienia (bell icon w navbarze)
- [ ] Zadania domowe (upload, ocenianie)
- [ ] Testy poziomujące (quiz builder)
- [ ] Tracking postępów ucznia
- [ ] Google Calendar API (automatyczne Meet linki)
- [ ] Raporty: dodatkowe typy + eksport PDF
- [ ] Aplikacja mobilna (React Native lub PWA)
- [ ] Czat wewnętrzny (nauczyciel ↔ uczeń)

---

## ▶ Co robimy teraz?

**Faza 3 ukonczona w całości (3.1–3.5).** Nastepne kroki:
1. ~~Portal rodzica z widokiem per-dziecko (3.2)~~ ✅
2. ~~Landing page szkoly jezykowej (3.4)~~ ✅
3. ~~Logowanie i obserwowalność backendu (3.5)~~ ✅
4. ~~Powiazania rodzic-dziecko w panelu admina (3.3)~~ ✅
5. ~~Raporty (eksport XLSX) — płatności, frekwencja, użytkownicy (4.1)~~ ✅
6. Powiadomienia email i pozostałe rozszerzenia (Faza 4) ← **nastepne**
