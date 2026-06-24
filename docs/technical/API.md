# API Design

## Konwencje

- **Base URL:** `/api/v1`
- **Format:** JSON
- **Auth:** Bearer JWT w headerze `Authorization`
- **Paginacja:** `?page=1&limit=20`
- **Filtry:** query params, np. `?status=ACTIVE&groupId=xxx`

## Endpointy

### Auth
```
POST   /api/v1/auth/register          → rejestracja (admin tworzy konta)
POST   /api/v1/auth/login             → logowanie → { accessToken, refreshToken }
POST   /api/v1/auth/refresh           → nowy access token
POST   /api/v1/auth/logout            → unieważnienie refresh tokena
POST   /api/v1/auth/forgot-password   → reset hasła (email)
POST   /api/v1/auth/reset-password    → ustawienie nowego hasła
GET    /api/v1/auth/me                → aktualny użytkownik
```

### Users
```
GET    /api/v1/users                  → lista użytkowników [ADMIN]
POST   /api/v1/users                  → tworzenie użytkownika [ADMIN]
GET    /api/v1/users/:id              → szczegóły użytkownika
PATCH  /api/v1/users/:id             → aktualizacja użytkownika
DELETE /api/v1/users/:id             → deaktywacja [ADMIN]

GET    /api/v1/users/teachers         → lista nauczycieli [ADMIN]
GET    /api/v1/users/students         → lista uczniów [ADMIN, TEACHER]

POST   /api/v1/users/:parentId/children/:studentId   → przypisanie rodzica do ucznia [ADMIN]
DELETE /api/v1/users/:parentId/children/:studentId   → usunięcie powiązania [ADMIN]
```

### Groups
```
GET    /api/v1/groups                 → lista grup
POST   /api/v1/groups                 → tworzenie grupy [ADMIN]
GET    /api/v1/groups/:id             → szczegóły grupy (uczniowie, nauczyciel)
PATCH  /api/v1/groups/:id            → aktualizacja grupy [ADMIN]
DELETE /api/v1/groups/:id            → usunięcie grupy [ADMIN]

POST   /api/v1/groups/:id/students           → dodaj ucznia do grupy [ADMIN]
DELETE /api/v1/groups/:id/students/:studentId → usuń ucznia z grupy [ADMIN]
PATCH  /api/v1/groups/:id/teacher            → zmień nauczyciela grupy [ADMIN]
```

### Classes
```
GET    /api/v1/classes                → lista zajęć (filtr: groupId, from, to, status)
POST   /api/v1/classes                → tworzenie zajęć [ADMIN, TEACHER]
GET    /api/v1/classes/:id            → szczegóły zajęć
PATCH  /api/v1/classes/:id           → aktualizacja [ADMIN, TEACHER]
DELETE /api/v1/classes/:id           → odwołanie zajęć [ADMIN, TEACHER]

POST   /api/v1/classes/:id/start     → rozpocznij zajęcia (status → ONGOING) [TEACHER]
POST   /api/v1/classes/:id/complete  → zakończ zajęcia [TEACHER]
POST   /api/v1/classes/:id/cancel    → odwołaj zajęcia + powiadomienie [ADMIN, TEACHER]
```

### Attendance
```
GET    /api/v1/attendance             → lista (filtr: classId, studentId, groupId, from, to)
POST   /api/v1/attendance/bulk        → zaznaczenie obecności dla całej klasy [TEACHER]
PATCH  /api/v1/attendance/:id        → aktualizacja statusu obecności [TEACHER]
GET    /api/v1/attendance/stats/:studentId → statystyki frekwencji ucznia
```

### Materials
```
GET    /api/v1/materials              → lista materiałów
POST   /api/v1/materials/upload       → upload pliku (multipart/form-data) [TEACHER, ADMIN]
POST   /api/v1/materials/link         → dodaj link jako materiał [TEACHER, ADMIN]
GET    /api/v1/materials/:id          → pobierz/podgląd materiału
PATCH  /api/v1/materials/:id         → aktualizacja metadanych [TEACHER, ADMIN]
DELETE /api/v1/materials/:id         → usunięcie [TEACHER, ADMIN]

POST   /api/v1/classes/:id/materials          → przypisz materiał do zajęć
DELETE /api/v1/classes/:id/materials/:matId   → odepnij materiał od zajęć
```

### Payments
```
GET    /api/v1/payments               → lista płatności [ADMIN]
POST   /api/v1/payments               → tworzenie faktury/płatności [ADMIN]
GET    /api/v1/payments/:id           → szczegóły płatności
PATCH  /api/v1/payments/:id/status   → ręczna zmiana statusu [ADMIN]
DELETE /api/v1/payments/:id          → anulowanie [ADMIN]

GET    /api/v1/payments/student/:id   → płatności ucznia [ADMIN, STUDENT, PARENT]
POST   /api/v1/payments/:id/checkout  → inicjalizacja płatności przez bramkę
POST   /api/v1/payments/webhook       → webhook od bramki płatności (publiczny, weryfikowany)

GET    /api/v1/payments/summary       → podsumowanie finansowe [ADMIN]
```

### Notifications
```
GET    /api/v1/notifications          → lista powiadomień zalogowanego użytkownika
PATCH  /api/v1/notifications/:id/read → oznacz jako przeczytane
PATCH  /api/v1/notifications/read-all → oznacz wszystkie jako przeczytane
DELETE /api/v1/notifications/:id     → usuń powiadomienie
```

### Reports (Faza 2)
```
GET    /api/v1/reports/attendance     → raport frekwencji (filtr: groupId, from, to)
GET    /api/v1/reports/financial      → raport finansowy (filtr: from, to)
GET    /api/v1/reports/student/:id    → raport postępów ucznia
```

## Kody błędów

| Kod | Znaczenie |
|-----|-----------|
| 400 | Błędne dane wejściowe |
| 401 | Brak lub nieprawidłowy token |
| 403 | Brak uprawnień (rola) |
| 404 | Zasób nie istnieje |
| 409 | Konflikt (np. uczeń już w grupie) |
| 422 | Błąd walidacji biznesowej |
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
