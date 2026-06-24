import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { Role, ClassStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Classes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let teacherToken: string;
  let groupId: string;

  const cleanup = async (p: PrismaService) => {
    const groups = await p.group.findMany({ where: { name: { startsWith: 'TestClass Group' } } });
    for (const g of groups) {
      await p.attendance.deleteMany({ where: { class: { groupId: g.id } } });
      await p.class.deleteMany({ where: { groupId: g.id } });
      await p.groupStudent.deleteMany({ where: { groupId: g.id } });
    }
    await p.group.deleteMany({ where: { name: { startsWith: 'TestClass Group' } } });
    await p.user.deleteMany({
      where: { email: { in: ['admin.cls@test.com', 'teacher.cls@test.com'] } },
    });
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

    const [admin, teacher] = await Promise.all([
      prisma.user.create({
        data: { email: 'admin.cls@test.com', passwordHash: await argon2.hash('Admin1234!'), firstName: 'Admin', lastName: 'C', role: Role.ADMIN },
      }),
      prisma.user.create({
        data: { email: 'teacher.cls@test.com', passwordHash: await argon2.hash('Admin1234!'), firstName: 'Teacher', lastName: 'C', role: Role.TEACHER },
      }),
    ]);

    const group = await prisma.group.create({
      data: { name: 'TestClass Group A', teacherId: teacher.id },
    });
    groupId = group.id;

    const [adminRes, teacherRes] = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin.cls@test.com', password: 'Admin1234!' }),
      request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'teacher.cls@test.com', password: 'Admin1234!' }),
    ]);
    adminToken = adminRes.body.accessToken;
    teacherToken = teacherRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  let classId: string;

  it('POST /classes — admin creates a class', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Angielski lekcja 1', scheduledAt: '2025-06-01T10:00:00Z', durationMin: 60, groupId });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Angielski lekcja 1');
    expect(res.body.status).toBe(ClassStatus.SCHEDULED);
    classId = res.body.id;
  });

  it('POST /classes — teacher cannot create', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Test', scheduledAt: '2025-06-01T10:00:00Z', groupId });
    expect(res.status).toBe(403);
  });

  it('GET /classes — returns list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/classes')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /classes?groupId= — filters by group', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/classes?groupId=${groupId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].group.id).toBe(groupId);
  });

  it('GET /classes/:id — returns class details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(classId);
    expect(res.body.attendances).toBeInstanceOf(Array);
  });

  it('PATCH /classes/:id — updates title and meetLink', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated title', meetLink: 'https://meet.google.com/abc-def-ghi' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(res.body.meetLink).toBe('https://meet.google.com/abc-def-ghi');
  });

  it('PATCH /classes/:id/status — teacher can update status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/classes/${classId}/status`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: ClassStatus.COMPLETED });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(ClassStatus.COMPLETED);
  });

  it('PATCH /classes/:id/status — cancel with reason', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/classes/${classId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ClassStatus.CANCELLED, cancelReason: 'Choroba nauczyciela' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(ClassStatus.CANCELLED);
    expect(res.body.cancelReason).toBe('Choroba nauczyciela');
  });

  it('GET /classes/:id — 404 for unknown id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/classes/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('DELETE /classes/:id — admin deletes class', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /classes/:id — 404 after delete', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('POST /classes — validation fails without required fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No date' });
    expect(res.status).toBe(400);
  });
});
