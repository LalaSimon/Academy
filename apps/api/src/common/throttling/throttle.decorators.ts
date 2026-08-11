import { Throttle } from '@nestjs/throttler';
import { THROTTLE_LIMITS, THROTTLE_TTL } from './throttle.config';

/**
 * Zaostrzenia limitu dla operacji drogich albo nadających się do nadużycia.
 *
 * Każdy dekorator nadpisuje warstwę `default` — nigdy nie dokłada nowej nazwanej
 * warstwy. Powód w `throttle.config.ts`: biblioteka stosuje wszystkie nazwane
 * warstwy do wszystkich tras, więc nazwane warstwy „na endpoint" ścinają się
 * nawzajem w sposób niewidoczny w kodzie kontrolera.
 *
 * Sufit `ip` obowiązuje niezależnie i tych dekoratorów nie dotyczy.
 */
const tighten = (limit: number) =>
  Throttle({ default: { limit, ttl: THROTTLE_TTL } });

/** Logowanie, reset hasła — zgadywanie haseł i tokenów resetu. */
export const ThrottleAuth = () => tighten(THROTTLE_LIMITS.auth);

/** Każda trasa wysyłająca maila naszym kontem Resend. */
export const ThrottleMail = () => tighten(THROTTLE_LIMITS.mail);

/** Upload pliku — RAM procesu przy odbiorze, rachunek za storage po zapisie. */
export const ThrottleUpload = () => tighten(THROTTLE_LIMITS.upload);

/** Streaming pliku — egress. */
export const ThrottleDownload = () => tighten(THROTTLE_LIMITS.download);

/** Generowanie XLSX — cały skoroszyt powstaje w pamięci. */
export const ThrottleReport = () => tighten(THROTTLE_LIMITS.report);

/** Tworzenie sesji Stripe Checkout — każde wywołanie to request do API Stripe. */
export const ThrottleCheckout = () => tighten(THROTTLE_LIMITS.checkout);
