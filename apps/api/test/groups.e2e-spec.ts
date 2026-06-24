import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Groups (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let teacherId: string;
  let studentId: string;

  const cleanup = async (p: PrismaService) => {
    const groups = await p.group.findMany({ where: { name: { startsWith: 'Test Group' } } });
    for (const g of groups) await p.groupStudent.deleteMany({ where: { groupId: g.id } });
    await p.group.deleteMany({ where: { name: { startsWith: 'Test Group' } } });
    await p.user.deleteMany({ where: { email: { in: ['admin.grp@test.com', 'teacher.grp@test.com', 'student.grp@test.com'] } } });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup(prisma);

    const [admin, teacher, student] = await Promise.all([
      prisma.user.create({ data: { email: 'admin.grp@test.com', passwordHash: await argon2.hash('Admin1234!'), firstName: 'Admin', lastName: 'G', role: Role.ADMIN } }),
      prisma.user.create({ data: { email: 'teacher.grp@test.com', passwordHash: 'x', firstName: 'Teacher', lastName: 'G', role: Role.TEACHER } }),
      prisma.user.create({ data: { email: 'student.grp@test.com', passwordHash: 'x', firstName: 'Student', lastName: 'G', role: Role.STUDENT } }),
    ]);

    teacherId = teacher.id;
    studentId = student.id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.grp@test.com', password: 'Admin1234!' });
    adminToken = res.body.accessToken as string;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  let groupId: string;

  describe('POST /api/v1/groups', () => {
    it('should create a group', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Group A1', language: 'English', level: 'A1', teacherId })
        .expect(201);

      expect(res.body.name).toBe('Test Group A1');
      expect(res.body.teacher.id).toBe(teacherId);
      groupId = res.body.id as string;
    });

    it('should return 400 for missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teacherId })
        .expect(400);
    });
  });

  describe('GET /api/v1/groups', () => {
    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by language', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/groups?language=English')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.forEach((g: { language: string }) => expect(g.language).toBe('English'));
    });
  });

  describe('GET /api/v1/groups/:id', () => {
    it('should return group with students list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(groupId);
      expect(res.body.students).toBeInstanceOf(Array);
    });

    it('should return 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/groups/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/groups/:id/students/:studentId', () => {
    it('should add student to group', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/groups/${groupId}/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { students: { where: { isActive: true } } },
      });
      expect(group?.students).toHaveLength(1);
    });
  });

  describe('DELETE /api/v1/groups/:id/students/:studentId', () => {
    it('should soft-remove student from group', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/groups/${groupId}/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const gs = await prisma.groupStudent.findUnique({
        where: { groupId_studentId: { groupId, studentId } },
      });
      expect(gs?.isActive).toBe(false);
    });
  });

  describe('PATCH /api/v1/groups/:id', () => {
    it('should update group', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ level: 'B1' })
        .expect(200);

      expect(res.body.level).toBe('B1');
    });
  });

  describe('DELETE /api/v1/groups/:id', () => {
    it('should delete group', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
