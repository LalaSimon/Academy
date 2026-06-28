import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePaymentDto,
  CreateBulkPaymentsDto,
} from './dto/create-payment.dto';
import {
  UpdatePaymentDto,
  UpdatePaymentStatusDto,
} from './dto/update-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { QueryStatsDto } from './dto/query-stats.dto';
import { PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-06-24.dahlia',
  });

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPaymentsDto) {
    const {
      studentId,
      groupId,
      status,
      from,
      to,
      page = 1,
      limit = 20,
    } = query;

    const where: Record<string, unknown> = {};

    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    if (from || to) {
      where.dueDate = {};
      if (from) (where.dueDate as Record<string, unknown>).gte = new Date(from);
      if (to) (where.dueDate as Record<string, unknown>).lte = new Date(to);
    }

    if (groupId) {
      where.student = {
        studentGroups: { some: { groupId, isActive: true } },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getStats(query: QueryStatsDto) {
    const where: Record<string, unknown> = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.from || query.to) {
      where.dueDate = {};
      if (query.from)
        (where.dueDate as Record<string, unknown>).gte = new Date(query.from);
      if (query.to)
        (where.dueDate as Record<string, unknown>).lte = new Date(query.to);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      select: { status: true, amount: true },
    });

    const summary = payments.reduce(
      (acc, p) => {
        acc.total++;
        acc.totalAmount += Number(p.amount);
        if (p.status === 'PAID') {
          acc.paid++;
          acc.paidAmount += Number(p.amount);
        }
        if (p.status === 'PENDING') acc.pending++;
        if (p.status === 'OVERDUE') {
          acc.overdue++;
          acc.overdueAmount += Number(p.amount);
        }
        return acc;
      },
      {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
        overdueAmount: 0,
      },
    );

    return summary;
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  async create(dto: CreatePaymentDto) {
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student)
      throw new NotFoundException(`Student ${dto.studentId} not found`);

    return this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        amount: dto.amount,
        currency: dto.currency ?? 'PLN',
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async createBulk(dto: CreateBulkPaymentsDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: {
        students: { where: { isActive: true }, select: { studentId: true } },
      },
    });
    if (!group) throw new NotFoundException(`Group ${dto.groupId} not found`);
    if (group.students.length === 0)
      throw new BadRequestException('Group has no active students');

    const payments = await this.prisma.$transaction(
      group.students.map((gs) =>
        this.prisma.payment.create({
          data: {
            studentId: gs.studentId,
            amount: dto.amount,
            currency: dto.currency ?? 'PLN',
            description: dto.description,
            dueDate: new Date(dto.dueDate),
            periodStart: dto.periodStart
              ? new Date(dto.periodStart)
              : undefined,
            periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
          },
        }),
      ),
    );

    return payments;
  }

  async updateStatus(id: string, dto: UpdatePaymentStatusDto) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: dto.status as PaymentStatus,
        paidAt: dto.status === 'PAID' ? new Date() : undefined,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdatePaymentDto) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.description && { description: dto.description }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.periodStart && { periodStart: new Date(dto.periodStart) }),
        ...(dto.periodEnd && { periodEnd: new Date(dto.periodEnd) }),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.payment.delete({ where: { id } });
  }

  // ── Stripe ────────────────────────────────────────────────────────────────

  async createCheckout(id: string, returnUrl: string) {
    const payment = await this.findOne(id);
    if (payment.status !== 'PENDING' && payment.status !== 'OVERDUE') {
      throw new BadRequestException(
        'Only PENDING or OVERDUE payments can be checked out',
      );
    }

    const amountGrosze = Math.round(Number(payment.amount) * 100);
    const currency = payment.currency.toLowerCase();

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: payment.student.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountGrosze,
            product_data: { name: payment.description },
          },
        },
      ],
      metadata: { paymentId: id },
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${returnUrl}?status=cancelled`,
    });

    await this.prisma.payment.update({
      where: { id },
      data: {
        externalId: session.id,
        paymentProvider: 'stripe',
      },
    });

    return { checkoutUrl: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;
      if (!paymentId) return { received: true };

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          externalId: session.id,
          paymentProvider: 'stripe',
        },
      });
    }

    return { received: true };
  }

  // ── Cron ──────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdue() {
    const result = await this.prisma.payment.updateMany({
      where: { status: 'PENDING', dueDate: { lt: new Date() } },
      data: { status: 'OVERDUE' },
    });
    return result;
  }

  // Runs 1st of every month at 00:05 — creates monthly payments for recurring classes
  @Cron('5 0 1 * *')
  async createMonthlyPayments() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const dueDate = new Date(year, month - 1, 14);

    // All recurring classes (have scheduleId) with price, not cancelled
    const classes = await this.prisma.class.findMany({
      where: {
        scheduleId: { not: null },
        pricePerClass: { not: null },
        scheduledAt: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELLED' },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            students: {
              where: { isActive: true },
              select: { studentId: true },
            },
          },
        },
      },
    });

    // Aggregate: groupId → { totalAmount, classCount, studentIds, groupName }
    const byGroup = new Map<
      string,
      {
        totalAmount: number;
        classCount: number;
        studentIds: string[];
        groupName: string;
      }
    >();

    for (const cls of classes) {
      if (!cls.groupId || !cls.pricePerClass) continue;
      const key = cls.groupId;
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          totalAmount: 0,
          classCount: 0,
          studentIds: cls.group!.students.map((s) => s.studentId),
          groupName: cls.group!.name,
        });
      }
      const entry = byGroup.get(key)!;
      entry.totalAmount += Number(cls.pricePerClass);
      entry.classCount++;
    }

    const monthName = startOfMonth.toLocaleString('pl', {
      month: 'long',
      year: 'numeric',
    });

    for (const [
      groupId,
      { totalAmount, classCount, studentIds, groupName },
    ] of byGroup) {
      const priceEach =
        classCount > 0 ? Math.round(totalAmount / classCount) : 0;

      for (const studentId of studentIds) {
        const exists = await this.prisma.payment.findFirst({
          where: { studentId, groupId, periodStart: startOfMonth },
        });
        if (exists) continue;

        await this.prisma.payment.create({
          data: {
            studentId,
            groupId,
            amount: totalAmount.toFixed(2),
            currency: 'PLN',
            description: `${groupName} — ${monthName} (${classCount} lekcji × ${priceEach} PLN)`,
            dueDate,
            periodStart: startOfMonth,
            periodEnd: endOfMonth,
          },
        });
      }
    }
  }

  async getParentChildIds(parentId: string): Promise<string[]> {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });
    return links.map((l) => l.studentId);
  }
}
