# Założenia Biznesowe

## Model biznesowy

- Prywatna szkoła językowa online
- Na starcie jednoosobowy biznes: właściciel pełni rolę admina i nauczyciela jednocześnie
- Platforma nie jest SaaS — dedykowana instancja dla jednej szkoły
- Uczniowie opłacają kursy miesięcznie lub pakietowo (do ustalenia)

## Użytkownicy docelowi

### Właściciel/Admin
- Chce mieć pełen wgląd w działalność szkoły
- Śledzi płatności, obecności, postępy uczniów
- Zarządza grupami i nauczycielami
- Prowadzi własne grupy jako nauczyciel

### Nauczyciel
- Prowadzi zajęcia przez Google Meet
- Zaznacza obecność uczniów
- Dodaje materiały do zajęć
- Sprawdza zadania domowe

### Uczeń
- Uczestniczy w zajęciach o wyznaczonej godzinie
- Ma dostęp do materiałów z zajęć
- Widzi swój harmonogram i frekwencję
- Widzi status swoich płatności

### Rodzic
- Widzi harmonogram i frekwencję dziecka
- Widzi status płatności i zaległości
- Otrzymuje powiadomienia o nieobecnościach i zaległych płatnościach

## Wymagania biznesowe

### Płatności
- Miesięczny abonament za grupy/kursy
- Śledzenie statusu płatności: opłacone / oczekujące / zaległe
- Integracja z bramką płatności (zalecane: **Przelewy24** lub **Stripe**)
- Potwierdzenia przelewów (webhook od bramki)
- Historia transakcji dla admina
- Widok własnych płatności dla ucznia/rodzica
- Automatyczne przypomnienia o zaległościach (email)

### Zajęcia
- Zajęcia zaplanowane z góry (dzień, godzina, powtarzalność)
- Link Google Meet generowany automatycznie (Google Calendar API)
- Materiały dostępne przed i po zajęciach
- Możliwość odwołania zajęć z powiadomieniem uczniów

### Skalowalność biznesowa
- System musi obsługiwać dodanie kolejnych nauczycieli
- Przyszłościowo: możliwość tworzenia wielu kursów/ścieżek
- Raporty finansowe i frekwencyjne dla właściciela

## Zasady procesu

- **Nie przechodzimy do kolejnej fazy dopóki poprzednia nie jest w 100% ukończona** — każdy punkt checklisty w ROADMAP.md musi być odhaczony przed startem następnej fazy.

## Ograniczenia i priorytety MVP

**In scope (Faza 1):**
- Rejestracja i logowanie (auth)
- Zarządzanie pracownikami i uczniami
- Grupy z przypisanymi nauczycielami i uczniami
- Planowanie zajęć + Google Meet link
- Ewidencja frekwencji
- Biblioteka materiałów

**In scope (Faza 2):**
- Moduł płatności z bramką
- Portal rodzica
- Powiadomienia email

**Out of scope (przyszłość):**
- Własny wideostream (używamy Google Meet)
- Aplikacja mobilna
- Wielojęzyczność interfejsu
