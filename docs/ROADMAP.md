# Roadmap — Plan Rozwoju

## Faza 0 — Planowanie i Setup ✅

- [x] Dokumentacja projektu (ten folder)
- [x] Inicjalizacja repozytorium Git + push na GitHub
- [x] Konfiguracja `.gitignore` (node_modules, .env, dist, coverage)
- [~] Ochrona brancha `main` — wymaga GitHub Pro na prywatnym repo (pomiń lub upublicznij repo)
- [x] Setup monorepo (Turborepo + npm workspaces: apps/api, apps/web, packages/shared)
- [x] Docker Compose dla lokalnego środowiska (PostgreSQL, Redis, MinIO)
- [x] NestJS boilerplate z Prisma + PostgreSQL (migracja `init` wykonana)
- [x] React boilerplate z Vite + TypeScript + TanStack Query + Zustand + Axios
- [x] Schemat bazy danych (Prisma schema — wszystkie modele)
- [ ] Tailwind CSS + shadcn/ui
- [ ] CI podstawowy (lint, build, testy)
- [ ] Konfiguracja Playwright (E2E)
- [ ] docker-compose.test.yml (izolowana baza testowa)

**Cel:** Działające środowisko dev, można odpalić jedną komendą. ✅ (częściowo — bez Tailwind i CI)

---

## Faza 1 — Core MVP

### 1.1 — Auth
- [ ] Moduł auth (login, logout, refresh token)
- [ ] Testy jednostkowe: AuthService, Guards, strategie JWT
- [ ] Testy integracyjne: `/auth/login`, `/auth/refresh`, role-based access
- [ ] Role i Guards w NestJS
- [ ] Strona logowania w React
- [ ] Interceptor axios (auto-refresh)
- [ ] Protected routes

### 1.2 — Użytkownicy
- [ ] CRUD użytkowników w API (admin only)
- [ ] Lista nauczycieli (admin)
- [ ] Lista uczniów (admin)
- [ ] Tworzenie/edycja użytkownika
- [ ] Powiązanie rodzic ↔ uczeń

### 1.3 — Grupy
- [ ] CRUD grup w API
- [ ] Lista grup z filtrowaniem
- [ ] Szczegóły grupy (uczniowie, nauczyciel)
- [ ] Dodawanie/usuwanie uczniów z grupy
- [ ] Zmiana nauczyciela grupy

### 1.4 — Zajęcia
- [ ] CRUD zajęć w API
- [ ] Widok kalendarza zajęć
- [ ] Strona szczegółów zajęć
- [ ] Manualny Meet link (pole tekstowe)
- [ ] Zmiana statusów (scheduled → ongoing → completed)
- [ ] Odwołanie zajęć

### 1.5 — Frekwencja
- [ ] CRUD attendance w API
- [ ] Bulk zaznaczanie obecności (nauczyciel)
- [ ] Widok frekwencji ucznia
- [ ] Statystyki frekwencji

### 1.6 — Materiały
- [ ] Upload plików (MinIO)
- [ ] Dodawanie linków
- [ ] Biblioteka materiałów
- [ ] Przypisywanie materiałów do zajęć

**Cel:** Szkoła może działać operacyjnie — prowadzić zajęcia, zarządzać uczniami, zaznaczać obecność.

---

## Faza 2 — Płatności + Portal rodzica

### 2.0 — E2E (Playwright)
- [ ] Testy E2E: flow logowania dla każdej roli
- [ ] Testy E2E: tworzenie zajęć + zaznaczanie obecności
- [ ] Testy E2E: proces płatności (mock bramki)

### 2.1 — Płatności
- [ ] Moduł płatności w API
- [ ] Tworzenie opłat przez admina
- [ ] Integracja Przelewy24 (checkout + webhook)
- [ ] Ręczna zmiana statusu (admin)
- [ ] Dashboard finansowy (admin)
- [ ] Strona płatności ucznia/rodzica
- [ ] Cron: oznaczanie overdue

### 2.2 — Portal rodzica
- [ ] Rejestracja konta rodzica (przez admina)
- [ ] Widok frekwencji dziecka
- [ ] Widok płatności dziecka
- [ ] Powiadomienia o nieobecności

### 2.3 — Powiadomienia email
- [ ] Szablony email (HTML)
- [ ] BullMQ kolejka
- [ ] Cron: reminder przed zajęciami
- [ ] Cron: reminder o płatnościach
- [ ] In-app powiadomienia (bell icon)

**Cel:** Właściciel ma pełny wgląd w finanse. Rodzice są informowani.

---

## Faza 3 — Rozszerzenia (przyszłość)

- [ ] Zadania domowe (upload, ocenianie)
- [ ] Testy poziomujące (quiz builder)
- [ ] Tracking postępów ucznia
- [ ] Google Calendar API (automatyczne Meet linki)
- [ ] Raporty i eksport CSV/PDF
- [ ] Powtarzające się zajęcia (recurence rules)
- [ ] Aplikacja mobilna (React Native lub PWA)
- [ ] Czat wewnętrzny (nauczyciel ↔ uczeń)

---

## Od czego zaczynamy?

**Następny krok: Faza 0 — Setup**

1. Inicjalizacja monorepo
2. Docker Compose (postgres, redis, minio)
3. NestJS app z Prisma
4. React app z Vite
5. Prisma schema według `docs/technical/DATABASE.md`

Kiedy środowisko działa → przechodzimy do Fazy 1.1 (Auth).
