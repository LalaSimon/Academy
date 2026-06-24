# Feature: Grupy

## Wymagania

- Tworzenie grup kursowych (np. "Angielski B2 — poniedziałek")
- Przypisywanie nauczyciela do grupy jako opiekuna
- Przypisywanie uczniów do grupy
- Widok szczegółów grupy z listą uczniów i harmonogramem zajęć

## Atrybuty grupy

- Nazwa
- Opis
- Poziom (A1, A2, B1, B2, C1, C2)
- Język
- Nauczyciel (jeden opiekun)
- Max liczba uczniów
- Aktywna / Nieaktywna

## Reguły biznesowe

- Uczeń może być w wielu grupach jednocześnie
- Nauczyciel może prowadzić wiele grup
- Po deaktywacji grupy uczniowie pozostają w historii
- Zmiana nauczyciela grupy jest dostępna tylko dla admina

## Do zrobienia

- [ ] Moduł `groups` w NestJS
- [ ] Strona listy grup (filtrowanie po nauczycielu, języku, poziomie)
- [ ] Strona szczegółów grupy (lista uczniów, upcoming zajęcia)
- [ ] Modal tworzenia/edycji grupy
- [ ] UI dodawania/usuwania uczniów z grupy (select + lista)
- [ ] Widok grup dla nauczyciela (tylko swoje)
- [ ] Widok grup dla ucznia (tylko do których należy)
