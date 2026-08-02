import { Test } from '@nestjs/testing';
import { ClassCalendarService } from '../class-calendar.service';
import { GoogleCalendarService } from '../google-calendar.service';
import { PrismaService } from '../../../prisma/prisma.service';

const prismaMock = {
  class: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const googleMock = {
  isEnabled: true,
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
};

const cls = {
  id: 'c1',
  title: 'Angielski B2',
  description: null,
  scheduledAt: new Date('2026-09-01T10:00:00.000Z'),
  durationMin: 60,
};

describe('ClassCalendarService', () => {
  let service: ClassCalendarService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClassCalendarService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GoogleCalendarService, useValue: googleMock },
      ],
    }).compile();
    service = module.get(ClassCalendarService);
    jest.clearAllMocks();
    googleMock.isEnabled = true;
  });

  describe('attach', () => {
    it('zapisuje link ORAZ googleEventId', async () => {
      prismaMock.class.findMany.mockResolvedValue([cls]);
      googleMock.createEvent.mockResolvedValue({
        eventId: 'evt-1',
        meetLink: 'https://meet.google.com/abc',
      });

      await service.attach(['c1']);

      expect(prismaMock.class.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: {
          meetLink: 'https://meet.google.com/abc',
          googleEventId: 'evt-1',
        },
      });
    });

    // Ręcznie wpisany link ma pierwszeństwo — admin mógł wskazać Zoom.
    it('pomija zajęcia, które mają już link (filtr meetLink: null)', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      await service.attach(['c1']);

      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ meetLink: null }),
        }),
      );
      expect(googleMock.createEvent).not.toHaveBeenCalled();
    });

    it('nie rusza bazy, gdy Google nie zwróciło wydarzenia', async () => {
      prismaMock.class.findMany.mockResolvedValue([cls]);
      googleMock.createEvent.mockResolvedValue(null);

      await service.attach(['c1']);
      expect(prismaMock.class.update).not.toHaveBeenCalled();
    });

    it('nic nie robi przy wyłączonej integracji', async () => {
      googleMock.isEnabled = false;
      await service.attach(['c1']);
      expect(prismaMock.class.findMany).not.toHaveBeenCalled();
    });

    it('nic nie robi dla pustej listy', async () => {
      await service.attach([]);
      expect(prismaMock.class.findMany).not.toHaveBeenCalled();
    });
  });

  describe('sync', () => {
    it('aktualizuje tylko zajęcia powiązane z wydarzeniem', async () => {
      prismaMock.class.findMany.mockResolvedValue([
        { ...cls, googleEventId: 'evt-1' },
      ]);

      await service.sync(['c1']);

      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ googleEventId: { not: null } }),
        }),
      );
      expect(googleMock.updateEvent).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({ scheduledAt: cls.scheduledAt }),
      );
    });

    it('nic nie robi przy wyłączonej integracji', async () => {
      googleMock.isEnabled = false;
      await service.sync(['c1']);
      expect(googleMock.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    it('usuwa wydarzenie i czyści powiązanie', async () => {
      prismaMock.class.findMany.mockResolvedValue([
        { id: 'c1', googleEventId: 'evt-1' },
      ]);
      googleMock.deleteEvent.mockResolvedValue(true);

      await service.detach(['c1']);

      expect(googleMock.deleteEvent).toHaveBeenCalledWith('evt-1');
      expect(prismaMock.class.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['c1'] } },
        data: { meetLink: null, googleEventId: null },
      });
    });

    // Bez integracji nie ma jak skasować wydarzenia, ale martwe id nie powinno
    // zostać w bazie.
    it('czyści powiązanie nawet przy wyłączonej integracji', async () => {
      googleMock.isEnabled = false;
      prismaMock.class.findMany.mockResolvedValue([
        { id: 'c1', googleEventId: 'evt-1' },
      ]);

      await service.detach(['c1']);

      expect(googleMock.deleteEvent).not.toHaveBeenCalled();
      expect(prismaMock.class.updateMany).toHaveBeenCalled();
    });

    it('nic nie robi, gdy żadne zajęcia nie mają wydarzenia', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      await service.detach(['c1']);
      expect(prismaMock.class.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('classIdsInBatch', () => {
    it('zwraca identyfikatory zajęć z serii', async () => {
      prismaMock.class.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      await expect(service.classIdsInBatch('b1')).resolves.toEqual([
        'c1',
        'c2',
      ]);
    });
  });
});
