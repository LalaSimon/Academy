import { extname } from 'path';

/**
 * Ograniczenia uploadu materiałów.
 *
 * Audyt 2026-08-11 wykazał dwa problemy w jednym miejscu:
 *
 * 1. `MaxFileSizeValidator` sprawdzał rozmiar DOPIERO po zbuforowaniu całego
 *    ciała żądania w pamięci (`memoryStorage` bez `limits`). Deklarowany limit
 *    50 MB nie chronił przed niczym — plik 5 GB kładł proces na OOM, zanim
 *    walidator zdążył się wykonać. Limit musi trafić do multera, który przerywa
 *    strumień w trakcie odbioru.
 *
 * 2. Typ pliku brał się w całości z danych podanych przez wgrywającego:
 *    `detectType(file.mimetype)` ufał nagłówkowi, a klucz w MinIO kończył się
 *    rozszerzeniem z `originalname`. Dało się wgrać `.html` albo `.svg`
 *    z aktywnym skryptem. Dziś pobieranie broni się `Content-Disposition:
 *    attachment` i `nosniff`, ale to jedna zmiana w streamowaniu od stored XSS
 *    na naszej domenie.
 */

/** 50 MB — tyle deklarował poprzedni (nieskuteczny) walidator. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Dozwolone typy MIME wraz z rozszerzeniem, którego użyjemy w kluczu MinIO.
 *
 * Allowlista, nie blocklista: lista formatów niebezpiecznych jest otwarta
 * (`.html`, `.svg`, `.xhtml`, `.xml`, `.pdf` z JS…), lista formatów potrzebnych
 * szkole językowej jest skończona.
 *
 * `image/svg+xml` celowo NIE JEST na liście — SVG to dokument, który przeglądarka
 * wykonuje razem z osadzonym `<script>`.
 */
const ALLOWED_MIME: Record<string, string> = {
  // Dokumenty
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  // Obrazy
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  // Audio — nagrania do ćwiczeń ze słuchu
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'weba',
  // Wideo
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  // Archiwa — zestaw materiałów w paczce
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

/** Wyrażenie dla `FileTypeValidator` — musi pokryć dokładnie klucze allowlisty. */
export const ALLOWED_MIME_REGEX = new RegExp(
  `^(${Object.keys(ALLOWED_MIME)
    .map((m) => m.replace(/[.+*?^$()[\]{}|\\]/g, '\\$&'))
    .join('|')})$`,
);

export const ALLOWED_MIME_LIST = Object.keys(ALLOWED_MIME);

export function isAllowedMime(mimetype: string): boolean {
  return Object.hasOwn(ALLOWED_MIME, mimetype);
}

/**
 * Rozszerzenie klucza w MinIO. Wyprowadzone z **allowlisty**, nie z nazwy pliku
 * podanej przez klienta — `originalname` bywa `raport.pdf.html` albo
 * `../../etc/passwd`, a `split('.').pop()` przepuszczał jedno i drugie.
 *
 * Rozszerzenie z nazwy pliku honorujemy tylko wtedy, gdy zgadza się z typem MIME
 * (np. `.jpeg` przy `image/jpeg`) — inaczej wygrywa wartość kanoniczna.
 */
export function safeExtension(mimetype: string, originalName: string): string {
  const canonical = ALLOWED_MIME[mimetype];
  if (!canonical) return 'bin';

  const fromName = extname(originalName).slice(1).toLowerCase();
  if (/^[a-z0-9]{1,5}$/.test(fromName) && ALLOWED_MIME[mimetype] === fromName) {
    return fromName;
  }
  return canonical;
}
