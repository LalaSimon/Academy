import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { SetupChildDto } from './dto/setup-child.dto';
import type { JwtPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, isActive: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified && !user.isMinor) {
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    }

    const accessToken = this.signAccessToken(user.id, user.email, user.role);
    const refreshToken = await this.createRefreshToken(user.id);

    const needsChildSetup =
      user.role === 'PARENT'
        ? (await this.prisma.parentStudent.count({
            where: { parentId: user.id },
          })) === 0
        : false;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isMinor: user.isMinor,
        firstName: user.firstName,
        lastName: user.lastName,
        needsChildSetup,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('EMAIL_TAKEN');

    const passwordHash = await argon2.hash(dto.password);
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const role = dto.accountType === 'parent' ? 'PARENT' : 'STUDENT';

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await this.mail.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verifyUrl,
    });

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      await this.mail.sendAdminNewRegistration({
        to: adminEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? undefined,
        accountType: dto.accountType,
      });
    }

    return { message: 'Registration successful. Check your email.' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) throw new BadRequestException('INVALID_TOKEN');
    if (
      user.emailVerificationExpiry &&
      user.emailVerificationExpiry < new Date()
    ) {
      throw new BadRequestException('TOKEN_EXPIRED');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return { message: 'Email verified successfully.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return { message: 'ok' };

    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await this.mail.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verifyUrl,
    });

    return { message: 'ok' };
  }

  async setupChild(parentId: string, dto: SetupChildDto) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      include: { asParent: true },
    });
    if (!parent || parent.role !== 'PARENT') throw new ForbiddenException();
    if (parent.asParent.length > 0)
      throw new BadRequestException('CHILD_ALREADY_SET');

    const childEmail = await this.generateChildEmail(
      dto.firstName,
      dto.lastName,
    );
    const passwordHash = await argon2.hash(dto.password);

    const child = await this.prisma.user.create({
      data: {
        email: childEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'STUDENT',
        isMinor: true,
        emailVerified: true,
        asStudent: { create: { parentId } },
      },
    });

    return {
      id: child.id,
      email: child.email,
      firstName: child.firstName,
      lastName: child.lastName,
    };
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true } },
      },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const { user } = stored;
    const accessToken = this.signAccessToken(user.id, user.email, user.role);
    const newRefreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isMinor: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  private async generateChildEmail(
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const domain = this.config.get<string>('CHILD_EMAIL_DOMAIN', 'academy.pl');
    const slug = `${firstName}.${lastName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9.]/g, '');

    const base = `${slug}@${domain}`;
    const existing = await this.prisma.user.findUnique({
      where: { email: base },
    });
    if (!existing) return base;

    for (let i = 2; i <= 99; i++) {
      const candidate = `${slug}${i}@${domain}`;
      const taken = await this.prisma.user.findUnique({
        where: { email: candidate },
      });
      if (!taken) return candidate;
    }
    return `${slug}.${randomBytes(3).toString('hex')}@${domain}`;
  }

  private signAccessToken(sub: string, email: string, role: string) {
    const payload: JwtPayload = {
      sub,
      email,
      role: role as JwtPayload['role'],
    };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });
  }

  private async createRefreshToken(userId: string) {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
    return token;
  }
}
