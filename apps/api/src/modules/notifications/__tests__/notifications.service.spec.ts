import { Test } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';

const prismaMock = {
  user: { findUnique: jest.fn() },
  parentStudent: { findFirst: jest.fn() },
  class: { findMany: jest.fn(), update: jest.fn() },
  payment: { findMany: jest.fn(), update: jest.fn() },
};

const mailMock = {
  sendAbsenceNotification: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendPaymentOverdue: jest.fn().mockResolvedValue(undefined),
  sendClassReminder: jest.fn().mockResolvedValue(undefined),
  sendPaymentReminder: jest.fn().mockResolvedValue(undefined),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MailService, useValue: mailMock },
      ],
    }).compile();
    service = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  const cls = {
    title: 'Angielski B1',
    scheduledAt: new Date('2026-07-01T10:00:00Z'),
  };

  describe('routing odbiorcy (notifyAbsence)', () => {
    it('uczeń pełnoletni → mail na jego własny adres', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        firstName: 'Jan',
        lastName: 'Nowak',
        email: 'jan@example.com',
        isMinor: false,
      });

      await service.notifyAbsence('stu1', cls);

      expect(mailMock.sendAbsenceNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jan@example.com',
          studentName: 'Jan Nowak',
        }),
      );
      expect(prismaMock.parentStudent.findFirst).not.toHaveBeenCalled();
    });

    it('uczeń niepełnoletni → mail na adres rodzica', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        firstName: 'Mały',
        lastName: 'Jasiek',
        email: 'jasiek@academy.pl',
        isMinor: true,
      });
      prismaMock.parentStudent.findFirst.mockResolvedValue({
        parent: { email: 'rodzic@example.com' },
      });

      await service.notifyAbsence('stu2', cls);

      expect(mailMock.sendAbsenceNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'rodzic@example.com',
          studentName: 'Mały Jasiek',
        }),
      );
    });

    it('niepełnoletni bez rodzica → nie wysyła maila', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        firstName: 'Sierota',
        lastName: 'Bezrodzic',
        email: 'x@academy.pl',
        isMinor: true,
      });
      prismaMock.parentStudent.findFirst.mockResolvedValue(null);

      await service.notifyAbsence('stu3', cls);

      expect(mailMock.sendAbsenceNotification).not.toHaveBeenCalled();
    });

    it('nieistniejący uczeń → nie wysyła maila', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.notifyAbsence('ghost', cls);

      expect(mailMock.sendAbsenceNotification).not.toHaveBeenCalled();
    });

    it('błąd maila nie propaguje do wywołującego', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        firstName: 'Jan',
        lastName: 'Nowak',
        email: 'jan@example.com',
        isMinor: false,
      });
      mailMock.sendAbsenceNotification.mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await expect(service.notifyAbsence('stu1', cls)).resolves.toBeUndefined();
    });
  });

  describe('sendUpcomingClassReminders (cron)', () => {
    it('wysyła przypomnienia uczniom grupy i oznacza zajęcia', async () => {
      prismaMock.class.findMany.mockResolvedValue([
        {
          id: 'cls1',
          title: 'Hiszpański A2',
          scheduledAt: new Date(),
          meetLink: 'https://meet/abc',
          teacher: { firstName: 'Anna', lastName: 'Kowalska' },
          student: null,
          group: {
            teacher: null,
            students: [{ studentId: 'stu1' }],
          },
        },
      ]);
      prismaMock.user.findUnique.mockResolvedValue({
        firstName: 'Jan',
        lastName: 'Nowak',
        email: 'jan@example.com',
        isMinor: false,
      });

      await service.sendUpcomingClassReminders();

      expect(mailMock.sendClassReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jan@example.com',
          teacherName: 'Anna Kowalska',
        }),
      );
      expect(prismaMock.class.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cls1' },
          data: { reminderSentAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('sendUpcomingPaymentReminders (cron)', () => {
    it('wysyła przypomnienia i oznacza płatności', async () => {
      prismaMock.payment.findMany.mockResolvedValue([
        {
          id: 'pay1',
          studentId: 'stu1',
          amount: '150.00',
          currency: 'PLN',
          description: 'Lipiec',
          dueDate: new Date(),
        },
      ]);
      prismaMock.user.findUnique.mockResolvedValue({
        firstName: 'Jan',
        lastName: 'Nowak',
        email: 'jan@example.com',
        isMinor: false,
      });

      await service.sendUpcomingPaymentReminders();

      expect(mailMock.sendPaymentReminder).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'jan@example.com', amount: '150.00' }),
      );
      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay1' },
          data: { reminderSentAt: expect.any(Date) },
        }),
      );
    });
  });
});
