# CLAUDE.md — Reguły dla Claude Code

## Zasady projektu

- Nigdy nie przechodzimy do kolejnej fazy dopóki poprzednia nie jest w 100% ukończona.
- TanStack Query + custom hooks dla CAŁEJ komunikacji z API (zero bezpośredniego axios w komponentach).
- ROADMAP (`docs/ROADMAP.md`) zawsze aktualizowana po zakończeniu etapu.
- `docker compose up -d` startuje cały stack.
- **Kod piszemy od razu bezpieczny** — patrz sekcja „Bezpieczeństwo" niżej. Nie zostawiamy tego na późniejszy audyt.

## Bezpieczeństwo — obowiązkowe przy KAŻDYM nowym endpoincie

Reguły wyprowadzone z audytu 2026-07-31/08-02, który znalazł 11 realnych dziur — m.in. uczeń mógł pobrać dowolną grupę razem z **e-mailami** jej uczniów, a nauczyciel **odwołać cudze zajęcia**. Wszystkie miały tę samą przyczynę: `@Roles()` sprawdzał **rolę**, ale nikt nie sprawdzał, **czyj jest zasób**.

### 1. `@Roles()` to nie kontrola dostępu

`@Roles()` odpowiada tylko na „jaka rola", nigdy na „czyje to dane". Każdy endpoint przyjmujący `:id` lub zwracający listę musi dodatkowo odpowiedzieć na drugie pytanie.

Używaj `AccessControlService` (`common/access/`, `@Global`) — **nie pisz własnych sprawdzeń od zera**:

```ts
await this.access.assertCanReadGroup(req.user, groupId);   // 403 gdy cudza
await this.access.assertCanAccessClass(req.user, classId); // też dla ZAPISU
await this.access.assertCanReadMaterial(req.user, id);
const groupIds = await this.access.getAccessibleGroupIds(req.user); // null = admin
```

Jeśli nowy zasób nie pasuje do istniejących metod — **dodaj metodę tam**, nie inline w kontrolerze. Rozsypanie tej logiki po kontrolerach było źródłem wszystkich znalezionych dziur.

### 2. Zapis wymaga sprawdzenia tak samo jak odczyt — a często pilniej

Operacje zapisu mają skutki uboczne widoczne dla użytkowników: odwołanie zajęć **rozsyła powiadomienia**, oznaczenie nieobecności **wysyła maila**. Cudzy zapis jest gorszy niż cudzy odczyt.

### 3. Parametry filtrowania od klienta są niezaufane

Gdy rola ma widzieć wycinek danych, **nadpisz** filtr wartością z tokenu — nie ufaj temu, co przyszło w query:

```ts
if (req.user.role === Role.TEACHER) {
  return this.service.findAll({ ...query, teacherId: req.user.id }); // nadpisanie, nie merge
}
```

Zakres wyliczony z tokenu przekazuj **osobnym argumentem** serwisu (jak `learnerScope` w `classes.findAll`), żeby nie dało się go podać w URL-u.

### 4. Sekrety zawsze przez `getOrThrow`

Nigdy `process.env.X ?? ''`. Pusty sekret nie wyłącza funkcji — **cicho wyłącza zabezpieczenie** (pusty klucz HMAC każdy odtworzy). Brak konfiguracji ma zatrzymać start:

```ts
config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');   // ✅
process.env.STRIPE_WEBHOOK_SECRET ?? ''               // ❌ fail-open
```

To samo w `docker-compose.yml`: `${VAR:?komunikat}`, nigdy `${VAR:-domyslne_haslo}`.

### 5. Prisma: `OR` w `where` łatwo się nadpisuje

Gdy dokładasz drugie zawężenie, przenieś warunki do `AND: [...]`. Dwa `OR` na jednym poziomie = drugi kasuje pierwszy, czyli **cichy wyciek**. Pamiętaj też, że `Class.teacherId` bywa `null` (prowadzącym jest wtedy nauczyciel grupy) i że zajęcia 1:1 **nie mają `groupId`** — sam filtr po grupach zgubi je uczniowi.

### 6. Nie loguj danych osobowych

W logach `user.id`, nigdy `user.email`. Logi trafiają dalej niż baza.

### 7. Każda naprawa dostępu dostaje test E2E

`e2e/access-control.spec.ts` — cudzy zasób zwraca **403**, własny **200**. Bez tego regresja wróci niezauważona. Testy jednostkowe weryfikują strukturę `WHERE` (gałęzie `OR`/`AND`), nie tylko wynik na zamockowanych danych.

### 8. Weryfikuj realnym żądaniem, nie samym testem

Przed uznaniem naprawy za gotową: zaloguj się jako każda rola i sprawdź `curl`-em, że cudze zasoby dają 403, a własne 200. Kilka dziur z audytu przeszłoby testy jednostkowe, bo dane testowe przypadkiem nie zawierały cudzego zasobu.

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

Cztery warstwy (repo jest **publiczne** od 2026-07-31, co odblokowało ochronę `main`):

1. **Pre-push hook** (`.githooks/pre-push`) — blokuje `git push`, jeśli kroki 1-6 nie przechodzą. Włącza się sam przez `prepare` w root `package.json` (`core.hooksPath`), więc po świeżym klonie wystarczy `npm install`. E2E i testy integracyjne są z niego wyłączone, bo wymagają Dockera. Awaryjnie: `git push --no-verify`.
2. **CI na każdym pushu** (`.github/workflows/ci.yml`) — dowolny branch, nie tylko `main`; PR-y dodatkowo testują wynik merge'a. `concurrency` anuluje poprzedni przebieg tego samego brancha. Repo publiczne = minuty Actions bez limitu.
3. **Pełne pokrycie w CI** — joby `api` (lint, build, unit, **integracyjne**), `web` (lint, build, unit), `e2e` (Playwright).
4. **Branch protection na `main`** — merge tylko z zielonymi `API` / `Web` / `E2E`, tryb `strict` (branch musi być zaktualizowany o `main`), zakaz force-pusha i kasowania brancha, `enforce_admins` obejmuje właściciela. **To jedyna warstwa, której nie da się ominąć** — `--no-verify` omija hook, ale nie ominie GitHuba.

Dodatkowo aktywne: **secret scanning z push protection** (push zawierający klucz API zostanie odrzucony) i **Dependabot** (alerty + automatyczne poprawki bezpieczeństwa).

Konsekwencja `enforce_admins`: bezpośredni push na `main` jest zablokowany także dla ciebie — każda zmiana idzie przez PR. Gdyby to przeszkadzało:
```bash
gh api -X DELETE repos/LalaSimon/Academy/branches/main/protection/enforce_admins
```

## Wersjonowanie — ZAWSZE nowy branch

- **Nigdy nie commitujemy bezpośrednio na `main`.** Każda praca = nowy branch utworzony z aktualnego `main`.
- Nazwa brancha wg Conventional Commits: `feat/...`, `fix/...`, `docs/...`, `chore/...`, `refactor/...` (np. `feat/parent-child-links`).
- Wypychamy branch (`git push -u origin <branch>`). **PR-y i merge do `main` można robić przez CLI** (`gh pr create` → `gh pr merge`) — zgoda właściciela z 2026-07-31. Wcześniej obowiązywał zakaz; został zniesiony, bo `main` jest teraz chroniony po stronie GitHuba i merge i tak nie przejdzie bez zielonego CI.
- Merge dopiero po zielonych checkach — nigdy `--admin` ani `--force` na obejście ochrony `main`.
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
