# CLAUDE.md — Reguły dla Claude Code

## Zasady projektu

- Nigdy nie przechodzimy do kolejnej fazy dopóki poprzednia nie jest w 100% ukończona.
- TanStack Query + custom hooks dla CAŁEJ komunikacji z API (zero bezpośredniego axios w komponentach).
- ROADMAP (`docs/ROADMAP.md`) zawsze aktualizowana po zakończeniu etapu.
- `docker compose up -d` startuje cały stack.

## Obowiązkowe flow przed każdym commitem i pushem

**Zawsze** wykonuj w tej kolejności — nie commituj jeśli którykolwiek krok failuje:

```bash
# 1. API — lint
cd apps/api && npx eslint "{src,apps,libs,test}/**/*.ts"

# 2. API — testy
cd apps/api && npm test

# 3. API — build
cd apps/api && npm run build

# 4. Web — lint
cd apps/web && npm run lint

# 5. Web — testy (Vitest)
cd apps/web && npm test

# 6. Web — build
cd apps/web && npm run build

# 7. E2E — testy Playwright (wymaga docker compose up -d)
npx playwright test

# 8. Commit i push — ZAWSZE na nowym branchu (nigdy bezpośrednio na main)
git checkout -b feat/nazwa-zadania   # prefix wg convention: feat/ fix/ docs/ chore/ refactor/
git add ... && git commit ... && git push -u origin feat/nazwa-zadania
```

Jeśli lint/test/build failuje — napraw przed commitem. Nie commituj "będzie naprawione w następnym commicie".

**Poza flow** (uruchamiaj świadomie, gdy dotykasz warstwy API):
- Testy integracyjne API — `cd apps/api && npm run test:e2e` (wymaga `docker compose -f docker-compose.test.yml up -d`, baza na porcie 5433 + `npx prisma migrate deploy` z `DATABASE_URL` na 5433). Nie wchodzą w skład `npm test`, ale **od 2026-07-31 są w CI**.

## Automatyzacja — co pilnuje flow za ciebie

Trzy warstwy, bo `main` nie da się chronić po stronie GitHuba (branch protection wymaga Pro, repo jest prywatne):

1. **Pre-push hook** (`.githooks/pre-push`) — blokuje `git push`, jeśli kroki 1-6 nie przechodzą. Włącza się sam przez `prepare` w root `package.json` (`core.hooksPath`), więc po świeżym klonie wystarczy `npm install`. E2E i testy integracyjne są z niego wyłączone, bo wymagają Dockera. Awaryjnie: `git push --no-verify`.
2. **CI na każdym pushu** (`.github/workflows/ci.yml`) — dowolny branch, nie tylko `main`; PR-y dodatkowo testują wynik merge'a. `concurrency` anuluje poprzedni przebieg tego samego brancha.
3. **Pełne pokrycie w CI** — joby `api` (lint, build, unit, **integracyjne**), `web` (lint, build, unit), `e2e` (Playwright).

Hook jest jedyną warstwą, która realnie *zatrzymuje* zły kod przed wyjściem na zewnątrz — CI raportuje po fakcie.

## Wersjonowanie — ZAWSZE nowy branch

- **Nigdy nie commitujemy bezpośrednio na `main`.** Każda praca = nowy branch utworzony z aktualnego `main`.
- Nazwa brancha wg Conventional Commits: `feat/...`, `fix/...`, `docs/...`, `chore/...`, `refactor/...` (np. `feat/parent-child-links`).
- Wypychamy branch (`git push -u origin <branch>`). **Pull requesty i merge na GitHubie robi właściciel ręcznie** — nie mergujemy ani nie tworzymy PR-ów automatycznie.
- Przed nowym zadaniem: `git checkout main && git pull` → dopiero potem `git checkout -b <nowy-branch>`.

## Docker — ważne zasady

- Po `npm install` w `apps/api` lub `apps/web` MUSISZ zrebuildować obraz: `docker compose build api` / `docker compose build web`.
- Diagnoza 404 na API: `docker logs academy_api --tail 30`.
- Nowe pliki w `apps/web/src/` są dostępne przez volume mount — nie wymagają rebuildu (HMR działa). Ale nowe zależności w `package.json` wymagają rebuildu.

## Znane problemy / wzorce

- `@base-ui/react` Select: `onValueChange` zwraca `string | null` — zawsze guarduj: `(v: string | null) => v && setValue(...)`.
- `@base-ui/react` Select.Value pokazuje raw value, nie label — zawsze ręcznie wyszukuj label przez `.find()`.
- `Role` importuj z `@prisma/client`, nie z własnych enumów.
- Po dodaniu shadcn komponentu napraw importy: `src/lib/utils` → `@/lib/utils`.
- W `apps/web` zawsze używaj `import { api } from '@/lib/api'` — nigdy gołego `import axios from 'axios'`. Tylko `api` ma interceptory z tokenem JWT. Gołe axios → 401.
- `api` ma `baseURL: '/api/v1'` — URL-e w hookach zaczynaj od `/resource/`, nigdy od `/api/v1/resource/` (podwójny prefix → 404).
- FormData + axios: nie ustawiaj ręcznie `Content-Type` — axios auto-ustawia z boundary dla multipart.
- Streaming plików przez API (nie presigned URL) — MinIO `minio:9000` jest wewnętrzny Dockera, niedostępny z przeglądarki.
- `AuthInitializer` używa gołego `axios` (nie `api`) do refresh — celowe, żeby uniknąć pętli interceptorów.
- React StrictMode odpala `useEffect` dwa razy — używaj `useRef` jako flagi "already initiated" dla operacji które powinny wykonać się raz.
- `invalidateQueries` — zawsze invaliduj wszystkie powiązane klucze: zmiana klasy → `['users']` (stats nauczyciela) + `['attendance','student']`; zmiana grupy → `['classes']`; zmiana przynależności do grupy → `['users', studentId]`.
- `Class.teacherId` może być null — statystyki i zapytania muszą obsługiwać fallback przez `group.teacherId` (`OR: [{ teacherId }, { teacherId: null, group: { teacherId } }]`).
- Testy jednostkowe mockują `findMany` — weryfikuj strukturę WHERE (np. OR branches), nie tylko logikę agregacji na zwróconych danych.
