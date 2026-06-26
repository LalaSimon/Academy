# Academy Web

React SPA — frontend platformy edukacyjnej dla prywatnej szkoły językowej.

## Stack

- **React 19** + TypeScript — framework UI
- **Vite** — bundler i dev server z proxy na API
- **TanStack Query v5** — server state, caching, mutacje
- **Zustand** — client state (auth, UI preferences)
- **React Router v6** — routing z zagnieżdżonymi layoutami i PrivateRoute
- **Tailwind CSS v4** — utility-first stylowanie
- **shadcn/ui** — biblioteka komponentów (Button, Input, Dialog, Select...)
- **Framer Motion** — animacje przejść między stronami i micro-interactions
- **Recharts** — wykresy (dashboard, frekwencja, finanse)
- **Axios** — HTTP client z interceptorem auto-refresh JWT
- **Vitest + Testing Library** — testy jednostkowe
- **Playwright** — testy E2E

## Uruchomienie

```bash
# Dev (przez Docker Compose — zalecane)
docker compose up -d web

# Dev lokalnie (wymaga działającego API na :3000)
npm run dev      # Vite na :5173, proxy /api → localhost:3000

# Build produkcyjny
npm run build
npm run preview  # podgląd builda z proxy (używane w CI E2E)
```

## Struktura katalogów

```
src/
├── components/
│   ├── ui/              # shadcn/ui — nie modyfikujemy bezpośrednio
│   └── common/          # reużywalne: PageHeader, StatCard, EmptyState...
├── hooks/               # TanStack Query hooks per feature
│   ├── useAuth.ts       # useLogin, useLogout, useMe
│   ├── useRegister.ts   # useRegister, useVerifyEmail, useResendVerification, useSetupChild
│   ├── useUsers.ts
│   ├── useGroups.ts
│   ├── useClasses.ts
│   ├── useAttendance.ts
│   ├── useMaterials.ts
│   └── usePayments.ts
├── lib/
│   └── api.ts           # axios instance z interceptorem refresh JWT
├── pages/
│   ├── auth/            # LoginPage, RegisterPage, VerifyEmailPage
│   ├── admin/           # Dashboard, Users, Groups, Classes, Materials, Payments
│   ├── parent/          # ParentSetupPage, ParentDashboard, widoki per-dziecko
│   ├── student/         # StudentDashboard, Classes, Attendance, Groups, Materials, Payments
│   ├── teacher/         # TeacherDashboard (planowane)
│   └── LandingPage.tsx  # Publiczna strona główna
├── store/
│   └── auth.store.ts    # Zustand: user, accessToken, setAccessToken, logout
├── router/
│   └── PrivateRoute.tsx # Guard oparty na roli z redirect
└── test/
    └── motionMock.tsx   # Helper: cached framer-motion mock dla Vitest
```

## Komunikacja z API

**Zasada:** zero bezpośredniego `axios` w komponentach. Cały flow:

```
Komponent → custom hook → TanStack Query → api.ts → REST API
```

### `src/lib/api.ts`

Axios instance z `baseURL: '/api/v1'` i dwoma interceptorami:

1. **Request interceptor** — dołącza `Authorization: Bearer <token>` z Zustand store
2. **Response interceptor** — przy 401 wywołuje `POST /auth/refresh`, powtarza oryginalne zapytanie; kolejka `failedQueue` zapobiega wielokrotnemu refresh przy równoległych requestach

```typescript
import { api } from '@/lib/api';
// Nigdy: import axios from 'axios'

// URL-e w hookach bez prefiksu /api/v1 (baseURL to obsługuje):
api.get('/users')           // → /api/v1/users ✓
api.get('/api/v1/users')    // → /api/v1/api/v1/users ✗ (podwójny prefix)
```

### Wzorzec hooka

```typescript
// src/hooks/useUsers.ts
export function useUsers(params?: { role?: string; search?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.get('/users', { params }).then(r => r.data),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDto) =>
      api.post('/users', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Stan aplikacji

### Zustand — `auth.store.ts`

```typescript
interface AuthStore {
  user: AuthUser | null;      // persisted w localStorage
  accessToken: string | null; // tylko w pamięci (nie persisted)
  needsChildSetup: boolean;   // rodzic po pierwszym logowaniu
  setUser: (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}
```

`user` i `needsChildSetup` są persisted (survive F5). `accessToken` jest zawsze w pamięci — po odświeżeniu strony interceptor axios wywołuje refresh na pierwszym 401.

### TanStack Query — cache keys

Konwencja kluczy (ważne dla `invalidateQueries`):

| Klucz | Co cachuje |
|-------|-----------|
| `['users']` | lista użytkowników |
| `['users', id]` | profil użytkownika |
| `['users', id, 'stats']` | statystyki nauczyciela |
| `['groups']` | lista grup |
| `['groups', id]` | szczegóły grupy |
| `['classes', params]` | lista zajęć |
| `['attendance', 'class', classId]` | obecność dla zajęć |
| `['attendance', 'student', studentId]` | statystyki ucznia |
| `['materials', params]` | lista materiałów |
| `['payments', params]` | lista płatności |

**Powiązane inwalidacje — zawsze invaliduj wszystkie powiązane klucze:**
- Zmiana klasy → `['users']` (statystyki nauczyciela) + `['attendance', 'student']`
- Zmiana grupy → `['classes']` (klasy osadzają dane grupy)
- Dodanie/usunięcie ucznia z grupy → `['users', studentId]`
- Przypisanie materiału do klasy → `['materials', 'group']` (cascade GroupMaterial)

## Routing i ochrona tras

### Struktura routingu (`App.tsx`)

```
/                    → LandingPage (publiczna)
/login               → LoginPage (publiczna)
/register            → RegisterPage (publiczna)
/verify-email        → VerifyEmailPage (publiczna)
/parent/setup        → ParentSetupPage (PARENT, needsChildSetup)

/admin/*   → AdminLayout  (PrivateRoute: ADMIN)
/student/* → StudentLayout (PrivateRoute: STUDENT)
/parent/*  → ParentLayout (PrivateRoute: PARENT)
/teacher/* → TeacherLayout (PrivateRoute: TEACHER, planowane)
```

### `PrivateRoute`

Sprawdza `user.role` z Zustand store. Jeśli brak dostępu → redirect na `/login`. Jeśli rodzic z `needsChildSetup=true` → redirect na `/parent/setup`.

```tsx
<Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
  <Route path="/admin/*" element={<AdminLayout />} />
</Route>
```

## Testowanie

```bash
npm run test          # Vitest (watch mode)
npm run test -- --run # jednorazowe uruchomienie
```

### Suity testowe (42 testy)

| Plik | Testy | Co pokrywa |
|------|-------|-----------|
| `auth/__tests__/RegisterPage.test.tsx` | 13 | Render, wybór AccountType, walidacja, submit, toggle hasła, linki |
| `auth/__tests__/LoginPage.test.tsx` | 8 | Render, submit, toggle hasła, EMAIL_NOT_VERIFIED banner, loading |
| `auth/__tests__/VerifyEmailPage.test.tsx` | 12 | No-token screen, resend, verify flow, loading/success/error, timer redirect |
| `parent/__tests__/ParentSetupPage.test.tsx` | 9 | Render, submit, sukces + store update, CHILD_ALREADY_SET, disabled state |

### Konfiguracja testów

Vitest konfiguracja w `vite.config.ts` (środowisko `jsdom`).  
`tsconfig.app.json` wyklucza pliki testowe z buildu produkcyjnego.

### Kluczowe pułapki testowe

**framer-motion mock** — proxy musi cachować wyniki, inaczej React dostaje nowe referencje funkcji przy każdym renderze i unmountuje/remountuje drzewo, tracąc lokalny stan:

```typescript
vi.mock('framer-motion', () => {
  const cache: Record<string, unknown> = {};
  return {
    motion: new Proxy({}, {
      get: (_t, tag: string) => {
        if (!cache[tag]) {
          cache[tag] = ({ children, initial, animate, exit, transition,
                          variants, whileHover, whileTap, layout, layoutId, ...rest }: any) =>
            React.createElement(tag, rest, children);
        }
        return cache[tag];
      },
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});
```

**Formularze w jsdom** — `userEvent.click` na przycisku submit jest zawodny. Używaj `fireEvent.submit(form)`:

```typescript
fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@test.com' }});
fireEvent.submit(screen.getByRole('button', { name: /zaloguj/i }).closest('form')!);
```

**Fake timers + `waitFor`** — `vi.useFakeTimers()` blokuje `waitFor` (który sam używa setTimeout). Używaj `act(() => { fn(); vi.advanceTimersByTime(ms); })` i sprawdzaj synchronicznie:

```typescript
act(() => {
  capturedCallback.onSuccess?.();
  vi.advanceTimersByTime(2500);
});
expect(mockNavigate).toHaveBeenCalledWith('/login');
```

**Moduł-level state w mockach** — gdy mock factory musi zwracać różne wartości per test, zdefiniuj zmienną na poziomie modułu i zamknij ją w factory:

```typescript
let mockError: Error | null = null;
vi.mock('@/hooks/useRegister', () => ({
  useRegister: () => ({ mutate: mockMutate, error: mockError, isPending: false }),
}));
// W teście: mockError = new Error('...');
```

## Design System

- **Ciemny motyw** domyślnie na auth pages, jasny w panelach
- **Dark mode toggle** w sidebarze (Zustand persist + `dark` class na `<html>`)
- **Animacje przejść** — `AnimatePresence initial={false}` + `key={location.key}`
- **Kolory akcentów:** violet (główny), emerald (sukces), red (błąd)
- **Zaokrąglenia:** `rounded-xl` (karty), `rounded-lg` (inputy), `rounded-full` (badge)
- Nie używaj gradientów bez uzasadnienia; unikaj `h-screen` — używaj `min-h-[100dvh]`

## Konfiguracja Vite (proxy)

Vite proxy kieruje `/api/*` na backend. W dev: `http://localhost:3000` (lub `VITE_API_TARGET`).

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: process.env.VITE_API_TARGET ?? 'http://localhost:3000',
    changeOrigin: true,
  },
},
```

Dzięki temu hooki używają `/auth/login` (nie `http://localhost:3000/api/v1/auth/login`) i nie ma problemów z CORS.
