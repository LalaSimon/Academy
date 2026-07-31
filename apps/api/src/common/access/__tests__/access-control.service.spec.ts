import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessControlService } from '../access-control.service';
import { PrismaService } from '../../../prisma/prisma.service';

const prismaMock = {
  parentStudent: { findMany: jest.fn() },
  group: { findMany: jest.fn() },
  groupStudent: { findMany: jest.fn() },
  class: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  material: { findUnique: jest.fn() },
};

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(AccessControlService);
    jest.clearAllMocks();
  });

  describe('getAccessibleGroupIds', () => {
    it('zwraca null dla admina — bez ograniczeń', async () => {
      const result = await service.getAccessibleGroupIds({
        id: 'a1',
        role: 'ADMIN',
      });
      // `null` musi być odróżnialne od `[]` — puste znaczy „żadne".
      expect(result).toBeNull();
      expect(prismaMock.group.findMany).not.toHaveBeenCalled();
    });

    it('dla nauczyciela zwraca jego grupy', async () => {
      prismaMock.group.findMany.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);
      const result = await service.getAccessibleGroupIds({
        id: 't1',
        role: 'TEACHER',
      });
      expect(result).toEqual(['g1', 'g2']);
      expect(prismaMock.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teacherId: 't1' } }),
      );
    });

    it('dla ucznia pyta o aktywne członkostwa', async () => {
      prismaMock.groupStudent.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      const result = await service.getAccessibleGroupIds({
        id: 's1',
        role: 'STUDENT',
      });
      expect(result).toEqual(['g1']);
      expect(prismaMock.groupStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: { in: ['s1'] }, isActive: true },
        }),
      );
    });

    it('dla rodzica zbiera grupy wszystkich dzieci bez duplikatów', async () => {
      prismaMock.parentStudent.findMany.mockResolvedValue([
        { studentId: 'c1' },
        { studentId: 'c2' },
      ]);
      // Oboje dzieci chodzą do g1 — grupa nie może pojawić się dwa razy.
      prismaMock.groupStudent.findMany.mockResolvedValue([
        { groupId: 'g1' },
        { groupId: 'g1' },
        { groupId: 'g2' },
      ]);

      const result = await service.getAccessibleGroupIds({
        id: 'p1',
        role: 'PARENT',
      });
      expect(result).toEqual(['g1', 'g2']);
    });

    it('rodzic bez dzieci nie ma dostępu do żadnej grupy', async () => {
      prismaMock.parentStudent.findMany.mockResolvedValue([]);
      const result = await service.getAccessibleGroupIds({
        id: 'p1',
        role: 'PARENT',
      });
      expect(result).toEqual([]);
      expect(prismaMock.groupStudent.findMany).not.toHaveBeenCalled();
    });
  });

  describe('assertCanReadGroup', () => {
    it('przepuszcza admina bez zapytań', async () => {
      await expect(
        service.assertCanReadGroup({ id: 'a1', role: 'ADMIN' }, 'any'),
      ).resolves.toBeUndefined();
    });

    it('przepuszcza ucznia do własnej grupy', async () => {
      prismaMock.groupStudent.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      await expect(
        service.assertCanReadGroup({ id: 's1', role: 'STUDENT' }, 'g1'),
      ).resolves.toBeUndefined();
    });

    // Sedno luki z audytu: uczeń pobierał cudzą grupę razem z e-mailami.
    it('odrzuca ucznia pytającego o cudzą grupę', async () => {
      prismaMock.groupStudent.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      await expect(
        service.assertCanReadGroup({ id: 's1', role: 'STUDENT' }, 'obca'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('odrzuca rodzica pytającego o grupę spoza dzieci', async () => {
      prismaMock.parentStudent.findMany.mockResolvedValue([
        { studentId: 'c1' },
      ]);
      prismaMock.groupStudent.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      await expect(
        service.assertCanReadGroup({ id: 'p1', role: 'PARENT' }, 'obca'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('przepuszcza nauczyciela prowadzącego zajęcia grupy, choć nie jest do niej przypisany', async () => {
      prismaMock.group.findMany.mockResolvedValue([]);
      prismaMock.class.findFirst.mockResolvedValue({ id: 'c1' });

      await expect(
        service.assertCanReadGroup({ id: 't1', role: 'TEACHER' }, 'g9'),
      ).resolves.toBeUndefined();
      expect(prismaMock.class.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: 'g9', teacherId: 't1' } }),
      );
    });

    it('odrzuca nauczyciela bez związku z grupą', async () => {
      prismaMock.group.findMany.mockResolvedValue([]);
      prismaMock.class.findFirst.mockResolvedValue(null);
      await expect(
        service.assertCanReadGroup({ id: 't1', role: 'TEACHER' }, 'g9'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // Używane także przy ZAPISIE (status zajęć, frekwencja), gdzie skutki są
  // trwałe — odwołanie zajęć rozsyła powiadomienia uczniom.
  describe('assertCanAccessClass', () => {
    it('przepuszcza nauczyciela przypisanego wprost', async () => {
      prismaMock.class.findUnique.mockResolvedValue({
        teacherId: 't1',
        groupId: 'g1',
        studentId: null,
        group: { teacherId: 'inny' },
      });
      await expect(
        service.assertCanAccessClass({ id: 't1', role: 'TEACHER' }, 'c1'),
      ).resolves.toBeUndefined();
    });

    it('przepuszcza nauczyciela dziedziczonego z grupy (teacherId = null)', async () => {
      prismaMock.class.findUnique.mockResolvedValue({
        teacherId: null,
        groupId: 'g1',
        studentId: null,
        group: { teacherId: 't1' },
      });
      await expect(
        service.assertCanAccessClass({ id: 't1', role: 'TEACHER' }, 'c1'),
      ).resolves.toBeUndefined();
    });

    it('odrzuca nauczyciela cudzych zajęć', async () => {
      prismaMock.class.findUnique.mockResolvedValue({
        teacherId: 'ktos-inny',
        groupId: 'g1',
        studentId: null,
        group: { teacherId: 'ktos-inny' },
      });
      await expect(
        service.assertCanAccessClass({ id: 't1', role: 'TEACHER' }, 'c1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('przepuszcza ucznia do jego lekcji 1:1', async () => {
      prismaMock.class.findUnique.mockResolvedValue({
        teacherId: 't1',
        groupId: null,
        studentId: 's1',
        group: null,
      });
      await expect(
        service.assertCanAccessClass({ id: 's1', role: 'STUDENT' }, 'c1'),
      ).resolves.toBeUndefined();
    });

    it('odrzuca ucznia wobec cudzej lekcji 1:1', async () => {
      prismaMock.class.findUnique.mockResolvedValue({
        teacherId: 't1',
        groupId: null,
        studentId: 'ktos-inny',
        group: null,
      });
      prismaMock.groupStudent.findMany.mockResolvedValue([]);
      await expect(
        service.assertCanAccessClass({ id: 's1', role: 'STUDENT' }, 'c1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('zwraca 404 dla nieistniejących zajęć', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(
        service.assertCanAccessClass({ id: 't1', role: 'TEACHER' }, 'brak'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertCanReadMaterial', () => {
    it('przepuszcza materiał publiczny', async () => {
      prismaMock.material.findUnique.mockResolvedValue({
        isPublic: true,
        uploadedBy: 'ktos',
        groups: [],
        classes: [],
      });
      await expect(
        service.assertCanReadMaterial({ id: 's1', role: 'STUDENT' }, 'm1'),
      ).resolves.toBeUndefined();
    });

    it('przepuszcza nauczyciela do materiału, który sam wgrał', async () => {
      prismaMock.material.findUnique.mockResolvedValue({
        isPublic: false,
        uploadedBy: 't1',
        groups: [],
        classes: [],
      });
      await expect(
        service.assertCanReadMaterial({ id: 't1', role: 'TEACHER' }, 'm1'),
      ).resolves.toBeUndefined();
    });

    it('przepuszcza ucznia do materiału jego grupy', async () => {
      prismaMock.material.findUnique.mockResolvedValue({
        isPublic: false,
        uploadedBy: 'admin',
        groups: [{ groupId: 'g1' }],
        classes: [],
      });
      prismaMock.groupStudent.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      await expect(
        service.assertCanReadMaterial({ id: 's1', role: 'STUDENT' }, 'm1'),
      ).resolves.toBeUndefined();
    });

    it('odrzuca ucznia wobec materiału obcej grupy', async () => {
      prismaMock.material.findUnique.mockResolvedValue({
        isPublic: false,
        uploadedBy: 'admin',
        groups: [{ groupId: 'obca' }],
        classes: [],
      });
      prismaMock.groupStudent.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      await expect(
        service.assertCanReadMaterial({ id: 's1', role: 'STUDENT' }, 'm1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('przepuszcza admina bez zapytań o powiązania', async () => {
      await expect(
        service.assertCanReadMaterial({ id: 'a1', role: 'ADMIN' }, 'm1'),
      ).resolves.toBeUndefined();
      expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getVisibleStudentIds', () => {
    it('uczeń widzi wyłącznie siebie', async () => {
      await expect(
        service.getVisibleStudentIds({ id: 's1', role: 'STUDENT' }),
      ).resolves.toEqual(['s1']);
    });

    it('rodzic widzi swoje dzieci', async () => {
      prismaMock.parentStudent.findMany.mockResolvedValue([
        { studentId: 'c1' },
        { studentId: 'c2' },
      ]);
      await expect(
        service.getVisibleStudentIds({ id: 'p1', role: 'PARENT' }),
      ).resolves.toEqual(['c1', 'c2']);
    });
  });
});
