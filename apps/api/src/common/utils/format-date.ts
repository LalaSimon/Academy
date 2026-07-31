const PL_DATE_TIME = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Warsaw',
});

const PL_TIME = new Intl.DateTimeFormat('pl-PL', {
  timeStyle: 'short',
  timeZone: 'Europe/Warsaw',
});

const PL_DATE = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeZone: 'Europe/Warsaw',
});

/** np. „4 lip 2026, 18:00" (strefa Europe/Warsaw). */
export function formatPlDateTime(date: Date): string {
  return PL_DATE_TIME.format(date);
}

/** np. „18:00" (strefa Europe/Warsaw). */
export function formatPlTime(date: Date): string {
  return PL_TIME.format(date);
}

/** np. „1 sie 2026" — sama data, bez godziny (np. termin płatności). */
export function formatPlDate(date: Date): string {
  return PL_DATE.format(date);
}
