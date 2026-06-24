# Feature: Ewidencja Obecności

## Wymagania

- Zaznaczanie obecności uczniów na zajęciach przez nauczyciela
- Statusy: PRESENT / ABSENT / LATE / EXCUSED
- Możliwość dodania notatki do wpisu frekwencji
- Widok frekwencji dla admina, nauczyciela, ucznia i rodzica
- Statystyki frekwencji (procent obecności)

## Flow zaznaczania obecności

```
1. Nauczyciel otwiera zajęcia (status: ONGOING lub COMPLETED)
2. System pokazuje listę uczniów z grupy
3. Nauczyciel zaznacza status każdego ucznia
4. Opcjonalna notatka (np. "spóźnienie 15 min")
5. Zapis — jeden wpis Attendance per (classId, studentId)
6. Możliwość edycji po fakcie przez nauczyciela i admina
```

## Widoki

### Nauczyciel
- Po zakończeniu zajęć → modal/strona zaznaczania obecności
- Lista uczniów grupy z przyciskami PRESENT / ABSENT / LATE / EXCUSED
- Bulk action: "Wszyscy obecni" → odznacz wyjątki

### Admin
- Tabela frekwencji z filtrem po grupie, uczniu, dacie
- Eksport do CSV / PDF (faza 2)

### Uczeń / Rodzic
- Moja frekwencja — lista zajęć ze statusem
- Statystyki: X% obecności w danym miesiącu / na kursie

## Reguły biznesowe

- Frekwencję można zaznaczyć tylko dla zajęć o statusie ONGOING lub COMPLETED
- Jeden wpis na (zajęcia, uczeń) — aktualizacja zamiast nowego wpisu
- Powiadomienie do rodzica gdy uczeń jest nieobecny (opcjonalne, konfigurowane)

## Do zrobienia

- [ ] Moduł `attendance` w NestJS
- [ ] Endpoint bulk update (zaznaczenie całej klasy naraz)
- [ ] Strona zaznaczania obecności (po zakończeniu zajęć)
- [ ] Widok historii frekwencji ucznia
- [ ] Statystyki frekwencji (procenty, wykres)
- [ ] Filtrowanie i sortowanie w widoku admina
