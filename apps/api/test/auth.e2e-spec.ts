import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testUser = {
    email: 'integration@test.com',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'User',
    role: Role.ADMIN,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    app.use((require('cookie-parser') as typeof cookieParser)());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash: await argon2.hash(testUser.password),
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: testUser.role,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  // ─── POST /auth/login ────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('should return accessToken and set refresh cookie on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe(Role.ADMIN);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(
        (res.headers['set-cookie'] as string[]).some((c) =>
          c.startsWith('refresh_token='),
        ),
      ).toBe(true);
    });

    it('should return 401 on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpass' })
        .expect(401);
    });

    it('should return 401 on unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: testUser.password })
        .expect(401);
    });

    it('should return 400 on invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: testUser.password })
        .expect(400);
    });
  });

  // ─── POST /auth/refresh ──────────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    let refreshCookie: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      refreshCookie = (res.headers['set-cookie'] as string[])[0];
    });

    it('should return new accessToken and rotate refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 when no refresh cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });
  });

  // ─── GET /auth/me ────────────────────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      accessToken = res.body.accessToken as string;
    });

    it('should return current user data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe(Role.ADMIN);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return 401 with malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });

  // ─── POST /auth/logout ───────────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('should clear refresh cookie and invalidate token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const refreshCookie = (loginRes.headers['set-cookie'] as string[])[0];

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshCookie)
        .expect(204);

      // Po wylogowaniu refresh token powinien być unieważniony
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(403);
    });
  });
});
