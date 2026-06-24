# Feature: Powiadomienia

## Wymagania

- Powiadomienia email (transakcyjne i przypomnienia)
- Powiadomienia in-app (bell icon w nawigacji)
- Konfigurowalność: uczeń/rodzic może wyłączyć niektóre typy (faza 2)

## Typy powiadomień

| Typ | Odbiorca | Kiedy |
|-----|----------|-------|
| CLASS_REMINDER | Student, Teacher | 30 min przed zajęciami |
| CLASS_CANCELLED | Student, Teacher | Gdy zajęcia odwołane |
| PAYMENT_DUE | Student, Parent | Przy tworzeniu opłaty |
| PAYMENT_REMINDER | Student, Parent | 3 dni przed terminem |
| PAYMENT_OVERDUE | Student, Parent | Dzień po terminie |
| PAYMENT_CONFIRMED | Student, Parent | Po opłaceniu |
| ATTENDANCE_ALERT | Parent | Gdy dziecko nieobecne |
| GENERAL | Any | Wiadomość od admina |

## Implementacja

### Email
- Biblioteka: **Nodemailer** + template engine (Handlebars lub MJML)
- Szablony w HTML dla każdego typu
- Kolejkowanie przez Redis + Bull/BullMQ (żeby nie blokować requesta)
- SMTP lub Resend (transactional email API)

### In-app
- Model `Notification` w DB
- Poll co 30s lub WebSocket (faza 2)
- Badge z liczbą nieprzeczytanych
- Dropdown z listą ostatnich powiadomień

### Cron Jobs (NestJS Scheduler)
- Co godzinę: sprawdź zajęcia za 30-60 min → wyślij reminder
- Codziennie rano: sprawdź opłaty z terminem za 3 dni → email
- Codziennie rano: oznacz przeterminowane płatności → email

## Do zrobienia

- [ ] Moduł `notifications` w NestJS
- [ ] Serwis email (Nodemailer + szablony)
- [ ] Integracja BullMQ do kolejkowania emaili
- [ ] Cron jobs (NestJS @Cron)
- [ ] Komponent powiadomień in-app (bell + dropdown)
- [ ] Endpoint oznaczania jako przeczytane
