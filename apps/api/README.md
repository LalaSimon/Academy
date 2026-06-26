# Academy API

NestJS backend — REST API platformy edukacyjnej dla prywatnej szkoły językowej.

## Stack

- **NestJS 10** + TypeScript — framework backendowy, DI, moduły
- **Prisma 6** — ORM, migracje, type-safe queries
- **PostgreSQL 16** — główna baza danych
- **Redis 7** — sesje, cache (BullMQ w roadmapie)
- **MinIO** — self-hosted S3 do plików (materiały edukacyjne)
- **Resend SDK** — transakcyjne emaile
- **Stripe SDK** — płatności, webhooks
- **Argon2** — hashowanie haseł
- **Jest** — testy jednostkowe

## Uruchomienie

```bash
# Dev (z hot-reload, przez Docker Compose — zalecane)
docker compose up -d api

# Dev lokalnie (bez Dockera)
cp ../../.env .env
npm run start:dev

# Produkcja
npm run build
npm run start:prod
```

API dostępne na `http://localhost:3000`. Prefix wszystkich endpointów: `/api/v1`.

## Struktura modułów

```
src/
├── app.module.ts           # Główny moduł (importuje wszystkie feature modules)
├── prisma/
│   └── prisma.service.ts   # @Global PrismaService
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts   # JwtAuthGuard (domyślnie globalny)
│   │   └── roles.guard.ts      # RolesGuard
│   └── decorators/
│       ├── roles.decorator.ts  # @Roles('ADMIN', 'TEACHER')
│       └── current-user.decorator.ts  # @CurrentUser()
└── modules/
    ├── auth/          # Logowanie, rejestracja, weryfikacja email, refresh, logout
    ├── users/         # CRUD użytkowników, statystyki nauczyciela
    ├── groups/        # Grupy lekcyjne, harmonogramy, przypisania uczniów
    ├── classes/       # Zajęcia (CRUD, statusy, bulk, seria)
    ├── attendance/    # Frekwencja (bulk update, statystyki per-uczeń)
    ├── materials/     # Upload/download plików (MinIO), linki
    ├── payments/      # Stripe Checkout, webhooks, statusy płatności
    └── mail/          # MailService (Resend), szablony HTML
```

## Autoryzacja

Każdy request musi zawierać `Authorization: Bearer <accessToken>`, z wyjątkiem:
- `POST /auth/login`
- `POST /auth/register`
- `GET  /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/refresh`
- `POST /payments/webhook/stripe`

**Access token:** JWT, żyje 15 minut, niesie `{ sub, email, role, isMinor }`.  
**Refresh token:** httpOnly cookie `refresh_token`, żyje 7 dni, rotowany przy każdym użyciu.

### Role i uprawnienia

```
ADMIN   → pełny dostęp do wszystkich endpointów
TEACHER → zarządza własnymi grupami/zajęciami/frekwencją/materiałami
STUDENT → read-only dostęp do własnych danych (self-check w serwisie)
PARENT  → read-only dostęp do danych dzieci (weryfikacja parent→child w serwisie)
```

Dekoratory na kontrolerach:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@Get()
findAll() { ... }

@Public()  // wyłącza JwtAuthGuard dla danego endpointu
@Post('login')
login() { ... }
```

## Moduł Auth

### Endpointy

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| `POST` | `/auth/login` | — | Logowanie, zwraca accessToken + ustawia cookie |
| `POST` | `/auth/logout` | JWT | Usuwa refresh token z DB i cookie |
| `POST` | `/auth/refresh` | cookie | Rotacja refresh tokena, nowy accessToken |
| `GET`  | `/auth/me` | JWT | Dane zalogowanego użytkownika |
| `POST` | `/auth/register` | — | Rejestracja ucznia/rodzica, wysyła email weryfikacyjny |
| `GET`  | `/auth/verify-email?token=` | — | Weryfikacja adresu email |
| `POST` | `/auth/resend-verification` | — | Ponowne wysłanie emaila weryfikacyjnego |
| `POST` | `/auth/setup-child` | JWT(PARENT) | Pierwsza konfiguracja konta dziecka przez rodzica |

### Rejestracja — flow

```
POST /auth/register { email, password, firstName, lastName, phone?, accountType }
  └─► Tworzy User (emailVerified=false, token w emailVerificationToken)
  └─► Wysyła email weryfikacyjny (Resend SDK, w dev/test błędy są logowane, nie rzucane)
  └─► Wysyła powiadomienie do admina

GET /auth/verify-email?token=<hex>
  └─► Ustawia emailVerified=true, czyści token

POST /auth/login
  └─► Dla niezweryfikowanych: rzuca 403 { code: 'EMAIL_NOT_VERIFIED' }
  └─► Dla rodziców bez dziecka: zwraca { needsChildSetup: true }
  └─► Dla niepełnoletnich: pomija weryfikację (email @academy.pl, konto tworzone przez rodzica)

POST /auth/setup-child { firstName, lastName, password }
  └─► Tworzy User (STUDENT, isMinor=true, email: imie.nazwisko@academy.pl)
  └─► Tworzy ParentStudent (parentId = zalogowany rodzic)
```

## Moduł Users

Zarządzanie użytkownikami z obsługą wszystkich ról.

```typescript
GET  /users                      // lista (filtr: role, search, page, limit)
POST /users                      // tworzenie z opcjonalnym parentData/existingParentId
GET  /users/:id                  // szczegóły + grupy + dane parent/dzieci
PATCH /users/:id                 // aktualizacja
DELETE /users/:id                // deaktywacja (isActive=false)
GET  /users/:id/stats            // statystyki nauczyciela (klasy, godziny, breakdown)
POST /users/:parentId/students/:studentId   // linkowanie rodzic→dziecko
DELETE /users/:parentId/students/:studentId // odlinkowanie
```

### Tworzenie ucznia niepełnoletniego

```json
POST /users
{
  "firstName": "Jan", "lastName": "Kowalski",
  "email": "jan.kowalski@example.com",
  "password": "...", "role": "STUDENT", "isMinor": true,
  "existingParentId": "cuid..."
  // lub "parentData": { "firstName": "...", "email": "...", "password": "..." }
}
```

## Moduł Payments

Integracja Stripe Checkout z webhookami.

```typescript
GET  /payments                   // lista (ADMIN: wszystkie, STUDENT/PARENT: własne)
POST /payments                   // tworzenie płatności [ADMIN]
POST /payments/bulk              // bulk dla całej grupy [ADMIN]
GET  /payments/:id               // szczegóły
PATCH /payments/:id/status       // ręczna zmiana statusu [ADMIN]
DELETE /payments/:id             // anulowanie [ADMIN]
GET  /payments/student/:id       // płatności ucznia
POST /payments/:id/checkout      // tworzy sesję Stripe Checkout, zwraca URL
POST /payments/webhook/stripe    // Stripe webhook (publiczny, weryfikowany podpisem)
GET  /payments/summary           // dashboard finansowy [ADMIN]
```

### Stripe flow

```
POST /payments/:id/checkout
  └─► stripe.checkout.sessions.create({ success_url, cancel_url, line_items })
  └─► Zwraca { url: 'https://checkout.stripe.com/...' }
  └─► Frontend przekierowuje: window.location.href = url

Stripe → POST /payments/webhook/stripe
  └─► Weryfikacja podpisu (stripe.webhooks.constructEvent)
  └─► Event: checkout.session.completed → status=PAID
```

## Schemat bazy (Prisma)

Kluczowe modele i relacje:

```
User ──────────────────────────────────────────────────────────────────────
  id, email, passwordHash, firstName, lastName, phone?, role, isActive
  isMinor (bool) — uczeń pełnoletni vs. niepełnoletni
  emailVerified (bool) — weryfikacja przez link w emailu
  emailVerificationToken (String?) — hex token, usuwany po weryfikacji
  asParent → ParentStudent[] (dzieci)
  asStudent → ParentStudent[] (rodzice)

ParentStudent ──────────────────────────────────────────────────────────────
  parentId (FK → User), studentId (FK → User)
  @@id([parentId, studentId])

Group → Class → Attendance
Group → GroupStudent → User (STUDENT)
Class → GroupStudent (auto-tworzenie attendance przy GET /attendance?classId=)
Material ← ClassMaterial → Class
Material ← GroupMaterial → Group

Payment
  studentId (FK → User)
  stripeSessionId, stripePaymentIntentId
  status: PENDING | PAID | OVERDUE | REFUNDED | CANCELLED

RefreshToken
  userId (FK → User), token (hashed), expiresAt
```

Migracje w `prisma/migrations/`. Uruchomienie: `npx prisma migrate deploy`.

## Testowanie

```bash
npm test             # wszystkie testy (119 testów, 9 suite'ów)
npm run test:watch   # watch mode
npm run test:cov     # coverage report
```

### Suity testowe

| Plik | Testy | Co pokrywa |
|------|-------|-----------|
| `auth.service.spec.ts` | 27 | Login, register, verifyEmail, resendVerification, setupChild, refresh, logout |
| `users.service.spec.ts` | 25 | CRUD, isMinor, linkParent, getTeacherStats (WHERE OR clause) |
| `groups.service.spec.ts` | 12 | CRUD, addStudent, removeStudent, generateClasses |
| `classes.service.spec.ts` | 14 | CRUD, bulk, batch update, statusy, 1:1 vs. grupowe |
| `attendance.service.spec.ts` | 7 | bulkUpdate, getStudentStats (OR branches dla teacherId) |
| `materials.service.spec.ts` | 10 | upload, link, assign do klasy/grupy, cascade |
| `payments.service.spec.ts` | 15 | CRUD, Stripe checkout, webhook, bulk, summary |
| `roles.guard.spec.ts` | 4 | RolesGuard — role matching, reflector |
| `mail.service.spec.ts` | 5 | send, szablony, dev/prod error handling |

### Wzorce mockowania

```typescript
// Globalny mock Prisma w module testowym
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  // ...
};

// Izolacja między testami
beforeEach(() => {
  jest.clearAllMocks();
});

// One-time mock dla złożonych scenariuszy
mockPrisma.user.findUnique
  .mockResolvedValueOnce({ ...mockUser, emailVerified: false })
  .mockResolvedValueOnce(null);
```

## Linting i build

```bash
npx eslint "{src,apps,libs,test}/**/*.ts"   # lint
npm run build                                # kompilacja (nest build)
```

## Znane pułapki

**`Class.teacherId` może być null** — zajęcia dziedziczą nauczyciela z grupy. Wszystkie zapytania filtrujące po `teacherId` muszą używać `OR`:
```typescript
where: {
  OR: [{ teacherId }, { teacherId: null, group: { teacherId } }]
}
```

**`invalidateQueries` — powiązane klucze:** zmiana klasy → invaliduj `['users']` (statystyki nauczyciela) ORAZ `['attendance','student']`; zmiana grupy → invaliduj `['classes']`.

**Mail w dev/test:** `MailService.send()` nie rzuca wyjątku gdy Resend odrzuca email (np. niezweryfikowana domena). Błąd jest logowany, ale request kończy się sukcesem. W `NODE_ENV=production` błąd jest propagowany.

**Docker + nowe npm paczki:** Po `npm install` w `apps/api` konieczny `docker compose build api`.
