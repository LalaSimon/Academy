import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@prisma/client';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  role: Role.STUDENT,
  firstName: 'Jan',
  lastName: 'Kowalski',
  isActive: true,
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('access-token'),
};

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
  get: jest.fn().mockReturnValue('15m'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should rotate tokens on valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: 'user-1', email: 'test@example.com', role: Role.STUDENT, isActive: true },
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-token');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    });

    it('should throw ForbiddenException on expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', email: 'test@example.com', role: Role.STUDENT, isActive: true },
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-token');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });
});
