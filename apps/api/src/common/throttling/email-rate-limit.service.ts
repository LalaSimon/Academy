import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Limit wysyłki maili liczony per ADRES ODBIORCY.
 *
 * Warstwa `mail` w throttlerze kubełkuje po IP, więc nie dotyka scenariusza,
 * który boli najbardziej: atakujący z pulą adresów (albo zwykłym VPN-em) wysyła
 * JEDNEJ ofierze dowolną liczbę maili resetujących hasło. Skrzynka ofiary jest
 * zalana, nasza domena ląduje w filtrach antyspamowych, a każda wiadomość to
 * pozycja na rachunku Resend. Licznik per adres jest na to odporny, bo rozpraszanie
 * źródła nic nie zmienia — celem jest zawsze ta sama skrzynka.
 *
 * Trzymane w pamięci procesu, nie w Redisie: limit ma chronić przed zalewaniem
 * skrzynki, a nie stanowić rozliczenia księgowego. Przy wielu instancjach API
 * limit zadziała per instancja — wciąż o rząd wielkości lepiej niż brak limitu.
 * Gdyby to przestało wystarczać, ta klasa jest jedynym miejscem do przepięcia
 * na Redis (interfejs zostaje bez zmian).
 */
@Injectable()
export class EmailRateLimitService {
  private readonly logger = new Logger(EmailRateLimitService.name);

  /** klucz (skrót adresu) → znaczniki czasu wysyłek w bieżącym oknie */
  private readonly hits = new Map<string, number[]>();

  private readonly windowMs = 60 * 60 * 1000; // 1 h
  private readonly maxPerWindow = 5;

  /**
   * Czy wolno wysłać maila na ten adres. Rejestruje próbę, jeśli tak.
   *
   * Adres jest kluczowany SKRÓTEM — mapa siedzi w pamięci procesu i trafia do
   * zrzutów sterty, a e-mail to dane osobowe (reguła nr 6 z CLAUDE.md).
   */
  consume(email: string): boolean {
    const key = createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex');

    const now = Date.now();
    const fresh = (this.hits.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );

    if (fresh.length >= this.maxPerWindow) {
      this.hits.set(key, fresh);
      // Bez adresu w logu — sam fakt zadziałania limitu wystarczy do diagnozy.
      this.logger.warn('Limit wysyłki per adres wyczerpany — mail pominięty');
      return false;
    }

    fresh.push(now);
    this.hits.set(key, fresh);
    this.sweep(now);
    return true;
  }

  /**
   * Usuwa wygasłe wpisy. Bez tego mapa rośnie z każdym nowym adresem i staje się
   * własnym wektorem wyczerpania pamięci — czyli dokładnie tym, przed czym ma
   * chronić. Wywoływane przy zapisie, więc nie potrzebuje własnego timera.
   */
  private sweep(now: number): void {
    if (this.hits.size < 1000) return;
    for (const [key, timestamps] of this.hits) {
      if (timestamps.every((t) => now - t >= this.windowMs)) {
        this.hits.delete(key);
      }
    }
  }
}
