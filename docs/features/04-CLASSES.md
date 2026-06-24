# Feature: Zajęcia

## Wymagania

- Tworzenie zajęć dla grupy (tytuł, data, godzina, czas trwania)
- Link do Google Meet (automatyczny lub manualny)
- Przypisywanie materiałów do zajęć
- Statusy zajęć: SCHEDULED → ONGOING → COMPLETED / CANCELLED
- Uczniowie i nauczyciel wchodzą do pokoju o wyznaczonej godzinie

## Flow zajęć

```
1. Admin/Nauczyciel tworzy zajęcia → status: SCHEDULED
2. System generuje link Google Meet (lub nauczyciel wkleja manualnie)
3. Na X minut przed zajęciami → powiadomienie email do uczniów + nauczyciela
4. Nauczyciel klika "Rozpocznij zajęcia" → status: ONGOING → link Meet aktywny
5. Po zajęciach nauczyciel klika "Zakończ" → status: COMPLETED
6. Zaznaczanie frekwencji (w trakcie lub tuż po zajęciach)
```

## Google Meet integracja

### Opcja A — Automatyczna (docelowa)
- Google Calendar API + Service Account
- Przy tworzeniu zajęć: tworzony event w kalendarzu z Meet linkiem
- Link zapisywany w DB i wyświetlany użytkownikom
- Wymaga: OAuth2 setup, Google Cloud project

### Opcja B — Manualna (MVP Faza 1)
- Nauczyciel tworzy Meet link ręcznie i wkleja do formularza zajęć
- Prostsze, zero konfiguracji zewnętrznej
- **Zalecane na start**

## Strona zajęć (widok ucznia/nauczyciela)

- Tytuł zajęć + opis
- Data i godzina
- Czas do startu (countdown)
- Przycisk "Dołącz do zajęć" (Meet link) — aktywny od N minut przed startem
- Lista materiałów do zajęć
- Status frekwencji ucznia (widoczny po zajęciach)

## Do zrobienia

- [ ] Moduł `classes` w NestJS
- [ ] Tworzenie zajęć (jednorazowe i powtarzające się — opcjonalnie faza 2)
- [ ] Widok kalendarza zajęć (FullCalendar lub react-big-calendar)
- [ ] Strona szczegółów zajęć
- [ ] Przycisk "Dołącz do Meet" z zabezpieczeniem czasowym
- [ ] Zmiana statusów zajęć (start / complete / cancel)
- [ ] Powiadomienia email przed zajęciami (cron job)
- [ ] Odwołanie zajęć z powiadomieniem uczniów
