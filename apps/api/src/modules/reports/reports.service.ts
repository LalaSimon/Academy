import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportPaymentsDto } from './dto/report-payments.dto';
import { ReportAttendanceDto } from './dto/report-attendance.dto';
import { ReportStudentsDto } from './dto/report-students.dto';
import { buildReportSheet, ReportColumn, SummaryRow } from './xlsx-builder';

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Oczekuje',
  PAID: 'Zapłacone',
  OVERDUE: 'Zaległe',
  REFUNDED: 'Zwrot',
  CANCELLED: 'Anulowane',
};

// Jasne tła komórek statusu (ARGB) — spójne z kolorystyką w aplikacji.
const PAYMENT_STATUS_FILL: Record<string, string> = {
  Zapłacone: 'FFD1FAE5',
  Oczekuje: 'FFFEF3C7',
  Zaległe: 'FFFEE2E2',
  Zwrot: 'FFDBEAFE',
  Anulowane: 'FFF3F4F6',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Nauczyciel',
  STUDENT: 'Uczeń',
  PARENT: 'Rodzic',
};

export interface GeneratedReport {
  workbook: Workbook;
  filename: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Płatności ───────────────────────────────────────────────────────
  async paymentsReport(query: ReportPaymentsDto): Promise<GeneratedReport> {
    const { studentId, groupId, status, from, to } = query;

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (from || to) {
      const dueDate: Record<string, unknown> = {};
      if (from) dueDate.gte = new Date(from);
      if (to) dueDate.lte = new Date(to);
      where.dueDate = dueDate;
    }
    if (groupId) {
      where.student = {
        studentGroups: { some: { groupId, isActive: true } },
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        student: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    const columns: ReportColumn[] = [
      { header: 'Uczeń', key: 'student', type: 'text' },
      { header: 'Email', key: 'email', type: 'text' },
      { header: 'Opis', key: 'description', type: 'text' },
      { header: 'Kwota', key: 'amount', type: 'currency' },
      {
        header: 'Status',
        key: 'status',
        type: 'text',
        colorMap: PAYMENT_STATUS_FILL,
      },
      { header: 'Termin', key: 'dueDate', type: 'date' },
      { header: 'Opłacono', key: 'paidAt', type: 'date' },
    ];

    const rows = payments.map((p) => ({
      student: `${p.student.firstName} ${p.student.lastName}`,
      email: p.student.email,
      description: p.description,
      amount: Number(p.amount),
      status: PAYMENT_STATUS_LABEL[p.status] ?? p.status,
      dueDate: p.dueDate,
      paidAt: p.paidAt ?? null,
    }));

    const acc = {
      total: 0,
      paid: 0,
      overdue: 0,
      pending: 0,
      paidCount: 0,
      overdueCount: 0,
      pendingCount: 0,
    };
    for (const p of payments) {
      const amount = Number(p.amount);
      acc.total += amount;
      if (p.status === 'PAID') {
        acc.paid += amount;
        acc.paidCount++;
      } else if (p.status === 'OVERDUE') {
        acc.overdue += amount;
        acc.overdueCount++;
      } else if (p.status === 'PENDING') {
        acc.pending += amount;
        acc.pendingCount++;
      }
    }

    const summaries: SummaryRow[] = [
      { label: `RAZEM (${payments.length})`, values: { amount: acc.total } },
      {
        label: `Zapłacone (${acc.paidCount})`,
        values: { amount: acc.paid },
      },
      {
        label: `Zaległe (${acc.overdueCount})`,
        values: { amount: acc.overdue },
      },
      {
        label: `Oczekujące (${acc.pendingCount})`,
        values: { amount: acc.pending },
      },
    ];

    const filters = await this.buildFilterLines({
      from,
      to,
      status: status ? PAYMENT_STATUS_LABEL[status] : undefined,
      studentId,
      groupId,
    });

    const workbook = new Workbook();
    buildReportSheet(
      workbook,
      'Płatności',
      columns,
      rows,
      { title: 'Raport płatności', filters },
      summaries,
    );

    return { workbook, filename: this.filename('platnosci') };
  }

  // ── Frekwencja ──────────────────────────────────────────────────────
  async attendanceReport(query: ReportAttendanceDto): Promise<GeneratedReport> {
    const { studentId, groupId, from, to } = query;

    const classWhere: Record<string, unknown> = {};
    if (from || to) {
      const scheduledAt: Record<string, unknown> = {};
      if (from) scheduledAt.gte = new Date(from);
      if (to) scheduledAt.lte = new Date(to);
      classWhere.scheduledAt = scheduledAt;
    }
    if (groupId) classWhere.groupId = groupId;

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (Object.keys(classWhere).length) where.class = classWhere;

    const records = await this.prisma.attendance.findMany({
      where,
      select: {
        status: true,
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        class: { select: { group: { select: { name: true } } } },
      },
    });

    type Entry = {
      firstName: string;
      lastName: string;
      groups: Set<string>;
      total: number;
      present: number;
      late: number;
      absent: number;
      excused: number;
    };
    const byStudent = new Map<string, Entry>();

    for (const r of records) {
      let entry = byStudent.get(r.student.id);
      if (!entry) {
        entry = {
          firstName: r.student.firstName,
          lastName: r.student.lastName,
          groups: new Set(),
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
        };
        byStudent.set(r.student.id, entry);
      }
      if (r.class.group?.name) entry.groups.add(r.class.group.name);
      entry.total++;
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'LATE') entry.late++;
      else if (r.status === 'ABSENT') entry.absent++;
      else if (r.status === 'EXCUSED') entry.excused++;
    }

    const entries = Array.from(byStudent.values()).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        'pl',
      ),
    );

    const columns: ReportColumn[] = [
      { header: 'Uczeń', key: 'student', type: 'text' },
      { header: 'Grupy', key: 'groups', type: 'text' },
      { header: 'Zajęć', key: 'total', type: 'number' },
      { header: 'Obecny', key: 'present', type: 'number' },
      { header: 'Spóźniony', key: 'late', type: 'number' },
      { header: 'Nieobecny', key: 'absent', type: 'number' },
      { header: 'Usprawiedl.', key: 'excused', type: 'number' },
      { header: 'Frekwencja', key: 'rate', type: 'percent' },
    ];

    const rows = entries.map((e) => ({
      student: `${e.firstName} ${e.lastName}`,
      groups: Array.from(e.groups).join(', '),
      total: e.total,
      present: e.present,
      late: e.late,
      absent: e.absent,
      excused: e.excused,
      rate:
        e.total > 0 ? Math.round(((e.present + e.late) / e.total) * 100) : 0,
    }));

    const sum = entries.reduce(
      (acc, e) => {
        acc.total += e.total;
        acc.present += e.present;
        acc.late += e.late;
        acc.absent += e.absent;
        acc.excused += e.excused;
        return acc;
      },
      { total: 0, present: 0, late: 0, absent: 0, excused: 0 },
    );

    const summaries: SummaryRow[] = [
      {
        label: `RAZEM (${entries.length} uczniów)`,
        values: {
          total: sum.total,
          present: sum.present,
          late: sum.late,
          absent: sum.absent,
          excused: sum.excused,
          rate:
            sum.total > 0
              ? Math.round(((sum.present + sum.late) / sum.total) * 100)
              : 0,
        },
      },
    ];

    const filters = await this.buildFilterLines({
      from,
      to,
      studentId,
      groupId,
    });

    const workbook = new Workbook();
    buildReportSheet(
      workbook,
      'Frekwencja',
      columns,
      rows,
      { title: 'Raport frekwencji', filters },
      summaries,
    );

    return { workbook, filename: this.filename('frekwencja') };
  }

  // ── Uczniowie / użytkownicy ─────────────────────────────────────────
  async studentsReport(query: ReportStudentsDto): Promise<GeneratedReport> {
    const { role, search, isMinor } = query;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (isMinor !== undefined) where.isMinor = isMinor;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isMinor: true,
        isActive: true,
        createdAt: true,
        asStudent: {
          select: {
            parent: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    const columns: ReportColumn[] = [
      { header: 'Imię', key: 'firstName', type: 'text' },
      { header: 'Nazwisko', key: 'lastName', type: 'text' },
      { header: 'Email', key: 'email', type: 'text' },
      { header: 'Rola', key: 'role', type: 'text' },
      { header: 'Telefon', key: 'phone', type: 'text' },
      { header: 'Niepełnoletni', key: 'isMinor', type: 'text' },
      { header: 'Rodzic', key: 'parent', type: 'text' },
      { header: 'Aktywny', key: 'isActive', type: 'text' },
      { header: 'Utworzono', key: 'createdAt', type: 'date' },
    ];

    const rows = users.map((u) => {
      const parent = u.asStudent[0]?.parent;
      return {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: ROLE_LABEL[u.role] ?? u.role,
        phone: u.phone ?? '—',
        isMinor: u.isMinor ? 'Tak' : 'Nie',
        parent: parent ? `${parent.firstName} ${parent.lastName}` : '—',
        isActive: u.isActive ? 'Tak' : 'Nie',
        createdAt: u.createdAt,
      };
    });

    const summaries: SummaryRow[] = [
      { label: `RAZEM (${users.length})`, values: {} },
    ];

    const filters = await this.buildFilterLines({
      role: role ? ROLE_LABEL[role] : undefined,
      isMinor,
      search,
    });

    const workbook = new Workbook();
    buildReportSheet(
      workbook,
      'Uczniowie',
      columns,
      rows,
      { title: 'Raport uczniów', filters },
      summaries,
    );

    return { workbook, filename: this.filename('uczniowie') };
  }

  // ── Pomocnicze ──────────────────────────────────────────────────────
  private async buildFilterLines(opts: {
    from?: string;
    to?: string;
    status?: string;
    role?: string;
    search?: string;
    isMinor?: boolean;
    studentId?: string;
    groupId?: string;
  }): Promise<string[]> {
    const lines: string[] = [];
    if (opts.from) lines.push(`Od: ${this.fmtDate(opts.from)}`);
    if (opts.to) lines.push(`Do: ${this.fmtDate(opts.to)}`);
    if (opts.status) lines.push(`Status: ${opts.status}`);
    if (opts.role) lines.push(`Rola: ${opts.role}`);
    if (opts.isMinor !== undefined) {
      lines.push(`Niepełnoletni: ${opts.isMinor ? 'Tak' : 'Nie'}`);
    }
    if (opts.search) lines.push(`Szukaj: "${opts.search}"`);
    if (opts.studentId) {
      const s = await this.prisma.user.findUnique({
        where: { id: opts.studentId },
        select: { firstName: true, lastName: true },
      });
      lines.push(
        `Uczeń: ${s ? `${s.firstName} ${s.lastName}` : opts.studentId}`,
      );
    }
    if (opts.groupId) {
      const g = await this.prisma.group.findUnique({
        where: { id: opts.groupId },
        select: { name: true },
      });
      lines.push(`Grupa: ${g?.name ?? opts.groupId}`);
    }
    return lines;
  }

  private fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('pl-PL');
  }

  private filename(slug: string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `raport-${slug}-${today}.xlsx`;
  }
}
