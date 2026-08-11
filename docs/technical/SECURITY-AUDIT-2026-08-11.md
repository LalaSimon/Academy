# Audyt bezpieczeństwa — 2026-08-11

Zakres: rate limiting, odporność na nadużycia generujące **koszty** (egress, storage,
Resend, Stripe, CPU bazy), kontrola dostępu, hardening auth, konfiguracja fail-open.
Objęte: `apps/api` (172 trasy), `apps/web`, `docker-compose.yml`, CI.

Poprzedni audyt (2026-07-31/08-02) zamknął dziury typu „`@Roles()` przepuszcza rolę,
ale nikt nie sprawdza czyj jest zasób". Ten audyt szuka czegoś innego: **czego może
dokonać uprawniony (albo świeżo zarejestrowany) użytkownik, jeśli będzie to robił
10 000 razy na minutę**. Rejestracja jest otwarta, więc „uwierzytelniony" nie znaczy
„zaufany" — konto STUDENT stoi jeden formularz od anonimowego atakującego.

## Model zagrożenia — skąd bierze się rachunek

| Wektor | Zasób palony | Kto może |
|---|---|---|
| Pobieranie plików w pętli | egress (najdroższa pozycja u każdego dostawcy) | dowolny zalogowany |
| Upload wielkich plików | RAM procesu API + storage | TEACHER, ADMIN |
| Rejestracja / reset hasła w pętli | limit Resend, reputacja domeny | anonim |
| `POST /payments/:id/checkout` w pętli | rate limit API Stripe, sesje w panelu | STUDENT, PARENT |
| Raporty XLSX | CPU + RAM (cały wynik budowany w pamięci) | ADMIN |
| Listy bez `@Max` na `limit` | CPU bazy, RAM, egress | dowolny zalogowany |

## Ustalenia

Numeracja = kolejność wdrożenia. Priorytet: **P0** = da się wywołać dziś i boli od razu.

---

### P0-1. Brak globalnego rate limitingu — limit ma 5 tras ze 172

`ThrottlerGuard` jest podpięty **punktowo** w `auth.controller.ts` (`@UseGuards(ThrottlerGuard)`
na login/register/resend/forgot/reset). Guard **nie jest globalny** — komentarz w
`app.module.ts` mówi wprost, że to celowe, „żeby nie dławić normalnego korzystania".

Skutek: wszystkie pozostałe trasy — w tym streaming plików, raporty XLSX i tworzenie
sesji Stripe — przyjmują **nieograniczoną** liczbę żądań od dowolnego zalogowanego konta.
Rejestracja jest otwarta, więc próg wejścia to jeden `POST /auth/register`.

**Naprawa:** globalny `ThrottlerGuard` z warstwą domyślną + osobne, ostrzejsze warstwy
dla operacji drogich (upload, download, raport, checkout). Warstwa domyślna musi być na
tyle luźna, żeby nie przeszkadzała realnej pracy (dashboard robi kilkanaście żądań przy
wejściu), i na tyle ciasna, żeby pętla `while true` nie miała sensu.

---

### P0-2. Upload: `MaxFileSizeValidator` sprawdza rozmiar **po** zbuforowaniu pliku w RAM

`materials.controller.ts`:

```ts
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
upload(@UploadedFile(new ParseFilePipe({
  validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
}))
```

`FileInterceptor` nie dostał `limits`, więc multer wczytuje **całe** ciało żądania do
pamięci procesu, a `ParseFilePipe` ogląda wynik dopiero, gdy transfer się skończył.
Wysłanie pliku 5 GB kładzie API na OOM, zanim walidator w ogóle się wykona — deklarowany
limit 50 MB nie chroni przed niczym. Kilka takich żądań równolegle = restart kontenera.

**Naprawa:** `limits: { fileSize, files: 1 }` w `FileInterceptor` — multer przerywa
strumień w momencie przekroczenia. `MaxFileSizeValidator` zostaje jako druga warstwa
i źródło czytelnego 422.

---

### P0-3. `trust proxy` nieustawione — limity liczone po IP proxy

`ThrottlerGuard` domyślnie kubełkuje po `req.ip`. Za reverse proxy / CDN (a tak stanie
produkcja) `req.ip` to adres **proxy**, jeden dla wszystkich. Konsekwencja jest gorsza
niż brak limitu: pierwszy user, który wyczerpie limit, blokuje **wszystkich** — atakujący
wyłącza logowanie całej szkole 10 żądaniami. Odwrotny błąd (ślepe `trust proxy: true`)
jest równie zły: `X-Forwarded-For` jest wtedy podmienialny przez klienta i limit obchodzi
się jednym nagłówkiem.

**Naprawa:** `app.set('trust proxy', <liczba warstw z env>)`, domyślnie `0` (bez proxy).
Liczba, nie `true` — Express odlicza wtedy dokładnie tyle wpisów z prawej strony XFF,
ile faktycznie dokłada nasza infrastruktura, a wpisy dopisane przez klienta ignoruje.

---

### P0-4. `ClassQueryDto.limit` bez `@Max` — `?limit=1000000` zwraca całą tabelę

`class-query.dto.ts` ma `@Min(1)` i **nie ma** `@Max`. `classes.service.findAll` domyśla
się `limit = 50`, ale wartość z query idzie prosto do `take`. Pozostałe DTO (`users`,
`payments`, `materials`, `notifications`) mają `@Max(100)` — to przeoczenie, nie decyzja.

Zajęcia są dołączane z grupą, nauczycielem i uczniami, więc jeden request pobiera bazie
kilkaset MB i tyle samo wysyła w egress.

**Naprawa:** `@Max(MAX_CLASSES_PAGE_SIZE)` + twarde domknięcie po stronie serwisu
(`Math.min`), żeby kolejny wywołujący bez DTO też nie mógł tego ominąć.

Sufit wynosi **200**, nie 100 jak w pozostałych listach. Pierwsze podejście z setką
wywróciło trzy widoki (`ClassesPage`, `TeacherClassesPage`, `TeacherDashboardPage`),
bo kalendarz pobiera cały miesiąc zajęć jednym żądaniem — wyszło to dopiero w E2E,
nie w testach jednostkowych. Sufit ma odciąć zrzut całej tabeli, a nie narzucać
stronicowanie tam, gdzie go nie ma; 200 rekordów robi jedno i nie robi drugiego.

---

### P0-5. Pobieranie plików bez limitu — egress na koszt właściciela

`GET /materials/:id/file` sprawdza uprawnienia (`assertCanReadMaterial` — poprawka
z poprzedniego audytu), ale nie ma żadnego ograniczenia częstotliwości. Uczeń z legalnym
dostępem do materiału 50 MB, pobierający go w pętli, generuje ~3 GB/min transferu.
To jest najdroższa pozycja rachunku u każdego dostawcy i jednocześnie najprostszy atak
w całym zestawieniu — jedna linijka w `curl`.

**Naprawa:** osobna warstwa `download`.

---

### P1-6. Upload bez listy dozwolonych typów i bez limitu częstotliwości

Poza rozmiarem (P0-2) upload nie waliduje **niczego**: `detectType(file.mimetype)` ufa
typowi podanemu przez wgrywającego, a rozszerzenie klucza w MinIO bierze się z
`file.originalname.split('.').pop()`. Można wgrać `.html` albo `.svg` z aktywnym
skryptem. Pobieranie broni się dziś wyłącznie nagłówkiem `Content-Disposition: attachment`
i `nosniff` — jedna zmiana w streamowaniu i robi się z tego stored XSS na naszej domenie.

Brak limitu częstotliwości oznacza też, że konto TEACHER może zapełnić bucket w tempie
łącza — rachunek za storage rośnie liniowo i nikt tego nie zauważy.

**Naprawa:** allowlista MIME (dokumenty, obrazy, audio/wideo, archiwa), sanityzacja
rozszerzenia do allowlisty, warstwa `upload` (kilka plików na minutę wystarcza do pracy).

---

### P1-7. Mail bombing konkretnej ofiary — limit jest per IP, nie per adresat

`forgot-password` i `resend-verification` mają warstwę `mail` (3/min), ale liczoną
**po IP**. Atakujący z pulą adresów (albo zwykłym VPN-em) wysyła ofierze dowolną liczbę
maili resetujących: skrzynka ofiary zalana, nasza domena ląduje w spamie, a każdy mail
to pozycja na rachunku Resend. Limit per IP nie dotyka tego scenariusza w ogóle.

**Naprawa:** dodatkowy licznik **per adres e-mail** (Redis albo pamięć procesu), niezależny
od IP. Odpowiedź musi zostać identyczna (`{ message: 'ok' }`) — inaczej dokładamy oracle
„czy ten adres istnieje".

---

### P1-8. `POST /payments/:id/checkout` bez limitu — pętla po API Stripe

Kontroler poprawnie sprawdza właściciela płatności, ale nie ogranicza częstotliwości.
Uczeń może w pętli tworzyć sesje Checkout dla **własnej** płatności — każde wywołanie to
request do API Stripe. Efekt: wyczerpanie rate limitu Stripe (czyli realne płatności
innych uczniów zaczynają failować) i śmietnik w panelu.

**Naprawa:** warstwa `checkout`.

---

### P1-9. Raporty XLSX bez limitu i bez ograniczenia zakresu

`ReportsController` (ADMIN) buduje cały skoroszyt w pamięci przez `exceljs`, bez paginacji
i bez maksymalnego zakresu dat. `GET /reports/students` bez filtrów = wszyscy użytkownicy
w jednym arkuszu. Rola jest zaufana, ale przejęta sesja admina albo zwykła pomyłka
w pętli skryptu kładzie proces — a limitu, który by to wyhamował, nie ma.

**Naprawa:** warstwa `report` (kilka raportów na minutę to i tak więcej, niż człowiek
kliknie) + twardy limit wierszy z czytelnym błędem zamiast OOM.

---

### P1-10. `RefreshToken` rośnie w nieskończoność

Każde logowanie tworzy wiersz; `refresh` kasuje stary i wstawia nowy; `logout` kasuje
swój. Ale sesja porzucona bez wylogowania (zamknięta karta, wyczyszczone ciasteczka)
zostaje w tabeli **na zawsze** — `expiresAt` mija i nikt tego wiersza nie sprząta.
Nigdzie w kodzie nie ma czyszczenia po `expiresAt` (jedyne `deleteMany` to reset hasła
i logout). Tabela puchnie, `findUnique` po `token` zwalnia, kopie zapasowe rosną.

**Naprawa:** cron kasujący wygasłe tokeny.

---

### P2-11. Materiały: TEACHER może skasować i przypiąć **cudzy** materiał

Dokładnie ten wzorzec, który poprzedni audyt wypleniał — pominięty w czterech miejscach:

```ts
@Delete(':id')            @Roles(ADMIN, TEACHER)  remove(@Param('id') id)
@Post(':id/classes/:classId')    @Roles(ADMIN, TEACHER)  assignToClass(...)
@Delete(':id/classes/:classId')  @Roles(ADMIN, TEACHER)  removeFromClass(...)
@Post(':id/groups/:groupId')     @Roles(ADMIN, TEACHER)  assignToGroup(...)
@Delete(':id/groups/:groupId')   @Roles(ADMIN, TEACHER)  removeFromGroup(...)
```

Żaden nie pyta, **czyj** jest materiał ani **czyje** są zajęcia/grupa. Nauczyciel może:
skasować materiał innego nauczyciela; wypiąć cudzy materiał z cudzych zajęć; przypiąć
dowolny materiał (także cudzy, także nieprzeznaczony dla uczniów) do **dowolnej** grupy
w szkole — czyli opublikować go uczniom, których nie uczy. To zapis o skutkach widocznych
dla użytkowników, czyli kategoria z reguły nr 2 w `CLAUDE.md`.

**Naprawa:** `assertCanReadMaterial` + `assertCanAccessClass` / `assertCanReadGroup`
w każdej z tych tras. Do kasowania potrzebna nowa metoda `assertCanModifyMaterial`
(właściciel albo admin) — dodana w `AccessControlService`, nie inline.

---

### P2-12. `GET /attendance/student/:studentId` — TEACHER bez zawężenia

Kontroler sprawdza STUDENT (tylko siebie) i PARENT (tylko dzieci), ale dla TEACHER
**nie sprawdza nic**. Dowolny nauczyciel pobiera pełną statystykę frekwencji dowolnego
ucznia w szkole, także takiego, którego nigdy nie uczył.

**Naprawa:** nauczyciel widzi ucznia tylko wtedy, gdy łączą ich zajęcia lub grupa —
nowa metoda `assertCanReadStudent` w `AccessControlService`.

---

### P3-13. Logowanie: oracle czasowy i enumeracja kont

```ts
const user = await this.prisma.user.findUnique({ where: { email, isActive: true } });
if (!user) throw new UnauthorizedException('Invalid credentials');
const passwordValid = await argon2.verify(user.passwordHash, dto.password);
```

Nieistniejący adres → odpowiedź natychmiast. Istniejący → argon2 mieli ~50–100 ms.
Różnica jest mierzalna zdalnie i pozwala odsiać prawdziwe adresy przed atakiem
słownikowym. Komunikat jest ten sam, ale czas już nie.

**Naprawa:** przy braku użytkownika i tak wykonaj `argon2.verify` na stałym haszu-atrapie.

---

### P3-14. Brak blokady konta po serii nieudanych logowań

Jedyna obrona przed zgadywaniem hasła to limit 10/min **per IP**. Botnet albo pula
proxy rozkłada to na dowolnie wiele adresów i limit przestaje cokolwiek znaczyć —
konto z hasłem ze słownika padnie. Licznika nieudanych prób per konto nie ma.

**Naprawa:** licznik nieudanych logowań per konto + czasowa blokada rosnąca z liczbą
prób. Odpowiedź bez zmian (`Invalid credentials`), żeby nie zdradzać stanu blokady.

---

### P3-15. Tokeny sesji i resetu trzymane w bazie jawnie

`RefreshToken.token` to surowe 64 bajty hex, `passwordResetToken` — 32 bajty hex,
oba zapisane wprost. Każdy odczyt bazy (backup na dysku dewelopera, dump w logu, SQLi
w przyszłym endpoincie) daje atakującemu **gotowe** sesje na 7 dni i możliwość zmiany
cudzego hasła. Hasła haszujemy argon2 właśnie po to, żeby wyciek bazy nie był końcem
świata — a obok leżą poświadczenia równoważne zalogowaniu.

**Naprawa:** trzymać SHA-256 z tokenu (token jest losowy i wysokoentropijny, więc
KDF nie jest potrzebny — to nie hasło), porównywać po haszu. Klient dostaje surowy
token jak dotąd, więc nic się dla niego nie zmienia.

---

### P4-16. MinIO: fail-open na domyślne `minioadmin`

```ts
accessKey: this.config.get('MINIO_ACCESS_KEY', 'minioadmin'),
secretKey: this.config.get('MINIO_SECRET_KEY', 'minioadmin'),
```

Dokładnie wzorzec zakazany regułą nr 4 w `CLAUDE.md`, tyle że w `config.get` z drugim
argumentem zamiast `?? ''`. Wdrożenie bez kompletu zmiennych **wstaje** i po cichu łączy
się znanym hasłem — zamiast zatrzymać start. `docker-compose.yml` został już naprawiony
(`${VAR:?}`), kod nie.

`MailService` ma ten sam kształt na `RESEND_API_KEY` (`config.get` bez `getOrThrow`) —
tu skutek jest łagodniejszy (mail nie wychodzi), ale niespójny z regułą.

**Naprawa:** `getOrThrow` dla poświadczeń i nazwy bucketu; `MINIO_PORT`/`MINIO_USE_SSL`
mogą zostać z sensownym domyślnym, bo nie są sekretem.

---

## Czego audyt **nie** znalazł (sprawdzone, w porządku)

- **Frontend nie trzyma tokenu w `localStorage`** — `partialize` w `auth.store.ts` zapisuje
  wyłącznie `user`, access token żyje w pamięci, refresh w `httpOnly` cookie. Zero
  `dangerouslySetInnerHTML` i `innerHTML` w całym `apps/web`.
- **Webhook Stripe** weryfikuje podpis przez `constructEvent` na `rawBody`, sekret przez
  `getOrThrow` — poprawnie.
- **`JWT_SECRET`** przez `getOrThrow` w obu miejscach (podpisywanie i strategia).
- **Prisma** — zero surowego SQL (`$queryRaw`/`$executeRaw` nie występują), brak wektora SQLi.
- **`ValidationPipe`** z `whitelist` + `forbidNonWhitelisted` + `transform` globalnie.
- **Logi** — `RequestLoggerMiddleware` loguje `user.id`, nigdy `email` (reguła nr 6).
- **Reset hasła** unieważnia wszystkie sesje (`refreshToken.deleteMany` w transakcji).
- **Rotacja refresh tokenów** — stary kasowany przy każdym `refresh`.
- **`forgot-password`** nie zdradza istnienia konta (zawsze `{ message: 'ok' }`).

## Kolejność wdrożenia

P0 (1–5) → P1 (6–10) → P2 (11–12) → P3 (13–15) → P4 (16).
Każda zmiana dotykająca kontroli dostępu dostaje test E2E w `e2e/access-control.spec.ts`
(reguła nr 7): cudzy zasób → **403**, własny → **200**.
