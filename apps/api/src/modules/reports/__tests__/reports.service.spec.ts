import { Test, TestingModule } from '@nestjs/testing';
import { Row, Worksheet } from 'exceljs';
import { ReportsService } from '../reports.service';
import { PrismaService } from '../../../prisma/prisma.service';

const prismaMock = {
  payment: { findMany: jest.fn() },
  attendance: { findMany: jest.fn() },
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  group: { findUnique: jest.fn() },
};

/** Znajduje pierwszy wiersz, którego pierwsza komórka == label. */
function findRow(ws: Worksheet, label: string): Row | undefined {
  let found: Row | undefined;
  ws.eachRow((row) => {
    if (found) return;
    const value = row.getCell(1).value;
    if (typeof value === 'string' && value === label) found = row;
  });
  return found;
}

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(ReportsService);
  });

  describe('paymentsReport', () => {
    it('buduje arkusz z danymi, formatem i podsumowaniem wg statusu', async () => {
      prismaMock.payment.findMany.mockResolvedValue([
        {
          amount: '100.00',
          status: 'PAID',
          description: 'Maj',
          dueDate: new Date('2026-05-01'),
          paidAt: new Date('2026-05-02'),
          student: {
            firstName: 'Jan',
            lastName: 'Nowak',
            email: 'jan@test.pl',
          },
        },
        {
          amount: '200.00',
          status: 'OVERDUE',
          description: 'Czerwiec',
          dueDate: new Date('2026-06-01'),
          paidAt: null,
          student: {
            firstName: 'Anna',
            lastName: 'Kowalska',
            email: 'anna@test.pl',
          },
        },
      ]);

      const { workbook, filename } = await service.paymentsReport({});

      expect(filename).toMatch(/^raport-platnosci-\d{4}-\d{2}-\d{2}\.xlsx$/);
      const ws = workbook.getWorksheet('Płatności')!;

      // Nagłówek tabeli w wierszu 5
      expect(ws.getRow(5).getCell(1).value).toBe('Uczeń');
      expect(ws.getRow(5).getCell(4).value).toBe('Kwota');

      // Pierwszy wiersz danych
      const dataRow = ws.getRow(6);
      expect(dataRow.getCell(1).value).toBe('Jan Nowak');
      expect(dataRow.getCell(4).value).toBe(100);
      expect(dataRow.getCell(4).numFmt).toContain('zł');
      expect(dataRow.getCell(5).value).toBe('Zapłacone');

      // Podsumowanie
      const razem = findRow(ws, 'RAZEM (2)')!;
      expect(razem.getCell(4).value).toBe(300);
      expect(findRow(ws, 'Zapłacone (1)')!.getCell(4).value).toBe(100);
      expect(findRow(ws, 'Zaległe (1)')!.getCell(4).value).toBe(200);
    });

    it('przekłada filtry na zapytanie Prisma', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      await service.paymentsReport({
        status: 'PAID',
        from: '2026-01-01',
        to: '2026-06-30',
      });
      const where = prismaMock.payment.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('PAID');
      expect(where.dueDate.gte).toEqual(new Date('2026-01-01'));
      expect(where.dueDate.lte).toEqual(new Date('2026-06-30'));
    });
  });

  describe('attendanceReport', () => {
    it('agreguje frekwencję per uczeń (obecny + spóźniony / razem)', async () => {
      prismaMock.attendance.findMany.mockResolvedValue([
        {
          status: 'PRESENT',
          student: { id: 'a', firstName: 'Jan', lastName: 'Nowak' },
          class: { group: { name: 'Angielski A1' } },
        },
        {
          status: 'ABSENT',
          student: { id: 'a', firstName: 'Jan', lastName: 'Nowak' },
          class: { group: { name: 'Angielski A1' } },
        },
        {
          status: 'LATE',
          student: { id: 'b', firstName: 'Ala', lastName: 'Bąk' },
          class: { group: { name: 'Niemiecki B1' } },
        },
      ]);

      const { workbook } = await service.attendanceReport({});
      const ws = workbook.getWorksheet('Frekwencja')!;

      // Posortowane po nazwisku: Bąk (Ala) przed Nowak (Jan)
      const ala = findRow(ws, 'Ala Bąk')!;
      expect(ala.getCell(8).value).toBe(100); // 1 LATE / 1 = 100%
      const jan = findRow(ws, 'Jan Nowak')!;
      expect(jan.getCell(3).value).toBe(2); // razem
      expect(jan.getCell(8).value).toBe(50); // 1 obecny+spóźniony / 2

      const razem = findRow(ws, 'RAZEM (2 uczniów)')!;
      expect(razem.getCell(3).value).toBe(3);
      expect(razem.getCell(8).value).toBe(67); // (1+1)/3 ≈ 67%
    });
  });

  describe('studentsReport', () => {
    it('mapuje rolę, wiek i rodzica na czytelne wartości', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        {
          firstName: 'Kasia',
          lastName: 'Nowak',
          email: 'kasia@academy.pl',
          phone: null,
          role: 'STUDENT',
          isMinor: true,
          isActive: true,
          createdAt: new Date('2026-01-15'),
          asStudent: [{ parent: { firstName: 'Anna', lastName: 'Nowak' } }],
        },
      ]);

      const { workbook, filename } = await service.studentsReport({
        role: 'STUDENT',
      });

      expect(filename).toMatch(/^raport-uczniowie-/);
      const ws = workbook.getWorksheet('Uczniowie')!;
      const row = ws.getRow(6);
      expect(row.getCell(4).value).toBe('Uczeń'); // rola
      expect(row.getCell(5).value).toBe('—'); // telefon brak
      expect(row.getCell(6).value).toBe('Tak'); // niepełnoletni
      expect(row.getCell(7).value).toBe('Anna Nowak'); // rodzic
      expect(findRow(ws, 'RAZEM (1)')).toBeDefined();
    });
  });
});
