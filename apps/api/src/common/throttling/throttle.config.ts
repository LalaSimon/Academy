import { createHash } from 'crypto';
import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerOptions } from '@nestjs/throttler';

/**
 * Konfiguracja limitów żądań.
 *
 * Powstała po audycie 2026-08-11, który wykazał, że limit miał 5 tras ze 172 —
 * cała reszta (streaming plików, raporty XLSX, tworzenie sesji Stripe) przyjmowała
 * nieograniczoną liczbę żądań. Rejestracja jest otwarta, więc „zalogowany" nie
 * znaczy „zaufany": konto STUDENT dzieli od anonima jeden formularz.
 *
 * ── Dwie warstwy, nie jedna ─────────────────────────────────────────────────
 *
 * `ip` to SUFIT: jeden budżet na adres IP, wspólny dla wszystkich tras. Łapie
 * powódź rozłożoną po wielu endpointach, której limit per-trasa by nie zauważył,
 * i obejmuje też ruch nieuwierzytelniony.
 *
 * `default` to warstwa robocza: liczona per TOŻSAMOŚĆ i per trasa, zaostrzana
 * dekoratorami z `throttle.decorators.ts`. Kubełkowanie po tożsamości, a nie po
 * IP, jest tu konieczne: szkoła językowa siedzi za jednym NAT-em, więc limit
 * per-IP oznaczałby, że jeden uczeń odcina dostęp całej klasie.
 *
 * ── Dlaczego warstwy nie nazywają się `auth` i `mail` jak wcześniej ──────────
 *
 * `@nestjs/throttler` sprawdza KAŻDĄ skonfigurowaną warstwę na KAŻDEJ trasie,
 * a `@Throttle({ auth: {} })` nadpisuje wyłącznie warstwę `auth` — pozostałe
 * zostają przy wartościach z `forRoot`. Poprzednia konfiguracja miała przez to
 * cichy błąd: `login` z `@Throttle({ auth: {} })` (10/min) był i tak ścinany do
 * 3/min przez warstwę `mail`, bo ta obowiązywała wszędzie. W dev nikt tego nie
 * zauważył, bo docker-compose podnosi oba limity do 1000.
 *
 * Dlatego zaostrzenia idą przez nadpisanie JEDNEJ warstwy (`default`), a nie
 * przez dokładanie kolejnych nazwanych warstw.
 */

const MINUTE = 60_000;

/** Liczba z env albo wartość produkcyjna. Pusty/nieliczbowy env → wartość z kodu. */
function envLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Limity na minutę. Podniesione w dev i CI przez env, bo zestaw E2E wykonuje
 * setki żądań z jednego adresu w ciągu kilkudziesięciu sekund.
 */
export const THROTTLE_LIMITS = {
  /** Sufit per IP, wspólny dla wszystkich tras. */
  ip: envLimit('IP_THROTTLE_LIMIT', 600),
  /** Warstwa robocza per tożsamość i trasa — wejście na dashboard to kilkanaście żądań. */
  default: envLimit('GLOBAL_THROTTLE_LIMIT', 120),
  /** Logowanie, reset hasła — hamuje zgadywanie haseł i tokenów. */
  auth: envLimit('AUTH_THROTTLE_LIMIT', 10),
  /** Wszystko, co WYSYŁA MAILA — bez tego endpoint działa jak otwarty relay. */
  mail: envLimit('MAIL_THROTTLE_LIMIT', 3),
  /** Upload — zapełnienie bucketu to rachunek za storage rosnący w tempie łącza. */
  upload: envLimit('UPLOAD_THROTTLE_LIMIT', 10),
  /** Pobieranie plików — egress jest najdroższą pozycją rachunku. */
  download: envLimit('DOWNLOAD_THROTTLE_LIMIT', 60),
  /** Raport XLSX budowany w całości w pamięci. Człowiek nie kliknie 5 razy na minutę. */
  report: envLimit('REPORT_THROTTLE_LIMIT', 5),
  /** Każde wywołanie to request do API Stripe — pętla wyczerpuje ICH rate limit. */
  checkout: envLimit('CHECKOUT_THROTTLE_LIMIT', 5),
} as const;

export const THROTTLE_TTL = MINUTE;

/** Adres klienta. `req.ip` jest wiarygodny tylko przy poprawnym `trust proxy` (patrz main.ts). */
function clientIp(req: Record<string, unknown>): string {
  const ip = req.ip as string | undefined;
  if (ip) return ip;
  const socket = req.socket as { remoteAddress?: string } | undefined;
  return socket?.remoteAddress ?? 'unknown';
}

/**
 * Tożsamość dla warstwy `default`.
 *
 * Guard globalny wykonuje się PRZED `JwtAuthGuard`, więc `req.user` jeszcze nie
 * istnieje — kubełkujemy po skrócie samego tokenu. Skrót, nie token: klucz trafia
 * do storage i logów, a token to poświadczenie.
 *
 * Podrobiony token daje własny kubełek, ale nic to nie daje: takie żądanie i tak
 * kończy się na 401 w `JwtAuthGuard`, a powódź 401-ek zatrzymuje warstwa `ip`,
 * której podrobieniem tokenu nie da się ominąć.
 */
function identityTracker(req: Record<string, unknown>): string {
  const headers = req.headers as Record<string, string | undefined> | undefined;
  const auth = headers?.authorization;

  if (auth?.startsWith('Bearer ')) {
    const digest = createHash('sha256')
      .update(auth.slice('Bearer '.length))
      .digest('hex');
    return `t:${digest.slice(0, 32)}`;
  }

  return `ip:${clientIp(req)}`;
}

/**
 * Klucz warstwy `ip` — celowo BEZ nazwy kontrolera i handlera, inaczej niż
 * domyślny `generateKey` biblioteki. Domyślne kluczowanie tworzy osobny budżet
 * dla każdej trasy, więc atakujący skaczący po 50 endpointach dostaje 50×limit.
 * Sufit ma być jeden na cały serwis.
 */
function ipCeilingKey(_context: ExecutionContext, tracker: string): string {
  return `ceiling:${tracker}`;
}

export const throttlerTiers: ThrottlerOptions[] = [
  {
    name: 'default',
    ttl: THROTTLE_TTL,
    limit: THROTTLE_LIMITS.default,
    getTracker: (req) => identityTracker(req),
  },
  {
    name: 'ip',
    ttl: THROTTLE_TTL,
    limit: THROTTLE_LIMITS.ip,
    getTracker: (req) => `ip:${clientIp(req)}`,
    generateKey: ipCeilingKey,
  },
];
