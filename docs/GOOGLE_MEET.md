# Automatyczne linki Google Meet

Nowe zajęcia mogą dostawać link Meet automatycznie. Integracja jest **opcjonalna
i domyślnie wyłączona** — bez niej link wpisuje się ręcznie przy tworzeniu zajęć,
dokładnie jak dotąd.

## Dlaczego to wymaga konfiguracji

Google Meet nie pozwala zbudować linku z identyfikatora zajęć — nie ma
deterministycznego URL-a. Jedyna droga to utworzenie wydarzenia w Kalendarzu
Google z `conferenceData`; dopiero wtedy Google odsyła `hangoutLink`.

Uwierzytelniamy się jako **konkretne konto Google** (OAuth2 + refresh token).
Service account **nie zadziała** bez Google Workspace z domain-wide delegation —
Google nie pozwala kontom serwisowym tworzyć spotkań Meet.

## Konfiguracja (jednorazowa, ~10 minut)

### 1. Projekt i API

1. [Google Cloud Console](https://console.cloud.google.com/) → nowy projekt
2. **APIs & Services → Library** → włącz **Google Calendar API**

### 2. Ekran zgody

**APIs & Services → OAuth consent screen**
- Typ: **External** (albo Internal, jeśli macie Workspace)
- Zakres: `https://www.googleapis.com/auth/calendar.events`
- Dodaj konto szkoły jako **test user** (przy typie External i statusie „Testing")

> ⚠ W trybie „Testing" refresh token wygasa po 7 dniach. Do produkcji trzeba
> opublikować aplikację (**Publish app**) — dla własnego użytku weryfikacja
> Google nie jest wymagana przy tym zakresie.

### 3. Poświadczenia

**Credentials → Create credentials → OAuth client ID** → typ **Desktop app**.
Zapisz `client_id` i `client_secret`.

### 4. Refresh token

Najprościej przez [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/):

1. Ikona koła zębatego → **Use your own OAuth credentials** → wklej `client_id` i `client_secret`
2. W liście zakresów wybierz `https://www.googleapis.com/auth/calendar.events`
3. **Authorize APIs** → zaloguj się kontem szkoły → **Exchange authorization code for tokens**
4. Skopiuj **Refresh token**

### 5. Zmienne środowiskowe

```bash
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=primary   # opcjonalne
```

Po restarcie API w logach pojawi się `Integracja Google Calendar włączona`.

## Zachowanie

| Sytuacja | Efekt |
|---|---|
| Integracja wyłączona | Link tylko z ręcznego wpisania — jak dotąd |
| Włączona, link **podany ręcznie** | Ręczny ma **pierwszeństwo** (można wskazać Zoom lub stały pokój) |
| Włączona, brak linku w formularzu | Link generowany automatycznie przy tworzeniu zajęć |
| Google zwróci błąd | Zajęcia powstają **bez linku**; błąd trafia do logów |

Ostatni wiersz jest celowy: brak linku nie może zablokować utworzenia lekcji.
Link można potem uzupełnić ręcznie, edytując zajęcia.

Linki generują się dla zajęć tworzonych pojedynczo **oraz** dla całych serii
(`POST /classes/bulk`) — każde zajęcia dostają własne spotkanie.

## Gdzie link jest widoczny

Automatycznie we wszystkich portalach, bez dodatkowej pracy — przycisk „Dołącz"
otwiera spotkanie w nowej karcie:

- **nauczyciel** — dashboard (zajęcia na dziś) i lista zajęć
- **uczeń** — dashboard i lista zajęć (dla `SCHEDULED` i `ONGOING`)
- **rodzic** — zajęcia dziecka (dla `SCHEDULED`)
- **admin** — lista zajęć

Link trafia też do maila z przypomnieniem o zajęciach (cron ~30 min przed).

## Koszty i limity

Calendar API jest darmowe. Domyślny limit to 1 000 000 zapytań dziennie —
przy jednym zapytaniu na utworzone zajęcia jest to nieosiągalne.
