import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));
import * as argon2 from 'argon2';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => ({ toString: () => 'test-token-hex' })),
}));

import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { Role } from '@prisma/client';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockVerifiedStudent = {
  id: 'user-1',
  email: 'jan@example.com',
  passwordHash: 'hashed',
  role: Role.STUDENT,
  firstName: 'Jan',
  lastName: 'Kowalski',
  isActive: true,
  isMinor: false,
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpiry: null,
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUnverifiedStudent = {
  ...mockVerifiedStudent,
  id: 'user-2',
  email: 'unverified@example.com',
  emailVerified: false,
  emailVerificationToken: 'valid-token',
  emailVerificationExpiry: new Date(Date.now() + 3_600_000),
};

const mockMinorStudent = {
  ...mockVerifiedStudent,
  id: 'user-minor',
  email: 'jan.kowalski@academy.pl',
  isMinor: true,
  emailVerified: true,
};

const mockParent = {
  ...mockVerifiedStudent,
  id: 'parent-1',
  email: 'parent@example.com',
  role: Role.PARENT,
  asParent: [],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  parentStudent: {
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn().mockResolvedValue([]),
};

const mockJwt = { sign: jest.fn().mockReturnValue('access-token') };

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
  get: jest.fn((key: string, fallback?: string) => {
    const map: Record<string, string> = {
      JWT_ACCESS_EXPIRES: '15m',
      FRONTEND_URL: 'http://localhost:5173',
      ADMIN_EMAIL: 'admin@test.com',
      CHILD_EMAIL_DOMAIN: 'academy.pl',
    };
    return map[key] ?? fallback ?? '15m';
  }),
};

const mockMail = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminNewRegistration: jest.fn().mockResolvedValue(undefined),
  sendChildCredentials: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockPrisma.parentStudent.count.mockResolvedValue(0);
    mockPrisma.refreshToken.create.mockResolvedValue({});
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens and user for verified student', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVerifiedStudent);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'jan@example.com',
        password: 'pass',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('jan@example.com');
      expect(result.user.needsChildSetup).toBe(false);
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVerifiedStudent);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'jan@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws EMAIL_NOT_VERIFIED for unverified non-minor', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUnverifiedStudent);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'unverified@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({ email: 'unverified@example.com', password: 'pass' }),
      ).rejects.toMatchObject({ message: 'EMAIL_NOT_VERIFIED' });
    });

    it('allows minor to log in without email verification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockMinorStudent,
        emailVerified: false,
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'jan.kowalski@academy.pl',
        password: 'pass',
      });

      expect(result.user.isMinor).toBe(true);
    });

    it('returns needsChildSetup=true when parent has no children', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockParent);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrisma.parentStudent.count.mockResolvedValue(0);

      const result = await service.login({
        email: 'parent@example.com',
        password: 'pass',
      });

      expect(result.user.needsChildSetup).toBe(true);
    });

    it('returns needsChildSetup=false when parent already has children', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockParent);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrisma.parentStudent.count.mockResolvedValue(1);

      const result = await service.login({
        email: 'parent@example.com',
        password: 'pass',
      });

      expect(result.user.needsChildSetup).toBe(false);
    });
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      email: 'new@example.com',
      password: 'Password1!',
      firstName: 'Anna',
      lastName: 'Nowa',
      phone: '+48 500 000 000',
      accountType: 'student' as const,
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...mockVerifiedStudent,
        ...dto,
        id: 'new-1',
      });
    });

    it('creates user and sends verification email', async () => {
      const result = await service.register(dto);

      expect(result.message).toContain('Check your email');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            emailVerified: false,
            role: Role.STUDENT,
          }),
        }),
      );
      expect(mockMail.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: dto.email }),
      );
    });

    it('creates PARENT role when accountType=parent', async () => {
      await service.register({
        ...dto,
        email: 'parent2@test.com',
        accountType: 'parent',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.PARENT }),
        }),
      );
    });

    it('sends admin notification email', async () => {
      await service.register(dto);

      expect(mockMail.sendAdminNewRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@test.com',
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          accountType: 'student',
        }),
      );
    });

    it('throws ConflictException when email already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVerifiedStudent);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('includes phone in created user when provided', async () => {
      await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: dto.phone }),
        }),
      );
    });
  });

  // ── verifyEmail ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('marks user as verified and clears token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUnverifiedStudent);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUnverifiedStudent,
        emailVerified: true,
      });

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toContain('verified');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUnverifiedStudent.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });
    });

    it('throws BadRequestException for unknown token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail('bad-token')).rejects.toMatchObject({
        message: 'INVALID_TOKEN',
      });
    });

    it('throws BadRequestException for expired token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUnverifiedStudent,
        emailVerificationExpiry: new Date(Date.now() - 1000),
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail('expired-token')).rejects.toMatchObject({
        message: 'TOKEN_EXPIRED',
      });
    });
  });

  // ── resendVerification ─────────────────────────────────────────────────────

  describe('resendVerification', () => {
    it('issues new token and sends email for unverified user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUnverifiedStudent);
      mockPrisma.user.update.mockResolvedValue({});

      await service.resendVerification('unverified@example.com');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUnverifiedStudent.id },
          data: expect.objectContaining({
            emailVerificationToken: expect.any(String),
            emailVerificationExpiry: expect.any(Date),
          }),
        }),
      );
      expect(mockMail.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'unverified@example.com' }),
      );
    });

    it('silently does nothing for already verified user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVerifiedStudent);

      await service.resendVerification('jan@example.com');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockMail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('silently does nothing for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.resendVerification('ghost@example.com');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ── setupChild ─────────────────────────────────────────────────────────────

  describe('setupChild', () => {
    const childDto = {
      firstName: 'Maks',
      lastName: 'Kowalski',
      password: 'Child1234!',
    };

    const setupParentMocks = (asParent: unknown[] = []) => {
      mockPrisma.user.findUnique
        .mockReset()
        .mockResolvedValueOnce({ ...mockParent, asParent })
        .mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'child-1',
        email: 'maks.kowalski@academy.pl',
        firstName: 'Maks',
        lastName: 'Kowalski',
      });
    };

    it('creates child account with slugified email', async () => {
      setupParentMocks();

      const result = await service.setupChild('parent-1', childDto);

      expect(result.email).toBe('maks.kowalski@academy.pl');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isMinor: true,
            emailVerified: true,
            role: Role.STUDENT,
            asStudent: { create: { parentId: 'parent-1' } },
          }),
        }),
      );
    });

    it('handles Polish diacritics in child name', async () => {
      mockPrisma.user.findUnique
        .mockReset()
        .mockResolvedValueOnce({ ...mockParent, asParent: [] })
        .mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'child-2',
        email: 'zofia.wroblewska@academy.pl',
        firstName: 'Zofia',
        lastName: 'Wróblewska',
      });

      await service.setupChild('parent-1', {
        ...childDto,
        firstName: 'Zofia',
        lastName: 'Wróblewska',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: expect.stringMatching(/^zofia\./),
          }),
        }),
      );
    });

    it('appends number suffix on email collision', async () => {
      mockPrisma.user.findUnique
        .mockReset()
        .mockResolvedValueOnce({ ...mockParent, asParent: [] })
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'child-3',
        email: 'maks.kowalski2@academy.pl',
        firstName: 'Maks',
        lastName: 'Kowalski',
      });

      const result = await service.setupChild('parent-1', childDto);

      expect(result.email).toBe('maks.kowalski2@academy.pl');
    });

    it('throws BadRequestException when parent already has a child', async () => {
      mockPrisma.user.findUnique.mockReset().mockResolvedValue({
        ...mockParent,
        asParent: [{ id: 'existing-relation' }],
      });

      await expect(service.setupChild('parent-1', childDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.setupChild('parent-1', childDto),
      ).rejects.toMatchObject({
        message: 'CHILD_ALREADY_SET',
      });
    });

    it('throws ForbiddenException when called by non-parent', async () => {
      mockPrisma.user.findUnique.mockReset().mockResolvedValue({
        ...mockVerifiedStudent,
        role: Role.STUDENT,
        asParent: [],
      });

      await expect(service.setupChild('user-1', childDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('sends child login credentials to the parent', async () => {
      setupParentMocks();

      await service.setupChild('parent-1', childDto);

      expect(mockMail.sendChildCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          childEmail: 'maks.kowalski@academy.pl',
          childName: 'Maks Kowalski',
        }),
      );
    });
  });

  // ── password reset ───────────────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('generates token and sends reset email for active user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'jan@example.com',
        firstName: 'Jan',
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.requestPasswordReset('jan@example.com');

      expect(result).toEqual({ message: 'ok' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: expect.any(String),
            passwordResetExpiry: expect.any(Date),
          }),
        }),
      );
      expect(mockMail.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'jan@example.com', firstName: 'Jan' }),
      );
    });

    it('returns generic ok and sends nothing for unknown email (no enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset('ghost@example.com');

      expect(result).toEqual({ message: 'ok' });
      expect(mockMail.sendPasswordReset).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('does not send for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'jan@example.com',
        firstName: 'Jan',
        isActive: false,
      });

      const result = await service.requestPasswordReset('jan@example.com');

      expect(result).toEqual({ message: 'ok' });
      expect(mockMail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('routes minor reset link to the parent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        email: 'maks.kowalski@academy.pl',
        firstName: 'Maks',
        lastName: 'Kowalski',
        isActive: true,
        isMinor: true,
      });
      mockPrisma.parentStudent.findFirst.mockResolvedValue({
        parent: { email: 'rodzic@example.com', firstName: 'Anna' },
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.requestPasswordReset(
        'maks.kowalski@academy.pl',
      );

      expect(result).toEqual({ message: 'ok' });
      expect(mockMail.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'rodzic@example.com',
          firstName: 'Anna',
          forChildName: 'Maks Kowalski',
        }),
      );
    });

    it('does not send for a minor without a linked parent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'child-2',
        email: 'sierota@academy.pl',
        firstName: 'Sierota',
        lastName: 'Bezrodzic',
        isActive: true,
        isMinor: true,
      });
      mockPrisma.parentStudent.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset('sierota@academy.pl');

      expect(result).toEqual({ message: 'ok' });
      expect(mockMail.sendPasswordReset).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('hashes new password and clears token within a transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordResetToken: 'valid',
        passwordResetExpiry: new Date(Date.now() + 60_000),
      });

      const result = await service.resetPassword('valid', 'NewPass1234!');

      expect(result).toEqual({ message: 'Password reset successful.' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('throws INVALID_TOKEN for unknown token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad', 'NewPass1234!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws TOKEN_EXPIRED for expired token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordResetToken: 'expired',
        passwordResetExpiry: new Date(Date.now() - 60_000),
      });

      await expect(
        service.resetPassword('expired', 'NewPass1234!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── refresh / logout ───────────────────────────────────────────────────────

  describe('refresh', () => {
    it('rotates tokens on valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 'user-1',
          email: 'jan@example.com',
          role: Role.STUDENT,
          isActive: true,
        },
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});

      const result = await service.refresh('valid-token');

      expect(result.accessToken).toBe('access-token');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
    });

    it('throws ForbiddenException on expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'old-token',
        expiresAt: new Date(Date.now() - 1000),
        user: {
          id: 'user-1',
          email: 'jan@example.com',
          role: Role.STUDENT,
          isActive: true,
        },
      });

      await expect(service.refresh('old-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('ghost-token')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('logout', () => {
    it('deletes refresh token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-token');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });
});
