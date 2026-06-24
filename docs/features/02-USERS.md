# Feature: Zarządzanie użytkownikami

## Wymagania

- Lista pracowników (nauczyciele + admin)
- Lista uczniów
- Tworzenie kont przez admina
- Edycja danych użytkownika
- Deaktywacja konta (soft delete przez `isActive: false`)
- Powiązanie rodzic ↔ uczeń

## Widoki frontendu

### Admin
- `/admin/teachers` — lista nauczycieli + przycisk dodaj
- `/admin/students` — lista uczniów + przycisk dodaj
- `/admin/users/:id` — szczegóły + edycja + przypisanie rodzica

### Formularz tworzenia użytkownika
- Imię, Nazwisko, Email, Telefon
- Rola (TEACHER / STUDENT / PARENT)
- Tymczasowe hasło (lub wysyłka emailem z linkiem do ustawienia hasła)

## Reguły biznesowe

- Email musi być unikalny w systemie
- Deaktywacja nie usuwa danych historycznych (frekwencja, płatności)
- Rodzic może być powiązany z wieloma uczniami
- Uczeń może mieć wielu rodziców

## Do zrobienia

- [ ] Moduł `users` w NestJS (CRUD + filtry po roli)
- [ ] Endpoint przypisania rodzica do ucznia
- [ ] Strona listy nauczycieli (tabela + wyszukiwarka)
- [ ] Strona listy uczniów (tabela + wyszukiwarka + filtr po grupie)
- [ ] Modal/strona formularza tworzenia/edycji użytkownika
- [ ] Widok szczegółów ucznia (grupy, frekwencja, płatności)
- [ ] Wysyłka email z tymczasowym hasłem przy tworzeniu konta
