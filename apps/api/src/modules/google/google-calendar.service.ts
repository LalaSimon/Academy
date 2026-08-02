import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, type calendar_v3 } from 'googleapis';
import { randomUUID } from 'crypto';

export interface MeetLinkRequest {
  title: string;
  description?: string | null;
  scheduledAt: Date;
  durationMin: number;
}

/**
 * Generowanie linków Google Meet przez Calendar API.
 *
 * Meet nie udostępnia sposobu na zbudowanie linku z identyfikatora — trzeba
 * utworzyć wydarzenie w kalendarzu z `conferenceData`, a Google odsyła
 * `hangoutLink`. Uwierzytelniamy się jako konkretne konto (OAuth2 + refresh
 * token), bo service account bez Google Workspace nie ma prawa tworzyć Meet.
 *
 * Integracja jest OPCJONALNA i domyślnie wyłączona. Włącza ją
 * `GOOGLE_CALENDAR_ENABLED=true` — dopiero wtedy wymagamy kompletu sekretów
 * (`getOrThrow`), żeby nie dało się jej uruchomić „w połowie". Gdy jest
 * wyłączona, link wpisuje się ręcznie tak jak dotąd.
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly calendar: calendar_v3.Calendar | null = null;
  private readonly calendarId: string;

  constructor(config: ConfigService) {
    const enabled =
      config.get<string>('GOOGLE_CALENDAR_ENABLED', 'false') === 'true';
    this.calendarId = config.get<string>('GOOGLE_CALENDAR_ID', 'primary');

    if (!enabled) {
      this.logger.log(
        'Integracja Google Calendar wyłączona — linki Meet wpisywane ręcznie',
      );
      return;
    }

    // Komplet wymagany dopiero po włączeniu — brak któregokolwiek zatrzymuje
    // start, zamiast dawać integrację działającą połowicznie.
    const clientId = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
    const refreshToken = config.getOrThrow<string>('GOOGLE_REFRESH_TOKEN');

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth });

    this.logger.log('Integracja Google Calendar włączona');
  }

  get isEnabled(): boolean {
    return this.calendar !== null;
  }

  /**
   * Zwraca link Meet albo `null`, gdy integracja jest wyłączona lub Google
   * odmówiło. NIGDY nie rzuca — brak linku nie może zablokować utworzenia
   * zajęć, bo to funkcja pomocnicza, a nie warunek istnienia lekcji.
   */
  async createMeetLink(req: MeetLinkRequest): Promise<string | null> {
    if (!this.calendar) return null;

    const end = new Date(req.scheduledAt.getTime() + req.durationMin * 60_000);

    try {
      const res = await this.calendar.events.insert({
        calendarId: this.calendarId,
        conferenceDataVersion: 1,
        requestBody: {
          summary: req.title,
          description: req.description ?? undefined,
          start: { dateTime: req.scheduledAt.toISOString() },
          end: { dateTime: end.toISOString() },
          conferenceData: {
            createRequest: {
              // Wymagany unikalny identyfikator żądania — Google używa go do
              // deduplikacji przy ponowieniach.
              requestId: randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
      });

      const link = res.data.hangoutLink ?? null;
      if (!link) {
        this.logger.warn(
          `Google nie zwróciło hangoutLink dla „${req.title}" — sprawdź uprawnienia konta`,
        );
      }
      return link;
    } catch (e) {
      this.logger.error(
        `Nie udało się utworzyć linku Meet dla „${req.title}"`,
        e instanceof Error ? e.stack : undefined,
      );
      return null;
    }
  }
}
