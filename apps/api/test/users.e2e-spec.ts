import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

  const admin = { email: 'admin.users@test.com', password: 'Admin1234!', firstName: 'Admin', lastName: 'Test', role: Role.ADMIN };
  const student = { email: 'student.users@test.com', password: 'Student1234!', firstName: 'Anna', lastName: 'Nowak', role: Role.STUDENT };

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

    await prisma.user.deleteMany({ where: { email: { in: [admin.email, student.email] } } });
    await prisma.user.create({ data: { ...admin, passwordHash: await argon2.hash(admin.password), password: undefined } as never });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password });
    adminToken = res.body.accessToken as string;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [admin.email, student.email] } } });
    await app.close();
  });

  // ─── GET /users ───────────────────────────────────────────────────────────
  describe('GET /api/v1/users', () => {
    it('should return paginated user list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.total).toBeDefined();
      expect(res.body.totalPages).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('should filter by role', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.forEach((u: { role: string }) => expect(u.role).toBe('ADMIN'));
    });
  });

  // ─── POST /users ──────────────────────────────────────────────────────────
  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(student)
        .expect(201);

      expect(res.body.email).toBe(student.email);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(student)
        .expect(409);
    });

    it('should return 400 for invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bad', password: '123' })
        .expect(400);
    });
  });

  // ─── GET /users/:id ───────────────────────────────────────────────────────
  describe('GET /api/v1/users/:id', () => {
    let studentId: string;

    beforeAll(async () => {
      const u = await prisma.user.findUnique({ where: { email: student.email } });
      studentId = u!.id;
    });

    it('should return user with relations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(studentId);
      expect(res.body.studentGroups).toBeInstanceOf(Array);
    });

    it('should return 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /users/:id ─────────────────────────────────────────────────────
  describe('PATCH /api/v1/users/:id', () => {
    let studentId: string;

    beforeAll(async () => {
      const u = await prisma.user.findUnique({ where: { email: student.email } });
      studentId = u!.id;
    });

    it('should update user fields', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Zofia' })
        .expect(200);

      expect(res.body.firstName).toBe('Zofia');
    });
  });

  // ─── DELETE /users/:id ────────────────────────────────────────────────────
  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user and return 204', async () => {
      const tmp = await prisma.user.create({
        data: { email: 'delete.me@test.com', passwordHash: 'x', firstName: 'Del', lastName: 'Me', role: Role.STUDENT },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${tmp.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  // ─── Parent ↔ Student link ─────────────────────────────────────────────────
  describe('Parent ↔ Student link', () => {
    let parentId: string;
    let studentId: string;

    beforeAll(async () => {
      const [parent, s] = await Promise.all([
        prisma.user.create({ data: { email: 'parent.link@test.com', passwordHash: 'x', firstName: 'Rodzic', lastName: 'Link', role: Role.PARENT } }),
        prisma.user.findUnique({ where: { email: student.email } }),
      ]);
      parentId = parent.id;
      studentId = s!.id;
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: 'parent.link@test.com' } });
    });

    it('should link parent to student', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${parentId}/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    });

    it('should unlink parent from student', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${parentId}/students/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
