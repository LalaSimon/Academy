# Wdrożenie produkcyjne — analiza i plan

Stan na 2026-08-11. Dokument odpowiada na pytanie „gdzie i jak to postawić", nie
„co jeszcze zbudować" — lista zadań jest w `ROADMAP.md`, Faza 6.

## Punkt wyjścia — co narzuca wybór hostingu

Trzy cechy tej aplikacji zawężają pole wyboru zanim jeszcze spojrzymy na ceny:

**1. API musi działać w DOKŁADNIE JEDNEJ instancji.** Cztery `@Cron` siedzą wewnątrz
procesu API (`payments.service`: `markOverdue` i cykl miesięczny; `notifications.service`:
przypomnienia o zajęciach co 5 min i o płatnościach dziennie). Druga instancja =
uczniowie dostają maile i powiadomienia po dwa razy. To wyklucza platformy, których
modelem domyślnym jest autoskalowanie, albo wymaga twardego przypięcia `replicas: 1`
i pilnowania, żeby nikt tego nie ruszył.

**2. Pliki lecą przez API, nie przez presigned URL.** `GET /materials/:id/file`
streamuje z MinIO przez proces Node. Egress liczy się więc podwójnie: storage → API →
przeglądarka. Przy hostingu rozliczającym transfer to realna pozycja kosztowa (stąd
warstwa `download` w limitach — patrz `SECURITY-AUDIT-2026-08-11.md`).

**3. Dane osobowe małoletnich + płatności.** RODO, a w praktyce: infrastruktura w UE
i umowa powierzenia przetwarzania z każdym dostawcą, który dotyka danych.

## Rekomendacja

**VPS w UE + Docker Compose + Caddy**, storage plików przeniesiony z MinIO do
obiektowego S3, Postgres w kontenerze **z rygorystycznym backupem** albo managed.

Uzasadnienie w jednym zdaniu: obecny `docker-compose.yml` działa 1:1 bez przepisywania,
jedna instancja jest stanem naturalnym (patrz punkt 1), a koszt jest stały i
przewidywalny zamiast rosnąć z ruchem.

### Dlaczego nie PaaS

Railway/Render/Fly zdejmują robotę operacyjną, ale tutaj kosztują trzy rzeczy naraz:
wymianę MinIO na S3 (i tak ją rekomendujemy, więc to akurat nie boli), twarde pilnowanie
liczby instancji, oraz cenę rosnącą z użyciem — przy modelu „pliki przez API" transfer
jest tą pozycją, która rośnie najszybciej. Dla porównania: [Railway przy umiarkowanym
obciążeniu wychodzi 30–60 USD/mies., Render liczy minimum 7 USD za usługę][coolify-vs-railway],
podczas gdy [VPS za ~6 USD z Coolify hostuje to, co na PaaS kosztowałoby 60–100 USD][coolify-alt].

PaaS ma sens dopiero wtedy, gdy czas właściciela na operacje jest droższy niż różnica
w rachunku. Przy jednoosobowej szkole i jednym środowisku to jeszcze nie ten moment —
ale jest to decyzja do rewizji, nie dogmat.

### Warianty do wyboru

| | A. Compose + Caddy | B. Coolify/Dokploy | C. PaaS |
|---|---|---|---|
| Koszt infra | ~€6–10/mies. | ~€6–10/mies. + panel | ~$30–60/mies. |
| Deploy | skrypt / GitHub Actions | git push → auto | git push → auto |
| TLS | Caddy automatycznie | wbudowane | wbudowane |
| Backupy | własny cron | wbudowany harmonogram → S3 | wbudowane (płatne) |
| Ryzyko | wszystko na Tobie | jeden komponent więcej do utrzymania | vendor lock-in |
| Pasuje gdy | chcesz przewidywalności | chcesz UI i rollbacków | czas > pieniądze |

**Wybór: A na start.** Compose już działa i jest zrozumiały; Caddy dokłada TLS jednym
plikiem konfiguracyjnym. [Coolify stał się w 2026 domyślnym sposobem unikania „cloud
tax"][coolify-alt] i jest sensowną ścieżką rozwoju, jeśli ręczne deploye zaczną męczyć —
ale to jeden dodatkowy system, który sam może się zepsuć, a jego przewaga (git-push,
rollbacki, backupy z UI) jest realna dopiero przy kilku projektach.

## Dostawcy — konkrety

### Serwer

**Hetzner CX22** (Falkenstein albo Helsinki — oba w UE), 2 vCPU / 4 GB RAM / 40 GB.
[Ceny Hetznera wzrosły od 1 kwietnia 2026][hetzner-press]; najmniejsze instancje CX/CAX
mieszczą się dziś w [€5,49–10,49/mies. w Niemczech i Finlandii][hetzner-review].
4 GB RAM to zapas: API + Postgres + Caddy zmieszczą się w ~1,5 GB, reszta to bufor na
`pg_dump` i build.

Alternatywy w UE, gdyby Hetzner odpadł: Scaleway, OVH, UpCloud. Kryterium jest to samo —
lokalizacja w UE i umowa powierzenia.

⚠ Ceny zweryfikuj przed zakupem — powyższe pochodzą z przeglądów, nie z cennika.

### Baza danych — decyzja do podjęcia świadomie

To najważniejszy wybór na tej liście, bo dotyczy jedynego zasobu, którego utraty **nie
da się odtworzyć**.

**Wariant 1 — Postgres w kontenerze + backupy.** Tanio (0 zł), pełna kontrola, ale
backup, weryfikacja backupu i odtworzenie po awarii są na Tobie. Wykonalne, pod warunkiem
że traktujesz to poważnie (patrz sekcja o backupach niżej).

**Wariant 2 — managed Postgres.** Zdejmuje backupy i PITR, czyli największe ryzyko
solo-deploymentu. [Neon ma darmowy tier bez wygasania i z zasypianiem po 5 min
bezczynności][neon-free] — uwaga: zasypianie oznacza zimny start przy pierwszym żądaniu,
co przy API budzonym cronem co 5 minut i tak nie zdąży zajść. [Płatne plany Neona i
Supabase zaczynają się w okolicach 30–75 USD/mies. dla EU][managed-pg], więc różnica
wobec kontenera to realny wydatek.

**Rekomendacja: wariant 1 na start, ale tylko z odtworzeniem przećwiczonym na sucho.**
Jeśli po miesiącu okaże się, że nie masz dyscypliny na comiesięczny test restore'a —
przenieś się na managed. Baza danych szkoły to frekwencja, płatności i dane
uczniów; jej utrata kończy działalność, nie psuje wieczór.

### Pliki — przenieść z MinIO

Jednowęzłowe MinIO na tym samym VPS-ie **dzieli domenę awarii z całą resztą**: pada
serwer, znikają materiały. Do tego dochodzi kolejny kontener do aktualizowania.

Rekomendacja: **Cloudflare R2** albo **Backblaze B2**. [R2 kosztuje $0,015/GB przy
zerowym egressie; B2 to ~$0,006/GB, czyli 60% taniej za samo składowanie, z darmowym
egressem do 3× miesięcznego wolumenu][r2-vs-b2]. Przy modelu „pliki lecą przez API"
egress i tak płacisz VPS-em, więc **B2 wychodzi taniej**; R2 wygrywa dopiero, gdy
kiedyś przejdziesz na presigned URL-e i serwowanie bezpośrednio z CDN.

Koszt migracji jest niski: `MinioService` używa S3-kompatybilnego SDK, więc zmiana to
`MINIO_ENDPOINT`, klucze i `MINIO_USE_SSL=true`. ⚠ Wymaga weryfikacji na żywo —
kompatybilność S3 bywa niepełna w szczegółach (`statObject`, metadane).

### Poczta

Resend już jest w kodzie. Do produkcji potrzeba: własnej domeny zweryfikowanej w Resend
oraz **SPF, DKIM i DMARC** w DNS. Bez tego maile o resecie hasła i danych logowania
dziecka będą lądować w spamie — a to są wiadomości, bez których użytkownik nie wejdzie
do aplikacji.

### Płatności

Stripe wymaga przed trybem live: zweryfikowanego konta firmowego (KYC), podanego numeru
konta, oraz **regulaminu i polityki prywatności pod publicznym adresem** — Stripe to
sprawdza. Webhook trzeba zarejestrować w dashboardzie i wziąć stamtąd
`STRIPE_WEBHOOK_SECRET`; dzisiejszy `stripe listen --skip-verify` w compose to wyłącznie
tryb deweloperski i **nie może** trafić na produkcję.

## Backupy — jedyna rzecz, której nie wolno odpuścić

> Backup, którego nie odtworzono, nie jest backupem.

Zakres: **baza** (frekwencja, płatności, użytkownicy) i **bucket plików** (materiały).
Bez obu odtworzenie jest niepełne.

Minimum, które faktycznie działa:
- `pg_dump` w cronie **systemowym** na hoście (nie w API — proces aplikacji nie powinien
  odpowiadać za własne kopie), codziennie, z kompresją
- wysyłka **poza serwer** (B2/R2), retencja np. 7 dziennych + 4 tygodniowe
- szyfrowanie kopii przed wysyłką
- **comiesięczny test odtworzenia** na czystej bazie — wpisany w kalendarz, nie „jak
  będzie czas". [Backupy mają wartość tylko wtedy, gdy da się je odtworzyć, a regularne
  testy są jedynym sposobem, żeby to wiedzieć][backup-testing]

Dla `pg_dump` w zupełności wystarczy `restic` albo prosty skrypt z `aws s3 cp`.
[pgBackRest to standard dla kopii fizycznych z PITR][pgbackrest] i ma sens dopiero,
gdy utrata jednego dnia danych zacznie być nie do przyjęcia — wtedy warto, ale
[odtwarzanie z niego w Dockerze jest wyraźnie trudniejsze niż samo tworzenie kopii][pgbackrest-docker].

## Architektura docelowa

```
                    Internet
                       │
                   [ DNS: A → VPS ]
                       │
              ┌────────▼─────────┐
              │  Caddy (80/443)  │  automatyczny Let's Encrypt
              │  reverse proxy   │  jedyny kontener z portami na hoście
              └───┬──────────┬───┘
                  │          │
         /api/v1/*│          │ /*
              ┌───▼───┐  ┌───▼────────┐
              │  API  │  │ web (dist) │  statyczne pliki
              │ :3000 │  │            │  budowane w obrazie
              └───┬───┘  └────────────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
   ┌────▼───┐  ┌──▼──────┐  ┌▼─────────────┐
   │Postgres│  │  B2/R2  │  │ Stripe/Resend│
   │ (sieć  │  │ (pliki) │  │   /Google    │
   │ wewn.) │  └─────────┘  └──────────────┘
   └────┬───┘
        │
   [ pg_dump cron → B2, szyfrowane, retencja 7d/4w ]
```

Kluczowe: **żaden port poza 80/443 nie jest mapowany na hosta.** Dziś compose wystawia
`5432`, `6379`, `9000`, `9001` — w dev wygodne, na produkcji oznacza publicznie dostępną
bazę.

## Czego brakuje w repo, żeby to postawić

Stan faktyczny na 2026-08-11 — zweryfikowany w kodzie, nie z pamięci:

| Element | Stan |
|---|---|
| `apps/api/Dockerfile` (produkcyjny) | ✗ **nie istnieje** — jest tylko `Dockerfile.dev` |
| `apps/web/Dockerfile` (produkcyjny) | ✗ **nie istnieje** — jest tylko `Dockerfile.dev` |
| `docker-compose.prod.yml` | ✗ nie istnieje |
| `Caddyfile` | ✗ nie istnieje |
| `.dockerignore` | ✗ nie istnieje |
| Health check endpoint | ✗ nie istnieje (`/health` nie jest zarejestrowany) |
| Skrypt tworzący pierwszego admina | ✗ nie istnieje (`e2e/helpers/seed.js` to fixture testowy) |
| Redis | ⚠ w compose i `.env`, **zero odwołań w kodzie** — do usunięcia |
| Pipeline deploy | ✗ jest tylko `ci.yml` |
| Monitoring / error tracking | ✗ brak (żadnego Sentry/pino/OTel) |

`Dockerfile.dev` obu aplikacji robi `npm install` i uruchamia tryb watch — nie nadaje
się na produkcję ani rozmiarem, ani sposobem uruchomienia. Potrzebne są obrazy
wieloetapowe: build → `node:24-alpine` z samym `dist` i produkcyjnymi zależnościami dla
API, oraz build → statyczne pliki serwowane przez Caddy dla frontendu.

## Szacunkowy koszt miesięczny

| Pozycja | Koszt |
|---|---|
| VPS (Hetzner CX22) | ~€6–10 |
| Domena | ~50–80 PLN/rok |
| Backblaze B2 (pliki + backupy, <50 GB) | < €1 |
| Resend | 0 (darmowy tier) → €20 przy większym wolumenie |
| Stripe | prowizja od transakcji, bez abonamentu |
| **Razem** | **~€10–15/mies.** + prowizje |

Wariant z managed Postgres podnosi to o ~€30–70/mies. — i jest to uczciwa cena za
zdjęcie z siebie ryzyka utraty bazy.

---

## Źródła

- [Hetzner Cloud Review 2026 — benchmarki i ceny][hetzner-review]
- [Hetzner — nowe plany CX i zmiana cen][hetzner-press]
- [Coolify vs Railway — porównanie kosztów][coolify-vs-railway]
- [7 alternatyw dla Coolify w 2026][coolify-alt]
- [Porównanie managed PostgreSQL 2026][managed-pg]
- [Neon — darmowy tier][neon-free]
- [Cloudflare R2 vs Backblaze B2 vs S3][r2-vs-b2]
- [Testowanie odtwarzania kopii PostgreSQL][backup-testing]
- [pgBackRest][pgbackrest] · [pgBackRest PITR w Dockerze][pgbackrest-docker]
- [Traefik vs Caddy vs Nginx dla Dockera (2026)][proxy-compare]

[hetzner-review]: https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/
[hetzner-press]: https://www.hetzner.com/pressroom/new-cx-plans/
[coolify-vs-railway]: https://ecn-apps.com/pages/articles/coolify-vs-railway.html
[coolify-alt]: https://northflank.com/blog/coolify-alternatives-in-2026
[managed-pg]: https://selfhost.dev/blog/managed-postgresql-comparison-2026/
[neon-free]: https://hoststack.dev/blog/managed-postgresql-europe-buyers-guide
[r2-vs-b2]: https://tech-insider.org/cloudflare-r2-vs-s3-vs-backblaze-b2-2026/
[backup-testing]: https://oneuptime.com/blog/post/2026-01-21-postgresql-backup-testing/view
[pgbackrest]: https://pgbackrest.org/
[pgbackrest-docker]: https://dataegret.com/2025/12/pgbackrest-pitr-in-docker-a-simple-demo/
[proxy-compare]: https://www.virtua.cloud/learn/en/concepts/traefik-caddy-nginx-docker-reverse-proxy
