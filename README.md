# Academy — Platforma dla Prywatnej Szkoły Językowej

Monorepo aplikacji webowej do zarządzania prywatną szkołą językową online. Obejmuje panel administracyjny, portal nauczyciela, portal ucznia, portal rodzica oraz publiczny landing page.

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Backend | NestJS 10 + TypeScript, Prisma ORM, PostgreSQL 16 |
| Frontend | React 19 + TypeScript, Vite, TanStack Query, Zustand |
| Stylowanie | Tailwind CSS v4, shadcn/ui, Framer Motion |
| Auth | JWT access token (15 min) + refresh token (7 dni, httpOnly cookie) |
| Płatności | Stripe Checkout + webhooks |
| Email | Resend SDK |
| Przechowywanie plików | MinIO (self-hosted S3) |
| Testy | Jest (API) · Vitest + Testing Library (web) · Playwright (E2E) |
| Infrastruktura | Docker Compose, GitHub Actions CI |

## Szybki start

```bash
# 1. Sklonuj repo i zainstaluj zależności
git clone https://github.com/LalaSimon/Academy.git
cd Academy
npm install

# 2. Skopiuj i uzupełnij zmienne środowiskowe
cp .env.example .env
# Wypełnij: DATABASE_URL, JWT_*, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MINIO_*

# 3. Uruchom cały stack (Postgres + Redis + MinIO + API + Web)
docker compose up -d

# 4. Otwórz aplikację
open http://localhost:5173
```

Po starcie stack uruchamia: Postgres (5432), Redis (6379), MinIO (9000/9001), API (3000), Web (5173).

## Struktura monorepo

```
Academy/
├── apps/
│   ├── api/          # NestJS backend — REST API
│   └── web/          # React frontend — SPA
├── e2e/              # Playwright testy E2E
│   └── helpers/      # DB helpers (getVerificationToken, deleteUser)
├── docs/
│   ├── ROADMAP.md    # Plan faz + status ukończenia
│   ├── ARCHITECTURE.md
│   ├── features/     # Specyfikacja per-feature
│   └── technical/    # API, DATABASE, DOCKER, TESTING
└── docker-compose.yml
```

## Dokumentacja

- **[Architektura](docs/ARCHITECTURE.md)** — stack, diagramy, znane pułapki
- **[Roadmap](docs/ROADMAP.md)** — plan faz i status ukończenia
- **[API Reference](docs/technical/API.md)** — wszystkie endpointy REST
- **[Schemat bazy](docs/technical/DATABASE.md)** — modele Prisma, relacje
- **[Docker](docs/technical/DOCKER.md)** — konfiguracja środowisk
- **[Testowanie](docs/technical/TESTING.md)** — strategia, konfiguracja, pokrycie
- **[Backend README](apps/api/README.md)** — moduły NestJS, uruchamianie
- **[Frontend README](apps/web/README.md)** — komponenty, hooki, routing

## Role użytkowników

| Rola | Uprawnienia |
|------|-------------|
| `ADMIN` | Pełny dostęp — zarządza wszystkim |
| `TEACHER` | Zarządza swoimi grupami, zajęciami, frekwencją, materiałami |
| `STUDENT` | Widzi własne zajęcia, grupy, materiały, frekwencję, płatności |
| `PARENT` | Widzi dane dziecka (zajęcia, frekwencja, płatności); może opłacać przez Stripe |

## Komendy deweloperskie

```bash
# Backend
cd apps/api
npm run start:dev     # hot-reload
npm test              # testy jednostkowe (Jest)
npm run build         # kompilacja produkcyjna

# Frontend
cd apps/web
npm run dev           # Vite dev server :5173
npm run test          # Vitest (watch mode: npm run test -- --watch)
npm run build         # produkcyjny bundle

# E2E
npx playwright test               # wszystkie testy
npx playwright test e2e/auth.spec.ts  # konkretny plik
npx playwright test --ui          # interaktywny interfejs

# Lint i build (wymagane przed commitem)
cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts"
cd apps/web && npm run lint && npm run build
```

## Commit workflow

Zawsze przed commitem:

```bash
cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts" && npm test && npm run build
cd apps/web && npm run lint && npm run build
npx playwright test
```

## Zmienne środowiskowe

Plik `.env` w katalogu głównym (patrz `.env.example`):

```env
# Baza danych
DATABASE_URL=postgresql://academy:academy@localhost:5432/academy

# JWT
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Email (Resend)
RESEND_API_KEY=re_...
MAIL_FROM=Academy <noreply@academy.pl>
ADMIN_EMAIL=admin@example.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:5173/payments?status=success
STRIPE_CANCEL_URL=http://localhost:5173/payments?status=cancelled

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=academy-materials
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- **api job:** lint → test → build
- **web job:** lint → build
- **e2e job:** pełny stack + Playwright (tylko na main)

## Licencja

Prywatny projekt — wszelkie prawa zastrzeżone.
