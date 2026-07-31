import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Minimum, jakiego potrzebujemy z `req.user` — kontrolery przekazują je wprost. */
export interface RequestUser {
  id: string;
  role: string;
}

/**
 * Jedno miejsce odpowiadające na pytanie „do czyich danych ten użytkownik ma
 * prawo zajrzeć".
 *
 * Powstało po audycie 2026-07-31, który wykazał, że `@Roles()` przepuszczał
 * rolę, ale nikt nie sprawdzał *czyj* jest zasób — uczeń mógł pobrać dowolną
 * grupę po `id` razem z nazwiskami i e-mailami jej uczniów. Logika siedzi tu,
 * a nie w trzech kontrolerach, żeby kolejny endpoint nie musiał odkrywać jej
 * od nowa (i o niej zapomnieć).
 */
@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  /** Uczniowie, których dane wolno oglądać: uczeń → on sam, rodzic → jego dzieci. */
  async getVisibleStudentIds(user: RequestUser): Promise<string[]> {
    if (user.role === Role.STUDENT) return [user.id];
    if (user.role === Role.PARENT) return this.getChildIds(user.id);
    return [];
  }

  async getChildIds(parentId: string): Promise<string[]> {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });
    return links.map((l) => l.studentId);
  }

  /**
   * Grupy widoczne dla użytkownika. `null` oznacza „bez ograniczeń" (ADMIN) —
   * celowo różne od `[]`, które znaczy „żadne" i musi odciąć dostęp.
   */
  async getAccessibleGroupIds(user: RequestUser): Promise<string[] | null> {
    if (user.role === Role.ADMIN) return null;

    if (user.role === Role.TEACHER) {
      const groups = await this.prisma.group.findMany({
        where: { teacherId: user.id },
        select: { id: true },
      });
      return groups.map((g) => g.id);
    }

    const studentIds = await this.getVisibleStudentIds(user);
    if (studentIds.length === 0) return [];

    const memberships = await this.prisma.groupStudent.findMany({
      where: { studentId: { in: studentIds }, isActive: true },
      select: { groupId: true },
    });
    return [...new Set(memberships.map((m) => m.groupId))];
  }

  /** Rzuca 403, jeśli użytkownik nie ma prawa czytać tej grupy. */
  async assertCanReadGroup(user: RequestUser, groupId: string): Promise<void> {
    const allowed = await this.getAccessibleGroupIds(user);
    if (allowed === null) return;

    if (!allowed.includes(groupId)) {
      // Nauczyciel bywa prowadzącym pojedynczych zajęć grupy, nie będąc
      // przypisanym do samej grupy — wtedy też ma prawo ją zobaczyć.
      if (user.role === Role.TEACHER) {
        const cls = await this.prisma.class.findFirst({
          where: { groupId, teacherId: user.id },
          select: { id: true },
        });
        if (cls) return;
      }
      throw new ForbiddenException();
    }
  }

  /**
   * Rzuca 403, jeśli użytkownik nie ma prawa dotknąć tych zajęć — używane
   * także dla ZAPISU (zmiana statusu, frekwencja), gdzie skutki są trwałe:
   * odwołanie zajęć rozsyła powiadomienia uczniom.
   */
  async assertCanAccessClass(
    user: RequestUser,
    classId: string,
  ): Promise<void> {
    if (user.role === Role.ADMIN) return;

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        teacherId: true,
        groupId: true,
        studentId: true,
        group: { select: { teacherId: true } },
      },
    });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);

    if (user.role === Role.TEACHER) {
      // `Class.teacherId` bywa null — prowadzącym jest wtedy nauczyciel grupy.
      const leads =
        cls.teacherId === user.id ||
        (cls.teacherId === null && cls.group?.teacherId === user.id);
      if (!leads) throw new ForbiddenException();
      return;
    }

    const studentIds = await this.getVisibleStudentIds(user);
    if (cls.studentId && studentIds.includes(cls.studentId)) return;

    if (cls.groupId) {
      const groupIds = await this.getAccessibleGroupIds(user);
      if (groupIds?.includes(cls.groupId)) return;
    }
    throw new ForbiddenException();
  }

  /**
   * Materiał jest dostępny, gdy jest publiczny albo powiązany z grupą lub
   * zajęciami, do których użytkownik ma dostęp. Nauczyciel widzi dodatkowo to,
   * co sam wgrał — także zanim przypisze materiał gdziekolwiek.
   */
  async assertCanReadMaterial(
    user: RequestUser,
    materialId: string,
  ): Promise<void> {
    if (user.role === Role.ADMIN) return;

    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      select: {
        isPublic: true,
        uploadedBy: true,
        groups: { select: { groupId: true } },
        classes: { select: { classId: true } },
      },
    });
    if (!material)
      throw new NotFoundException(`Material ${materialId} not found`);

    if (material.isPublic) return;
    if (user.role === Role.TEACHER && material.uploadedBy === user.id) return;

    const groupIds = (await this.getAccessibleGroupIds(user)) ?? [];
    if (material.groups.some((g) => groupIds.includes(g.groupId))) return;

    if (material.classes.length > 0) {
      const classIds = await this.getAccessibleClassIds(user);
      if (material.classes.some((c) => classIds.includes(c.classId))) return;
    }

    throw new ForbiddenException();
  }

  /** Zajęcia, które użytkownik ma prawo oglądać (dla filtrowania list). */
  async getAccessibleClassIds(user: RequestUser): Promise<string[]> {
    const where =
      user.role === Role.TEACHER
        ? {
            OR: [
              { teacherId: user.id },
              { teacherId: null, group: { teacherId: user.id } },
            ],
          }
        : {
            OR: [
              {
                groupId: { in: (await this.getAccessibleGroupIds(user)) ?? [] },
              },
              { studentId: { in: await this.getVisibleStudentIds(user) } },
            ],
          };

    const classes = await this.prisma.class.findMany({
      where,
      select: { id: true },
    });
    return classes.map((c) => c.id);
  }
}
