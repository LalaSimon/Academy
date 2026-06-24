# Architektura Techniczna

## Stack technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Frontend | React 18 + TypeScript | Wymaganie projektu |
| UI Library | shadcn/ui + Tailwind CSS | Szybkie prototypowanie, spójny design |
| State Management | TanStack Query + Zustand | Server state + client state oddzielnie |
| Backend | NestJS + TypeScript | Wymaganie projektu, modularny, DI |
| ORM | Prisma | Świetne DX, type-safety, migracje |
| Baza danych | PostgreSQL 16 | Dane relacyjne, ACID dla płatności |
| Auth | JWT + Refresh Tokens | Bezstanowe, skalowalne |
| File Storage | MinIO (self-hosted S3) | Materiały edukacyjne, Docker-friendly |
| Email | Nodemailer + SMTP / Resend | Powiadomienia, przypomnienia |
| Testy (API) | Jest + Supertest | Unit + integracyjne dla NestJS |
| Testy (Web) | Vitest + Testing Library | Unit testy komponentów i hooków |
| Testy E2E | Playwright | Krytyczne ścieżki w przeglądarce |
| Testy API mock | MSW (Mock Service Worker) | Mockowanie API w testach frontendu |
| Reverse Proxy | Nginx | Routing, SSL termination |
| Konteneryzacja | Docker + Docker Compose | Wymaganie projektu |
| CI/CD | GitHub Actions | Automatyczne testy i deploy |

## Diagram architektury

```
┌─────────────────────────────────────────────────────────┐
│                        Internet                          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
              ┌──────▼──────┐
              │    Nginx     │  (reverse proxy + SSL)
              └──────┬───────┘
           ┌─────────┴─────────┐
           │                   │
    ┌──────▼──────┐    ┌───────▼──────┐
    │  React App  │    │  NestJS API  │
    │  (port 80)  │    │  (port 3000) │
    └─────────────┘    └───────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼─────┐  ┌───────▼──────┐  ┌─────▼──────┐
       │ PostgreSQL  │  │    MinIO     │  │   Redis    │
       │  (port 5432)│  │  (port 9000) │  │(port 6379) │
       └────────────┘  └──────────────┘  └────────────┘
```

## Struktura projektu (monorepo)

```
academy/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   └── lib/
│   │   └── package.json
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── groups/
│       │   │   ├── classes/
│       │   │   ├── attendance/
│       │   │   ├── materials/
│       │   │   ├── payments/
│       │   │   └── notifications/
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── decorators/
│       │   │   ├── interceptors/
│       │   │   └── filters/
│       │   └── prisma/
│       └── package.json
├── packages/
│   └── shared/                 # Wspólne typy TS
│       └── src/
│           └── types/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker/
│   ├── nginx/
│   │   └── nginx.conf
│   └── postgres/
│       └── init.sql
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Moduły NestJS

```
auth/          → JWT, refresh tokens, role guards
users/         → CRUD użytkowników, role (ADMIN, TEACHER, STUDENT, PARENT)
groups/        → CRUD grup, przypisania
classes/       → Planowanie zajęć, Google Meet link
attendance/    → Ewidencja obecności
materials/     → Upload/download plików (MinIO), treści
payments/      → Faktury, statusy, webhook bramki płatności
notifications/ → Email (Nodemailer), in-app notifications
reports/       → Raporty frekwencji i finansowe (faza 2)
```

## Autoryzacja i role

```
ADMIN   → pełny dostęp do wszystkiego
TEACHER → zarządzanie swoimi grupami, zajęciami, frekwencją
STUDENT → widok własnych grup, zajęć, materiałów, płatności
PARENT  → widok dziecka (obecności, płatności, harmonogram)
```

Implementacja: NestJS Guards + custom decorator `@Roles()` + JWT payload z rolą.

## Integracje zewnętrzne

### Google Meet / Calendar API
- OAuth2 service account
- Automatyczne tworzenie eventu w Google Calendar z linkiem Meet
- Link zapisywany w bazie przy tworzeniu zajęć
- Alternatywa uproszczona: manualne wklejanie linku przez nauczyciela (faza 1 MVP)

### Bramka płatności
- **Przelewy24** — popularne w Polsce, obsługuje przelewy, BLIK, karty
- **Stripe** — globalne, lepsze API, wymaga konta zagraniczne
- **Rekomendacja:** Przelewy24 dla polskich klientów
- Webhook do potwierdzania płatności → aktualizacja statusu w DB

### Email
- SMTP (własny serwer) lub **Resend** (transactional email SaaS)
- Szablony: przypomnienie o zajęciach, zaległa płatność, powitanie

## Bezpieczeństwo

- Hasła hashowane Argon2
- JWT Access Token: 15 min, Refresh Token: 7 dni (httpOnly cookie)
- Rate limiting na endpointach auth
- CORS skonfigurowany
- Walidacja inputów — class-validator w NestJS
- Upload plików: walidacja MIME type + max size
- HTTPS przez Nginx + Let's Encrypt

## Środowiska

| Środowisko | Opis |
|------------|------|
| `development` | docker-compose.yml, hot reload, lokalny SMTP |
| `production` | docker-compose.prod.yml, Nginx SSL, zewnętrzny SMTP |
