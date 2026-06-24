# Feature: Moduł Płatności

## Wymagania

- Tworzenie opłat dla uczniów (miesięczne abonamenty, pakiety)
- Śledzenie statusów: PENDING / PAID / OVERDUE / REFUNDED / CANCELLED
- Integracja z bramką płatności (automatyczne potwierdzenia)
- Ręczna zmiana statusu przez admina (płatności przelewem tradycyjnym)
- Widok finansowy dla admina (przychody, zaległości)
- Widok płatności dla ucznia i rodzica

## Bramka płatności — Przelewy24

### Zalety
- Najpopularniejsza bramka w Polsce
- Obsługa: BLIK, przelewy bankowe, Visa, Mastercard, Google Pay, Apple Pay
- Dedykowane API dla firm
- Webhook do automatycznego potwierdzenia

### Flow płatności

```
1. Admin tworzy opłatę dla ucznia (kwota, opis, termin)
2. Uczeń/Rodzic widzi nieopłaconą fakturę
3. Klikają "Zapłać online" → POST /payments/:id/checkout
4. Backend inicjalizuje transakcję w Przelewy24 → dostaje URL do redirect
5. Uczeń przekierowany na stronę Przelewy24 → płaci
6. Przelewy24 wysyła webhook POST /payments/webhook → backend weryfikuje podpis
7. Status płatności aktualizowany → PAID
8. Email potwierdzający do ucznia/rodzica
```

### Alternatywne flow (przelew tradycyjny)
- Uczeń przelewa na konto szkoły
- Admin widzi w panelu nieopłacone → ręcznie zmienia status na PAID
- Brak automatyzacji, ale prosta implementacja na start

## Model finansowy

### Tworzenie opłat
- Admin tworzy opłatę ręcznie dla ucznia lub grupy uczniów naraz
- Kwota, opis (np. "Angielski B2 — lipiec 2026"), termin płatności
- Powtarzające się opłaty — bulk tworzenie na cały semestr (opcja)

### Dashboard finansowy (admin)
- Przychód aktualnego miesiąca vs oczekiwany
- Lista zaległości (overdue)
- Historia wszystkich transakcji z filtrem
- Wykres przychodów miesięcznych

### Portal ucznia/rodzica
- Lista wszystkich opłat z statusami
- Oznaczenie kolorowe: zielony (paid), żółty (pending), czerwony (overdue)
- Przycisk "Zapłać" przy nieopłaconych
- Historia zapłaconych faktur

## Powiadomienia związane z płatnościami

- Email przy stworzeniu nowej opłaty (termin płatności, kwota)
- Przypomnienie 3 dni przed terminem
- Powiadomienie o przeterminowaniu
- Potwierdzenie po dokonaniu płatności

## Do zrobienia (Faza 2)

- [ ] Moduł `payments` w NestJS
- [ ] CRUD opłat przez admina
- [ ] Integracja Przelewy24 (lub Stripe jako alternatywa)
- [ ] Endpoint webhook + weryfikacja podpisu
- [ ] Bulk tworzenie opłat dla grupy
- [ ] Dashboard finansowy admina
- [ ] Strona płatności ucznia/rodzica
- [ ] Automatyczne zmiany statusu na OVERDUE (cron job)
- [ ] Emaile przypominające (cron job)
- [ ] Ręczna zmiana statusu przez admina
