# Feature: Materiały edukacyjne

## Wymagania

- Biblioteka materiałów dostępna dla nauczycieli i uczniów
- Upload plików: PDF, audio, video, obrazy
- Dodawanie linków zewnętrznych (YouTube, Quizlet, Canva, etc.)
- Przypisywanie materiałów do konkretnych zajęć
- Materiały publiczne (dla wszystkich) lub prywatne (tylko dla grupy/zajęć)

## Storage

- Pliki przechowywane w **MinIO** (self-hosted S3)
- Presigned URL do pobierania (time-limited, bezpieczne)
- Limity: max 50MB per plik (konfigurowane)
- Walidacja MIME type po stronie serwera

## Typy materiałów

| Typ | Opis |
|-----|------|
| PDF | Ćwiczenia, gramatyka, słownictwo |
| VIDEO | Nagrania, lekcje wideo |
| AUDIO | Ćwiczenia słuchania |
| IMAGE | Karty obrazkowe, infografiki |
| LINK | YouTube, Quizlet, zewnętrzne ćwiczenia |
| OTHER | Inne pliki |

## Struktura

- Materiał istnieje samodzielnie w bibliotece
- Może być przypisany do wielu zajęć (relacja many-to-many przez ClassMaterial)
- Kolejność materiałów w zajęciach konfigurowana (`order` field)

## Widoki

### Biblioteka materiałów (admin/teacher)
- Grid/lista wszystkich materiałów
- Filtrowanie: typ, data, kto dodał
- Wyszukiwarka po tytule
- Upload / Dodaj link / Edytuj / Usuń

### Widok zajęć (uczeń)
- Sekcja "Materiały" pod opisem zajęć
- Przycisk Pobierz (PDF, audio) lub Otwórz link

## Do zrobienia

- [ ] Moduł `materials` w NestJS
- [ ] Integracja z MinIO (upload, presigned URL, delete)
- [ ] Walidacja pliku (MIME, rozmiar)
- [ ] Strona biblioteki materiałów
- [ ] Komponent drag & drop upload
- [ ] Modal dodawania linku zewnętrznego
- [ ] Przypisywanie materiałów do zajęć (w formularzu zajęć)
- [ ] Reorder materiałów w zajęciach (drag & drop)
