import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../payments.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const notificationsMock = {
  notifyPaymentConfirmation: jest.fn(),
  notifyPaymentOverdue: jest.fn(),
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://stripe.test/pay',
          id: 'cs_test_123',
        }),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});
const mockPayment = {
  id: 'pay1',
  studentId: 'stu1',
  amount: '200.00',
  currency: 'PLN',
  description: 'Lekcje — maj 2026',
  status: 'PENDING',
  dueDate: new Date('2026-06-01'),
  paidAt: null,
  periodStart: null,
  periodEnd: null,
  externalId: null,
  paymentProvider: null,
  providerData: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: {
    id: 'stu1',
    firstName: 'Jan',
    lastName: 'Nowak',
    email: 'jan@test.pl',
  },
};

const prismaMock = {
  payment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  group: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated payments', async () => {
      prismaMock.payment.findMany.mockResolvedValue([mockPayment]);
      prismaMock.payment.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by status', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.payment.count.mockResolvedValue(0);

      await service.findAll({ status: 'OVERDUE' });

      expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OVERDUE' }),
        }),
      );
    });

    it('filters by studentId', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.payment.count.mockResolvedValue(0);

      await service.findAll({ studentId: 'stu1' });

      expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studentId: 'stu1' }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('aggregates payment counts and amounts correctly', async () => {
      prismaMock.payment.findMany.mockResolvedValue([
        { status: 'PAID', amount: '200.00' },
        { status: 'PAID', amount: '150.00' },
        { status: 'PENDING', amount: '200.00' },
        { status: 'OVERDUE', amount: '100.00' },
      ]);

      const stats = await service.getStats({});

      expect(stats.total).toBe(4);
      expect(stats.paid).toBe(2);
      expect(stats.paidAmount).toBe(350);
      expect(stats.pending).toBe(1);
      expect(stats.overdue).toBe(1);
      expect(stats.overdueAmount).toBe(100);
    });
  });

  describe('findOne', () => {
    it('returns payment when found', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
      const result = await service.findOne('pay1');
      expect(result.id).toBe('pay1');
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates payment for existing student', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'stu1' });
      prismaMock.payment.create.mockResolvedValue(mockPayment);

      const result = await service.create({
        studentId: 'stu1',
        amount: '200.00',
        description: 'Lekcje — maj 2026',
        dueDate: '2026-06-01',
      });

      expect(result.id).toBe('pay1');
      expect(prismaMock.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ studentId: 'stu1' }),
        }),
      );
    });

    it('throws NotFoundException for missing student', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({
          studentId: 'missing',
          amount: '100.00',
          description: 'test',
          dueDate: '2026-06-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBulk', () => {
    it('creates one payment per active student in group', async () => {
      prismaMock.group.findUnique.mockResolvedValue({
        id: 'g1',
        students: [{ studentId: 'stu1' }, { studentId: 'stu2' }],
      });
      prismaMock.$transaction.mockResolvedValue([mockPayment, mockPayment]);

      const result = await service.createBulk({
        groupId: 'g1',
        amount: '200.00',
        description: 'Maj 2026',
        dueDate: '2026-06-01',
      });

      expect(result).toHaveLength(2);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('throws BadRequestException when group has no students', async () => {
      prismaMock.group.findUnique.mockResolvedValue({ id: 'g1', students: [] });
      await expect(
        service.createBulk({
          groupId: 'g1',
          amount: '200.00',
          description: 'test',
          dueDate: '2026-06-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for missing group', async () => {
      prismaMock.group.findUnique.mockResolvedValue(null);
      await expect(
        service.createBulk({
          groupId: 'missing',
          amount: '200.00',
          description: 'test',
          dueDate: '2026-06-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('sets paidAt when status changed to PAID', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
      prismaMock.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        paidAt: new Date(),
      });

      await service.updateStatus('pay1', { status: 'PAID' });

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
            paidAt: expect.any(Date),
          }),
        }),
      );
    });

    it('does not set paidAt for non-PAID status', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
      prismaMock.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'CANCELLED',
      });

      await service.updateStatus('pay1', { status: 'CANCELLED' });

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paidAt: undefined }),
        }),
      );
    });
  });

  describe('markOverdue (cron)', () => {
    it('marks PENDING past-due payments as OVERDUE', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.payment.updateMany.mockResolvedValue({ count: 3 });

      await service.markOverdue();

      expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', dueDate: { lt: expect.any(Date) } },
        data: { status: 'OVERDUE' },
      });
    });

    it('notifies each newly overdue payment', async () => {
      prismaMock.payment.findMany.mockResolvedValue([mockPayment]);
      prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.markOverdue();

      expect(notificationsMock.notifyPaymentOverdue).toHaveBeenCalledWith(
        'stu1',
        expect.objectContaining({
          amount: '200.00',
          currency: 'PLN',
          description: 'Lekcje — maj 2026',
        }),
      );
    });
  });

  describe('createCheckout', () => {
    it('throws NotFoundException when payment missing', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.createCheckout('missing', 'https://example.com/return'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when payment already PAID', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });
      await expect(
        service.createCheckout('pay1', 'https://example.com/return'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns checkoutUrl for PENDING payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.createCheckout(
        'pay1',
        'https://example.com/return',
      );

      expect(result.checkoutUrl).toBe('https://stripe.test/pay');
    });
  });

  describe('update', () => {
    it('updates payment fields', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
      prismaMock.payment.update.mockResolvedValue({
        ...mockPayment,
        description: 'Updated desc',
      });

      const result = await service.update('pay1', {
        description: 'Updated desc',
      });

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay1' },
          data: { description: 'Updated desc' },
        }),
      );
      expect(result.description).toBe('Updated desc');
    });

    it('throws NotFoundException for missing payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes existing payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
      prismaMock.payment.delete.mockResolvedValue(mockPayment);

      await service.remove('pay1');

      expect(prismaMock.payment.delete).toHaveBeenCalledWith({
        where: { id: 'pay1' },
      });
    });

    it('throws NotFoundException for missing payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
