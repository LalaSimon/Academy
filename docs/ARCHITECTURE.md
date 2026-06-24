# Architektura Techniczna

## Stack technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Frontend | React 19 + TypeScript | Wymaganie projektu |
| UI Library | shadcn/ui + Tailwind CSS v4 | Szybkie prototypowanie, spójny design |
| Design System | Przyjazny i kolorowy — pastelowe kolory, zaokrąglone karty | Duolingo/Google Classroom feel |
| Animacje | Framer Motion | Przejścia stron, micro-interactions |
| Wykresy | Recharts | Dashboard, frekwencja, finanse |
| Kalendarz | React Big Calendar | Widok zajęć |
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
│   │   │   │   ├── ui/         # shadcn/ui (Button, Input, Card...)
│   │   │   │   └── common/     # reużywalne: PageHeader, DataTable, StatCard...
│   │   │   ├── pages/          # widoki per rola (auth/, admin/, teacher/, student/)
│   │   │   ├── hooks/          # TanStack Query hooks (useStudents, useGroups...)
│   │   │   ├── lib/
│   │   │   │   └── api.ts      # axios client z interceptorem refresh
│   │   │   ├── store/          # Zustand (auth store, UI state)
│   │   │   └── router/         # React Router, PrivateRoute
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

## Architektura frontendu — zasady

### Komunikacja z API
**Zasada: żadnych bezpośrednich wywołań axios w komponentach.**

Cała komunikacja z API odbywa się przez warstwę hooków:

```
Komponent → custom hook → TanStack Query → axios client → API
```

**Warstwy:**
```
src/lib/api.ts          ← axios instance z interceptorem auto-refresh
src/hooks/useStudents.ts ← useQuery/useMutation owinięte w custom hook
src/pages/Students.tsx   ← konsumuje hook, nie zna axios/fetch
```

**Przykład:**
```typescript
// ✅ Dobrze — komponent nie wie jak dane są pobierane
const { data: students, isLoading } = useStudents({ groupId });

// ❌ Źle — bezpośredni axios w komponencie
const [students, setStudents] = useState([]);
useEffect(() => { axios.get('/api/v1/students').then(...) }, []);
```

### Stan aplikacji
- **TanStack Query** — cały server state (dane z API, cache, refetch, loading/error)
- **Zustand** — wyłącznie client state: dane auth zalogowanego użytkownika, stan UI (sidebar, modale)
- **useState/useReducer** — lokalny stan formularzy i komponentów

### Komponenty UI
- `src/components/ui/` — surowe komponenty shadcn (nie modyfikujemy)
- `src/components/common/` — kompozycje wielokrotnego użytku: `PageHeader`, `DataTable`, `StatCard`, `EmptyState`, `LoadingSpinner`
- **Zasada:** jeśli ten sam układ pojawia się 2+ razy → wyciągamy do `common/`

### Design System
- **Styl:** przyjazny i kolorowy — pastelowe tła kart, zaokrąglone rogi (`rounded-2xl`), czytelna typografia
- **Animacje:** Framer Motion dla przejść stron (`AnimatePresence`) i wejść kart (`motion.div`)
- **Kolory akcentów:** per rola — np. indigo dla admina, emerald dla nauczyciela, violet dla ucznia
- **Dark mode:** obsługiwany przez shadcn/Tailwind, domyślnie light

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

---

## Znane pułapki i decyzje

### Auth: refresh tokenu przy odświeżeniu strony

**Problem:** Po naciśnięciu F5 użytkownik był wylogowywany mimo ważnego refresh tokenu w cookie.

**Przyczyna — dwie warstwy:**

1. **Zustand persist jest asynchroniczny.** `useEffect` w komponencie inicjalizującym uruchamia się zanim Zustand zdąży wczytać `user` z localStorage. W efekcie komponent widzi `user = null` i nie próbuje refreshu.

2. **React StrictMode podwójnie wywołuje `useEffect`.** Gdy próbowaliśmy proaktywnie wywołać `/auth/refresh` przy starcie, StrictMode uruchamiał effect dwa razy. Oba requesty wysyłały ten sam token; pierwszy go unieważniał (token rotation), drugi dostawał 403 → `logout()` → wylogowanie.

**Rozwiązanie:**

- `AuthInitializer` (`src/components/AuthInitializer.tsx`) czeka **tylko** na zakończenie hydratacji Zustand przez `useAuthStore.persist.onFinishHydration()` — nic więcej.
- Refresh tokenu obsługuje **wyłącznie interceptor Axios** (`src/lib/api.ts`): gdy pierwsze zapytanie po odświeżeniu strony dostaje 401 (brak tokenu w pamięci), interceptor wywołuje `/auth/refresh` z httpOnly cookie, dostaje nowy access token i ponawia oryginalne zapytanie.
- Interceptor ma flagę `isRefreshing` i kolejkę `failedQueue` — jeśli kilka requestów dostanie 401 jednocześnie, tylko jeden wywołuje refresh, pozostałe czekają w kolejce i dostają nowy token po jego zakończeniu.

**Zasada na przyszłość:** Nigdy nie wywołuj `/auth/refresh` proaktywnie przy starcie aplikacji — zostaw to interceptorowi. `AuthInitializer` ma wyłącznie czekać na hydratację store'a.

```
Odświeżenie strony:
  AuthInitializer czeka na hydratację Zustand
  └─► PrivateRoute widzi user (persisted) → renderuje stronę
      └─► Komponent wywołuje API (brak tokenu w pamięci)
          └─► Axios interceptor: 401 → POST /auth/refresh (cookie)
              ├─► 200 → setAccessToken → ponów request → dane załadowane ✓
              └─► 403 → logout() → redirect /login ✓
```

### Docker API: nowe paczki npm wymagają rebuild obrazu

**Problem:** Po `npm install <paczka> --workspace=apps/api` lokalnie paczka pojawia się w `node_modules` na hoście, ale kontener Dockera ma własne `node_modules` zbudowane przy ostatnim `docker compose build`. API w kontenerze nie kompiluje się i nie rejestruje modułów — endpoint zwraca 404, a logi pokazują błąd `Cannot find module`.

**Przykład:** `@nestjs/mapped-types` zainstalowane lokalnie, ale API w Dockerze rzucało `TS2307: Cannot find module '@nestjs/mapped-types'` → wszystkie endpointy poza Auth dostawały 404.

**Rozwiązanie:** Po każdym `npm install` nowej paczki do `apps/api` lub `apps/web` uruchom:

```bash
docker compose build api   # lub: docker compose build web
docker compose up -d api   # lub: docker compose up -d web
```

**Zasada na przyszłość:** Jeśli endpoint API zwraca 404 (nie 401/403), najpierw sprawdź logi kontenera:
```bash
docker logs academy_api --tail 30
```
Błąd `Cannot find module` = trzeba `docker compose build api`.

---

### shadcn/ui: złe ścieżki importów po `npx shadcn@latest add`

**Problem:** shadcn CLI generuje komponenty z importami `from "src/lib/utils"` i `from "src/components/ui/button"` zamiast `from "@/lib/utils"`.

**Rozwiązanie:** Po każdym `npx shadcn@latest add <komponent>` w `apps/web/` uruchom:

```bash
sed -i '' 's|from "src/lib/utils"|from "@/lib/utils"|g' src/components/ui/<komponent>.tsx
sed -i '' 's|from "src/components/ui/|from "@/components/ui/|g' src/components/ui/<komponent>.tsx
```
