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

# 5. Web — build
cd apps/web && npm run build

# 6. Commit i push
git add ... && git commit ... && git push
```

Jeśli lint/test/build failuje — napraw przed commitem. Nie commituj "będzie naprawione w następnym commicie".

## Docker — ważne zasady

- Po `npm install` w `apps/api` lub `apps/web` MUSISZ zrebuildować obraz: `docker compose build api` / `docker compose build web`.
- Diagnoza 404 na API: `docker logs academy_api --tail 30`.
- Nowe pliki w `apps/web/src/` są dostępne przez volume mount — nie wymagają rebuildu (HMR działa). Ale nowe zależności w `package.json` wymagają rebuildu.

## Znane problemy / wzorce

- `@base-ui/react` Select: `onValueChange` zwraca `string | null` — zawsze guarduj: `(v: string | null) => v && setValue(...)`.
- `@base-ui/react` Select.Value pokazuje raw value, nie label — zawsze ręcznie wyszukuj label przez `.find()`.
- `Role` importuj z `@prisma/client`, nie z własnych enumów.
- Po dodaniu shadcn komponentu napraw importy: `src/lib/utils` → `@/lib/utils`.
