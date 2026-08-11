import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EmailRateLimitService } from '../../common/throttling/email-rate-limit.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { SetupChildDto } from './dto/setup-child.dto';
import type { JwtPayload } from './types/jwt-payload';

/**
 * Po tylu nieudanych próbach konto zostaje zablokowane czasowo. Próg jest
 * wyraźnie wyższy niż liczba pomyłek realnego użytkownika, żeby blokada nie
 * stała się sposobem na odcięcie komuś dostępu (DoS na konkretne konto).
 */
const MAX_FAILED_LOGINS = 10;

/** Długość blokady rośnie z liczbą prób: 1 min, 5 min, 15 min, dalej 60 min. */
const LOCKOUT_STEPS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private emailLimit: EmailRateLimitService,
  ) {}

  /**
   * Limit dotyczy WYŁĄCZNIE maili, których odbiorcę podaje niezalogowany klient
   * (rejestracja, ponowna weryfikacja, reset hasła) — tylko te da się skierować
   * na cudzą skrzynkę. Poczta systemowa (przypomnienia o zajęciach, potwierdzenia
   * płatności, powiadomienia admina) idzie z pominięciem limitu, bo jej odbiorcę
   * wyznacza baza, a nie żądanie.
   */
  private async sendIfUnderLimit(
    recipient: string,
    send: () => Promise<void>,
  ): Promise<void> {
    if (!this.emailLimit.consume(recipient)) return;
    await send();
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, isActive: true },
    });

    // Nieistniejące konto też „weryfikuje hasło" — na haszu-atrapie.
    // Bez tego brak konta odpowiadał natychmiast, a istniejące dopiero po
    // ~50–100 ms argon2. Różnica jest mierzalna zdalnie i pozwalała odsiać
    // prawdziwe adresy przed atakiem słownikowym, mimo identycznego komunikatu.
    if (!user) {
      await argon2
        .verify(await this.dummyHash(), dto.password)
        .catch(() => false);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      // Ten sam komunikat co przy złym haśle — inaczej odpowiedź zdradzałaby,
      // że konto istnieje i że trafiono w nie serią prób.
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.registerFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Udane logowanie zeruje licznik — inaczej pomyłki z różnych dni sumowałyby
    // się w blokadę dla użytkownika, który zna hasło.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

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

    await this.sendIfUnderLimit(user.email, () =>
      this.mail.sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        verifyUrl,
      }),
    );

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

    await this.sendIfUnderLimit(user.email, () =>
      this.mail.sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        verifyUrl,
      }),
    );

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

    await this.mail.sendChildCredentials({
      to: parent.email,
      parentName: `${parent.firstName} ${parent.lastName}`,
      childName: `${child.firstName} ${child.lastName}`,
      childEmail: child.email,
    });

    return {
      id: child.id,
      email: child.email,
      firstName: child.firstName,
      lastName: child.lastName,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Zawsze zwracamy ten sam komunikat — nie zdradzamy czy email istnieje
    if (!user || !user.isActive) return { message: 'ok' };

    // Niepełnoletni ma generowany login @academy.pl (nie skrzynkę) — link
    // resetu musi trafić na email RODZICA. Bez rodzica nie ma gdzie wysłać.
    let recipientEmail = user.email;
    let recipientName = user.firstName;
    let forChildName: string | undefined;
    if (user.isMinor) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { studentId: user.id },
        select: { parent: { select: { email: true, firstName: true } } },
      });
      if (!link) return { message: 'ok' };
      recipientEmail = link.parent.email;
      recipientName = link.parent.firstName;
      forChildName = `${user.firstName} ${user.lastName}`;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // Skrót do bazy, surowy token tylko w linku wysłanym mailem — wyciek bazy
    // nie może oddawać możliwości zmiany cudzego hasła.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: this.hashToken(resetToken),
        passwordResetExpiry: resetExpiry,
      },
    });

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.sendIfUnderLimit(recipientEmail, () =>
      this.mail.sendPasswordReset({
        to: recipientEmail,
        firstName: recipientName,
        resetUrl,
        forChildName,
      }),
    );

    return { message: 'ok' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: this.hashToken(token) },
    });
    if (!user) throw new BadRequestException('INVALID_TOKEN');
    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('TOKEN_EXPIRED');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      }),
      // Unieważnij wszystkie sesje po zmianie hasła
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return { message: 'Password reset successful.' };
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashToken(token) },
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
    await this.prisma.refreshToken.deleteMany({
      where: { token: this.hashToken(token) },
    });
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

  /**
   * Hasz-atrapa do wyrównywania czasu logowania. Liczony raz, przy pierwszym
   * użyciu, prawdziwym argon2 z tymi samymi parametrami co hasła — atrapa musi
   * kosztować dokładnie tyle, co weryfikacja prawdziwego hasła, inaczej nie
   * wyrównuje niczego. Hasło źródłowe jest losowe i nigdzie nie zapisane.
   */
  private dummyHashPromise: Promise<string> | null = null;
  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= argon2.hash(randomBytes(32).toString('hex'));
    return this.dummyHashPromise;
  }

  /**
   * Zapisuje nieudaną próbę i — po przekroczeniu progu — blokuje konto na czas
   * rosnący z liczbą prób. Blokada jest jedyną obroną przed zgadywaniem hasła
   * rozłożonym po wielu adresach IP, którego limit żądań nie zauważa.
   */
  private async registerFailedLogin(
    userId: string,
    currentAttempts: number,
  ): Promise<void> {
    const attempts = currentAttempts + 1;

    if (attempts < MAX_FAILED_LOGINS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: attempts },
      });
      return;
    }

    const step = Math.min(
      Math.floor(attempts / MAX_FAILED_LOGINS) - 1,
      LOCKOUT_STEPS_MS.length - 1,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: new Date(Date.now() + LOCKOUT_STEPS_MS[step]),
      },
    });
  }

  /**
   * Skrót tokenu do zapisu w bazie.
   *
   * SHA-256 bez KDF jest tu właściwy: token to 32–64 losowe bajty z `randomBytes`,
   * a nie hasło — nie ma czego zgadywać słownikiem, więc spowalnianie funkcji
   * (argon2) kosztowałoby przy każdym żądaniu odświeżenia i nic by nie dało.
   *
   * Sens zmiany: wyciek bazy (kopia zapasowa, dump w logu, SQLi w przyszłym
   * endpoincie) przestaje oddawać atakującemu gotowe sesje na 7 dni i możliwość
   * zmiany cudzego hasła. Klient dostaje surowy token jak dotąd.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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
    // Do bazy trafia skrót; surowy token dostaje wyłącznie klient (cookie).
    await this.prisma.refreshToken.create({
      data: { token: this.hashToken(token), userId, expiresAt },
    });
    return token;
  }

  /**
   * Kasuje wygasłe tokeny odświeżania.
   *
   * `refresh` usuwa stary token przy rotacji, a `logout` swój własny — ale sesja
   * porzucona bez wylogowania (zamknięta karta, wyczyszczone ciasteczka) zostawała
   * w tabeli NA ZAWSZE. Tabela puchła, `findUnique` po tokenie zwalniał, a kopie
   * zapasowe rosły o dane, które do niczego już nie służą.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredRefreshTokens(): Promise<void> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) {
      this.logger.log(`Usunięto ${count} wygasłych tokenów odświeżania`);
    }
  }
}
