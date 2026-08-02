# API Design

## Konwencje

- **Base URL:** `/api/v1`
- **Format:** JSON
- **Auth:** Bearer JWT w headerze `Authorization`
- **Paginacja:** `?page=1&limit=20`
- **Filtry:** query params, np. `?status=ACTIVE&groupId=xxx`

## Endpointy

> Lista odzwierciedla trasy zarejestrowane przez NestJS (stan 2026-08-02).
> Role w nawiasach to `@Roles()`; **poza rolą** większość endpointów sprawdza
> dodatkowo, **czyj jest zasób** — patrz „Kontrola dostępu" niżej.

### Auth
```
POST   /api/v1/auth/login                 → logowanie                    [publiczny, limit 10/min]
POST   /api/v1/auth/register              → rejestracja (student|parent) [publiczny, limit 3/min]
GET    /api/v1/auth/verify-email?token=   → weryfikacja e-maila          [publiczny]
POST   /api/v1/auth/resend-verification   → ponowna wysyłka              [publiczny, limit 3/min]
POST   /api/v1/auth/forgot-password       → link resetu hasła            [publiczny, limit 3/min]
POST   /api/v1/auth/reset-password        → ustawienie nowego hasła      [publiczny, limit 10/min]
POST   /api/v1/auth/setup-child           → konto dziecka                [PARENT]
POST   /api/v1/auth/refresh               → rotacja tokenów              [cookie]
POST   /api/v1/auth/logout                → wylogowanie
GET    /api/v1/auth/me                    → dane zalogowanego
```

### Users
```
GET    /api/v1/users                      → lista (rola, szukaj, isMinor)     [ADMIN]
POST   /api/v1/users                      → tworzenie (+ opcjonalnie rodzic)  [ADMIN]
GET    /api/v1/users/:id                  → profil                            [ADMIN, STUDENT, PARENT — self/dziecko]
PATCH  /api/v1/users/:id                  → aktualizacja                      [ADMIN]
DELETE /api/v1/users/:id                  → usunięcie                         [ADMIN]
GET    /api/v1/users/:id/stats            → rozliczenie godzin nauczyciela    [ADMIN, TEACHER — tylko własne]
POST   /api/v1/users/:parentId/students/:studentId   → powiązanie rodzic-dziecko  [ADMIN]
DELETE /api/v1/users/:parentId/students/:studentId   → usunięcie powiązania       [ADMIN]
```

### Groups
```
GET    /api/v1/groups                     → lista            [ADMIN, TEACHER — nauczyciel tylko swoje]
POST   /api/v1/groups                     → tworzenie        [ADMIN]
GET    /api/v1/groups/:id                 → szczegóły + uczniowie  [wszyscy — tylko własne grupy]
PATCH  /api/v1/groups/:id                 → aktualizacja     [ADMIN]
DELETE /api/v1/groups/:id                 → usunięcie        [ADMIN]
POST   /api/v1/groups/:id/students/:studentId    → dodanie ucznia     [ADMIN]
DELETE /api/v1/groups/:id/students/:studentId    → usunięcie ucznia   [ADMIN]
POST   /api/v1/groups/:id/schedule               → slot harmonogramu  [ADMIN]
DELETE /api/v1/groups/:id/schedule/:scheduleId   → usunięcie slotu    [ADMIN]
POST   /api/v1/groups/:id/generate-classes?year=&month=  → generowanie zajęć z harmonogramu [ADMIN]
```

### Classes
```
GET    /api/v1/classes                    → lista (groupId, studentId, status, teacherId, from, to)
                                            [wszyscy — zawężone do własnych zajęć]
POST   /api/v1/classes                    → tworzenie (grupowe lub 1:1)   [ADMIN]
POST   /api/v1/classes/bulk               → tworzenie serii               [ADMIN]
GET    /api/v1/classes/:id                → szczegóły + frekwencja        [ADMIN, TEACHER — tylko własne]
PATCH  /api/v1/classes/:id                → aktualizacja                  [ADMIN]
PATCH  /api/v1/classes/:id/status         → SCHEDULED→ONGOING→COMPLETED / CANCELLED [ADMIN, TEACHER — własne]
PATCH  /api/v1/classes/batch/:batchId     → edycja całej serii            [ADMIN]
DELETE /api/v1/classes/:id                → usunięcie                     [ADMIN]
DELETE /api/v1/classes/batch/:batchId     → usunięcie serii               [ADMIN]
```

Tworzenie zajęć **automatycznie generuje link Google Meet**, jeśli integracja jest
włączona i nie podano własnego linku. Zmiana terminu, odwołanie i usunięcie
aktualizują wydarzenie w kalendarzu — patrz [GOOGLE_MEET.md](../GOOGLE_MEET.md).

### Attendance
```
GET    /api/v1/attendance?classId=        → lista obecności zajęć   [ADMIN, TEACHER — własne zajęcia]
PATCH  /api/v1/attendance/bulk            → zapis całej listy       [ADMIN, TEACHER — własne zajęcia]
GET    /api/v1/attendance/student/:studentId?from=&to=  → statystyki ucznia
                                            [ADMIN, TEACHER, STUDENT, PARENT — self/dziecko]
```

### Materials
```
GET    /api/v1/materials                  → biblioteka (type, search, classId)
                                            [ADMIN, TEACHER, STUDENT — zawężone]
GET    /api/v1/materials/by-classes?classIds=a,b,c  → materiały wielu lekcji JEDNYM zapytaniem
                                            [wszyscy — lista przecinana z dostępnymi zajęciami]
GET    /api/v1/materials/:id              → metadane            [ADMIN, TEACHER, STUDENT]
GET    /api/v1/materials/:id/file         → pobranie pliku (stream przez API)
GET    /api/v1/materials/class/:classId   → materiały zajęć     [ADMIN, TEACHER, STUDENT]
GET    /api/v1/materials/group/:groupId   → materiały grupy     [ADMIN, TEACHER, STUDENT, PARENT]
POST   /api/v1/materials                  → dodanie linku       [ADMIN, TEACHER]
POST   /api/v1/materials/upload           → upload pliku (multipart, max 50 MB) [ADMIN, TEACHER]
POST   /api/v1/materials/:id/classes/:classId    → przypięcie do zajęć  [ADMIN, TEACHER]
DELETE /api/v1/materials/:id/classes/:classId    → odpięcie             [ADMIN, TEACHER]
POST   /api/v1/materials/:id/groups/:groupId     → przypięcie do grupy  [ADMIN, TEACHER]
DELETE /api/v1/materials/:id/groups/:groupId     → odpięcie             [ADMIN, TEACHER]
DELETE /api/v1/materials/:id              → usunięcie           [ADMIN, TEACHER]
```

> `by-classes` **musi** być zadeklarowane przed `:id` w kontrolerze — inaczej
> Nest potraktuje je jako identyfikator materiału.

### Payments
```
GET    /api/v1/payments                   → lista        [ADMIN, STUDENT, PARENT — zawężone]
POST   /api/v1/payments                   → tworzenie    [ADMIN]
POST   /api/v1/payments/bulk              → dla całej grupy  [ADMIN]
GET    /api/v1/payments/stats?from=&to=   → podsumowanie finansowe  [ADMIN]
GET    /api/v1/payments/:id               → szczegóły    [ADMIN, STUDENT, PARENT — tylko własne]
PATCH  /api/v1/payments/:id               → aktualizacja [ADMIN]
PATCH  /api/v1/payments/:id/status        → ręczna zmiana statusu  [ADMIN]
DELETE /api/v1/payments/:id               → usunięcie    [ADMIN]
POST   /api/v1/payments/:id/checkout      → sesja Stripe Checkout  [ADMIN, STUDENT, PARENT]
POST   /api/v1/payments/webhook/stripe    → webhook (publiczny, weryfikowany podpisem)
```

> Rola `TEACHER` została **usunięta** z płatności (2026-08-02) — nauczyciel nie
> ma powodu oglądać finansów szkoły, a lista i tak zawężała tylko ucznia i rodzica.

### Notifications
```
GET    /api/v1/notifications?unread=      → lista powiadomień zalogowanego
GET    /api/v1/notifications/unread-count → licznik nieprzeczytanych
PATCH  /api/v1/notifications/:id/read     → oznacz jako przeczytane
PATCH  /api/v1/notifications/read-all     → oznacz wszystkie
```

### Reports
```
GET    /api/v1/reports/payments?status=&groupId=&from=&to=   → XLSX  [ADMIN]
GET    /api/v1/reports/attendance?groupId=&from=&to=         → XLSX  [ADMIN]
GET    /api/v1/reports/students?role=&isMinor=&search=       → XLSX  [ADMIN]
```

## Kontrola dostępu

`@Roles()` sprawdza **rolę**, nigdy „czyj jest zasób". Drugi warunek realizuje
`AccessControlService` — uczeń widzi tylko swoje grupy, zajęcia i płatności,
rodzic dane swoich dzieci, nauczyciel prowadzone przez siebie zajęcia i grupy.

Parametry filtrowania przysłane przez klienta (np. `teacherId`) są **nadpisywane**
wartością z tokenu — nie da się ich użyć do podejrzenia cudzych danych.

Szczegóły: [ARCHITECTURE.md](../ARCHITECTURE.md#kontrola-dostępu--accesscontrolservice).

## Kody błędów

| Kod | Znaczenie |
|-----|-----------|
| 400 | Błędne dane wejściowe |
| 401 | Brak lub nieprawidłowy token |
| 403 | Brak uprawnień (rola) |
| 404 | Zasób nie istnieje |
| 409 | Konflikt (np. uczeń już w grupie) |
| 422 | Błąd walidacji biznesowej |
| 429 | Przekroczony limit żądań (endpointy auth) |
| 500 | Błąd serwera |

## Format odpowiedzi

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Błędy:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```
