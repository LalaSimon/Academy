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

export interface CreatedEvent {
  eventId: string;
  meetLink: string;
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
   * Tworzy wydarzenie ze spotkaniem Meet. Zwraca link ORAZ id wydarzenia —
   * bez id nie dałoby się go potem zaktualizować ani usunąć.
   *
   * NIGDY nie rzuca: brak spotkania nie może zablokować utworzenia zajęć,
   * bo kalendarz jest dodatkiem, a nie źródłem prawdy.
   */
  async createEvent(req: MeetLinkRequest): Promise<CreatedEvent | null> {
    if (!this.calendar) return null;

    try {
      const res = await this.calendar.events.insert({
        calendarId: this.calendarId,
        conferenceDataVersion: 1,
        requestBody: {
          summary: req.title,
          description: req.description ?? undefined,
          start: { dateTime: req.scheduledAt.toISOString() },
          end: { dateTime: this.endOf(req).toISOString() },
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

      const meetLink = res.data.hangoutLink ?? null;
      const eventId = res.data.id ?? null;
      if (!meetLink || !eventId) {
        this.logger.warn(
          `Google nie zwróciło kompletu (link/id) dla „${req.title}" — sprawdź uprawnienia konta`,
        );
        return null;
      }
      return { eventId, meetLink };
    } catch (e) {
      this.logger.error(
        `Nie udało się utworzyć spotkania dla „${req.title}"`,
        e instanceof Error ? e.stack : undefined,
      );
      return null;
    }
  }

  /** Aktualizuje termin i tytuł istniejącego wydarzenia. Nie rzuca. */
  async updateEvent(eventId: string, req: MeetLinkRequest): Promise<boolean> {
    if (!this.calendar) return false;

    try {
      await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: {
          summary: req.title,
          description: req.description ?? undefined,
          start: { dateTime: req.scheduledAt.toISOString() },
          end: { dateTime: this.endOf(req).toISOString() },
        },
      });
      return true;
    } catch (e) {
      this.logger.error(
        `Nie udało się zaktualizować wydarzenia ${eventId}`,
        e instanceof Error ? e.stack : undefined,
      );
      return false;
    }
  }

  /** Usuwa wydarzenie. Nie rzuca; brak wydarzenia (410/404) traktujemy jak sukces. */
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.calendar) return false;

    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });
      return true;
    } catch (e) {
      // Wydarzenie mogło zostać skasowane ręcznie w kalendarzu — to nie błąd,
      // bo cel („nie ma go tam") jest osiągnięty.
      const status = (e as { code?: number })?.code;
      if (status === 404 || status === 410) return true;

      this.logger.error(
        `Nie udało się usunąć wydarzenia ${eventId}`,
        e instanceof Error ? e.stack : undefined,
      );
      return false;
    }
  }

  private endOf(req: MeetLinkRequest): Date {
    return new Date(req.scheduledAt.getTime() + req.durationMin * 60_000);
  }
}
