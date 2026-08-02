import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from '../google-calendar.service';

const insertMock = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest
        .fn()
        .mockImplementation(() => ({ setCredentials: jest.fn() })),
    },
    calendar: jest.fn(() => ({ events: { insert: insertMock } })),
  },
}));

/** ConfigService z podanym zestawem zmiennych; `getOrThrow` zachowuje się jak prawdziwy. */
function configWith(values: Record<string, string>) {
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
    getOrThrow: (key: string) => {
      if (values[key] === undefined) {
        throw new Error(`Configuration key "${key}" does not exist`);
      }
      return values[key];
    },
  };
}

async function build(values: Record<string, string>) {
  const module = await Test.createTestingModule({
    providers: [
      GoogleCalendarService,
      { provide: ConfigService, useValue: configWith(values) },
    ],
  }).compile();
  return module.get(GoogleCalendarService);
}

const req = {
  title: 'Angielski B2',
  description: 'Present Perfect',
  scheduledAt: new Date('2026-09-01T10:00:00.000Z'),
  durationMin: 90,
};

describe('GoogleCalendarService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('gdy integracja jest wyłączona', () => {
    it('jest nieaktywna, gdy brak zmiennej', async () => {
      const service = await build({});
      expect(service.isEnabled).toBe(false);
    });

    it('nie woła Google i zwraca null', async () => {
      const service = await build({ GOOGLE_CALENDAR_ENABLED: 'false' });
      await expect(service.createMeetLink(req)).resolves.toBeNull();
      expect(insertMock).not.toHaveBeenCalled();
    });

    // Wyłączona integracja nie może wymagać sekretów — inaczej nie dałoby się
    // uruchomić aplikacji bez konta Google.
    it('nie wymaga sekretów', async () => {
      await expect(
        build({ GOOGLE_CALENDAR_ENABLED: 'false' }),
      ).resolves.toBeDefined();
    });
  });

  describe('gdy integracja jest włączona', () => {
    const enabled = {
      GOOGLE_CALENDAR_ENABLED: 'true',
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REFRESH_TOKEN: 'refresh',
    };

    // Połowicznie skonfigurowana integracja jest gorsza niż wyłączona —
    // start ma się zatrzymać, nie „prawie działać".
    it('nie wstaje bez kompletu sekretów', async () => {
      await expect(
        build({ GOOGLE_CALENDAR_ENABLED: 'true', GOOGLE_CLIENT_ID: 'id' }),
      ).rejects.toThrow(/GOOGLE_CLIENT_SECRET/);
    });

    it('zwraca hangoutLink zwrócony przez Google', async () => {
      insertMock.mockResolvedValue({
        data: { hangoutLink: 'https://meet.google.com/abc-defg-hij' },
      });
      const service = await build(enabled);

      await expect(service.createMeetLink(req)).resolves.toBe(
        'https://meet.google.com/abc-defg-hij',
      );
    });

    it('liczy koniec wydarzenia z czasu trwania', async () => {
      insertMock.mockResolvedValue({
        data: { hangoutLink: 'https://meet.google.com/x' },
      });
      const service = await build(enabled);
      await service.createMeetLink(req);

      const body = insertMock.mock.calls[0][0].requestBody;
      expect(body.start.dateTime).toBe('2026-09-01T10:00:00.000Z');
      // 10:00 + 90 min
      expect(body.end.dateTime).toBe('2026-09-01T11:30:00.000Z');
    });

    it('prosi o konferencję typu hangoutsMeet z unikalnym requestId', async () => {
      insertMock.mockResolvedValue({
        data: { hangoutLink: 'https://meet.google.com/x' },
      });
      const service = await build(enabled);
      await service.createMeetLink(req);
      await service.createMeetLink(req);

      const [first, second] = insertMock.mock.calls;
      expect(first[0].conferenceDataVersion).toBe(1);
      expect(
        first[0].requestBody.conferenceData.createRequest.conferenceSolutionKey
          .type,
      ).toBe('hangoutsMeet');
      // requestId służy Google do deduplikacji — nie może się powtarzać.
      expect(
        first[0].requestBody.conferenceData.createRequest.requestId,
      ).not.toBe(second[0].requestBody.conferenceData.createRequest.requestId);
    });

    // Brak linku nie może zablokować utworzenia zajęć.
    it('zwraca null zamiast rzucać, gdy Google odmówi', async () => {
      insertMock.mockRejectedValue(new Error('403 insufficient permissions'));
      const service = await build(enabled);

      await expect(service.createMeetLink(req)).resolves.toBeNull();
    });

    it('zwraca null, gdy odpowiedź nie zawiera hangoutLink', async () => {
      insertMock.mockResolvedValue({ data: {} });
      const service = await build(enabled);

      await expect(service.createMeetLink(req)).resolves.toBeNull();
    });
  });
});
