import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, isActive: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.signAccessToken(user.id, user.email, user.role);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName } };
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    // Token rotation — unieważnij stary, wyślij nowy
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
      select: { id: true, email: true, role: true, firstName: true, lastName: true, phone: true, createdAt: true },
    });
  }

  private signAccessToken(sub: string, email: string, role: string) {
    const payload: JwtPayload = { sub, email, role: role as JwtPayload['role'] };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });
  }

  private async createRefreshToken(userId: string) {
    const token = randomBytes(64).toString('hex');
    const days = 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({ data: { token, userId, expiresAt } });
    return token;
  }
}
