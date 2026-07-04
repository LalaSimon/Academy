import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface MailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly devRedirectTo: string | undefined;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>(
      'MAIL_FROM',
      'Academy <noreply@academy.pl>',
    );
    this.devRedirectTo = this.config.get<string>('MAIL_DEV_REDIRECT_TO');
  }

  async send(payload: MailPayload): Promise<void> {
    let to = payload.to;
    let subject = payload.subject;

    if (this.devRedirectTo && process.env.NODE_ENV !== 'production') {
      const original = Array.isArray(payload.to)
        ? payload.to.join(', ')
        : payload.to;
      subject = `[DEV → ${original}] ${subject}`;
      to = this.devRedirectTo;
    }

    const { error } = await this.resend.emails.send({
      from: payload.from ?? this.from,
      to,
      subject,
      html: payload.html,
      text: payload.text,
    });

    if (error) {
      this.logger.error(
        `Failed to send email to ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to}: ${error.message}`,
      );
      if (process.env.NODE_ENV === 'production') {
        throw new Error(error.message);
      }
    }
  }

  async sendClassReminder(opts: {
    to: string;
    studentName: string;
    classTitle: string;
    scheduledAt: Date;
    meetLink?: string;
    teacherName: string;
  }): Promise<void> {
    const time = opts.scheduledAt.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const date = opts.scheduledAt.toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    await this.send({
      to: opts.to,
      subject: `Przypomnienie: ${opts.classTitle} o ${time}`,
      html: buildClassReminderHtml({ ...opts, time, date }),
      text: `Cześć ${opts.studentName}! Przypominamy o zajęciach "${opts.classTitle}" w ${date} o ${time} z ${opts.teacherName}.${opts.meetLink ? ` Link: ${opts.meetLink}` : ''}`,
    });
  }

  async sendAbsenceNotification(opts: {
    to: string;
    studentName: string;
    classTitle: string;
    scheduledAt: Date;
  }): Promise<void> {
    const date = opts.scheduledAt.toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    await this.send({
      to: opts.to,
      subject: `Nieobecność: ${opts.classTitle}`,
      html: buildAbsenceHtml({ ...opts, date }),
      text: `Cześć ${opts.studentName}, odnotowano Twoją nieobecność na zajęciach "${opts.classTitle}" w dniu ${date}.`,
    });
  }

  async sendPaymentReminder(opts: {
    to: string;
    studentName: string;
    amount: string;
    currency: string;
    description: string;
    dueDate: Date;
  }): Promise<void> {
    const due = opts.dueDate.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const amountFmt = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: opts.currency,
    }).format(Number(opts.amount));

    await this.send({
      to: opts.to,
      subject: `Przypomnienie o płatności — ${amountFmt}`,
      html: buildPaymentReminderHtml({ ...opts, due, amountFmt }),
      text: `Cześć ${opts.studentName}, przypominamy o płatności ${amountFmt} za "${opts.description}". Termin: ${due}.`,
    });
  }

  async sendVerificationEmail(opts: {
    to: string;
    firstName: string;
    verifyUrl: string;
  }): Promise<void> {
    await this.send({
      to: opts.to,
      subject: 'Potwierdź adres email — Academy',
      html: buildVerificationHtml(opts),
      text: `Cześć ${opts.firstName}! Potwierdź swój email klikając w link: ${opts.verifyUrl}. Link wygasa po 24 godzinach.`,
    });
  }

  async sendAdminNewRegistration(opts: {
    to: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    accountType: 'student' | 'parent';
  }): Promise<void> {
    await this.send({
      to: opts.to,
      subject: `Nowa rejestracja: ${opts.firstName} ${opts.lastName}`,
      html: buildAdminNewRegistrationHtml(opts),
      text: `Nowa rejestracja: ${opts.firstName} ${opts.lastName} (${opts.email}), typ: ${opts.accountType === 'parent' ? 'rodzic' : 'uczeń'}${opts.phone ? `, tel: ${opts.phone}` : ''}.`,
    });
  }

  async sendPaymentConfirmation(opts: {
    to: string;
    studentName: string;
    amount: string;
    currency: string;
    description: string;
  }): Promise<void> {
    const amountFmt = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: opts.currency,
    }).format(Number(opts.amount));

    await this.send({
      to: opts.to,
      subject: `Potwierdzenie płatności — ${amountFmt}`,
      html: buildPaymentConfirmationHtml({ ...opts, amountFmt }),
      text: `Cześć ${opts.studentName}, potwierdzamy otrzymanie płatności ${amountFmt} za "${opts.description}". Dziękujemy!`,
    });
  }

  async sendPaymentOverdue(opts: {
    to: string;
    studentName: string;
    amount: string;
    currency: string;
    description: string;
    dueDate: Date;
  }): Promise<void> {
    const due = opts.dueDate.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const amountFmt = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: opts.currency,
    }).format(Number(opts.amount));

    await this.send({
      to: opts.to,
      subject: `Zaległa płatność — ${amountFmt}`,
      html: buildPaymentOverdueHtml({ ...opts, due, amountFmt }),
      text: `Cześć ${opts.studentName}, płatność ${amountFmt} za "${opts.description}" jest po terminie (${due}). Prosimy o uregulowanie.`,
    });
  }

  async sendChildCredentials(opts: {
    to: string;
    parentName: string;
    childName: string;
    childEmail: string;
  }): Promise<void> {
    await this.send({
      to: opts.to,
      subject: `Konto dziecka utworzone — login ${opts.childName}`,
      html: buildChildCredentialsHtml(opts),
      text: `Cześć ${opts.parentName}! Konto dla ${opts.childName} zostało utworzone. Login dziecka: ${opts.childEmail}. Hasło ustawiłeś podczas konfiguracji.`,
    });
  }

  async sendPasswordReset(opts: {
    to: string;
    firstName: string;
    resetUrl: string;
    // Gdy ustawione, reset dotyczy konta dziecka, a mail idzie do rodzica
    forChildName?: string;
  }): Promise<void> {
    const subject = opts.forChildName
      ? `Reset hasła dziecka (${opts.forChildName}) — Academy`
      : 'Reset hasła — Academy';
    const text = opts.forChildName
      ? `Cześć ${opts.firstName}! Otrzymaliśmy prośbę o reset hasła do konta dziecka (${opts.forChildName}). Kliknij w link, aby ustawić nowe hasło: ${opts.resetUrl}. Link wygasa po 1 godzinie. Jeśli to nie Ty, zignoruj tę wiadomość.`
      : `Cześć ${opts.firstName}! Aby zresetować hasło, kliknij w link: ${opts.resetUrl}. Link wygasa po 1 godzinie. Jeśli to nie Ty, zignoruj tę wiadomość.`;

    await this.send({
      to: opts.to,
      subject,
      html: buildPasswordResetHtml(opts),
      text,
    });
  }
}

// ── HTML templates ─────────────────────────────────────────────────────────────

function baseLayout(title: string, badge: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#7c3aed;padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Academy</span>
                <span style="font-size:13px;color:rgba(255,255,255,0.6);margin-left:8px;">Prywatna szkoła językowa</span>
              </td>
              <td align="right">
                <span style="display:inline-block;padding:3px 10px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:11px;font-weight:600;color:#ffffff;letter-spacing:0.06em;text-transform:uppercase;">${badge}</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.7;">
            To jest automatyczna wiadomość z systemu Academy. Nie odpowiadaj na ten email.<br/>
            W razie pytań: <a href="mailto:kontakt@academy.pl" style="color:#7c3aed;text-decoration:none;">kontakt@academy.pl</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;margin-top:24px;">${label}</a>`;
}

function infoTable(
  rows: { label: string; value: string; highlight?: boolean }[],
): string {
  const cells = rows
    .map(
      (r, i) => `
      <tr><td style="padding:12px 0;${i < rows.length - 1 ? 'border-bottom:1px solid #f4f4f5;' : ''}">
        <span style="display:block;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${r.label}</span>
        <span style="font-size:${r.highlight ? '20px' : '15px'};font-weight:${r.highlight ? '700' : '500'};color:${r.highlight ? '#7c3aed' : '#18181b'};">${r.value}</span>
      </td></tr>`,
    )
    .join('');
  return `<table cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:10px;border:1px solid #e4e4e7;padding:0 16px;width:100%;box-sizing:border-box;">${cells}</table>`;
}

function buildClassReminderHtml(o: {
  studentName: string;
  classTitle: string;
  date: string;
  time: string;
  teacherName: string;
  meetLink?: string;
}): string {
  return baseLayout(
    'Przypomnienie o zajęciach',
    'Przypomnienie',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.studentName}!</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Twoje zajęcia zaczynają się za 30 minut</h2>
    ${infoTable([
      { label: 'Zajęcia', value: o.classTitle },
      { label: 'Kiedy', value: `${o.date}, ${o.time}`, highlight: true },
      { label: 'Lektor', value: o.teacherName },
    ])}
    ${o.meetLink ? btn(o.meetLink, '▶ Dołącz do zajęć') : ''}
  `,
  );
}

function buildAbsenceHtml(o: {
  studentName: string;
  classTitle: string;
  date: string;
}): string {
  return baseLayout(
    'Nieobecność odnotowana',
    'Nieobecność',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.studentName}!</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Odnotowano Twoją nieobecność</h2>
    ${infoTable([
      { label: 'Zajęcia', value: o.classTitle },
      { label: 'Data', value: o.date },
    ])}
    <p style="font-size:14px;color:#71717a;line-height:1.7;margin:20px 0 0;">
      Jeśli to pomyłka lub chcesz usprawiedliwić nieobecność, skontaktuj się ze szkołą.
    </p>
  `,
  );
}

function buildPaymentReminderHtml(o: {
  studentName: string;
  amountFmt: string;
  description: string;
  due: string;
}): string {
  return baseLayout(
    'Przypomnienie o płatności',
    'Płatność',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.studentName}!</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Zbliża się termin płatności</h2>
    ${infoTable([
      { label: 'Opis', value: o.description },
      { label: 'Kwota', value: o.amountFmt, highlight: true },
      { label: 'Termin', value: o.due },
    ])}
    <p style="font-size:14px;color:#71717a;margin:20px 0 0;">Zaloguj się do portalu ucznia, aby opłacić przez Stripe.</p>
  `,
  );
}

function buildVerificationHtml(o: {
  firstName: string;
  verifyUrl: string;
}): string {
  return baseLayout(
    'Potwierdź adres email',
    'Weryfikacja',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.firstName}!</p>
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Potwierdź swój adres email</h2>
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 28px;">
      Kliknij poniższy przycisk, aby aktywować swoje konto w Academy. Link jest ważny przez <strong style="color:#18181b;">24 godziny</strong>.
    </p>
    ${btn(o.verifyUrl, 'Potwierdź email')}
    <p style="font-size:12px;color:#a1a1aa;margin:20px 0 0;line-height:1.6;">
      Jeśli nie zakładałeś konta w Academy, zignoruj tę wiadomość.
    </p>
  `,
  );
}

function buildAdminNewRegistrationHtml(o: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  accountType: 'student' | 'parent';
}): string {
  const typeLabel =
    o.accountType === 'parent' ? 'Rodzic (+ dziecko)' : 'Uczeń dorosły';
  const rows: { label: string; value: string }[] = [
    { label: 'Imię i nazwisko', value: `${o.firstName} ${o.lastName}` },
    { label: 'Email', value: o.email },
    { label: 'Typ konta', value: typeLabel },
  ];
  if (o.phone) rows.push({ label: 'Telefon', value: o.phone });

  return baseLayout(
    'Nowa rejestracja',
    'Nowe konto',
    `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Nowa rejestracja w Academy</h2>
    <p style="font-size:14px;color:#71717a;margin:0 0 24px;">Skontaktuj się z kandydatem i ustal warunki współpracy.</p>
    ${infoTable(rows.map((r) => ({ label: r.label, value: r.value })))}
    <p style="font-size:13px;color:#a1a1aa;margin:20px 0 0;line-height:1.6;">
      Użytkownik jest zarejestrowany ale nie przypisany do żadnej grupy — czeka na kontakt.
    </p>
  `,
  );
}

function buildPaymentConfirmationHtml(o: {
  studentName: string;
  amountFmt: string;
  description: string;
}): string {
  return baseLayout(
    'Potwierdzenie płatności',
    'Zapłacono',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.studentName}!</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Płatność potwierdzona</h2>
    ${infoTable([
      { label: 'Opis', value: o.description },
      { label: 'Zapłacono', value: o.amountFmt, highlight: true },
    ])}
    <p style="font-size:14px;color:#71717a;margin:20px 0 0;">Dziękujemy! Szczegóły znajdziesz w historii płatności w portalu ucznia.</p>
  `,
  );
}

function buildPaymentOverdueHtml(o: {
  studentName: string;
  amountFmt: string;
  description: string;
  due: string;
}): string {
  return baseLayout(
    'Zaległa płatność',
    'Zaległość',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.studentName}!</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#dc2626;letter-spacing:-0.3px;">Płatność po terminie</h2>
    ${infoTable([
      { label: 'Opis', value: o.description },
      { label: 'Kwota', value: o.amountFmt, highlight: true },
      { label: 'Termin minął', value: o.due },
    ])}
    <p style="font-size:14px;color:#71717a;line-height:1.7;margin:20px 0 0;">
      Prosimy o jak najszybsze uregulowanie należności. Zaloguj się do portalu, aby opłacić przez Stripe.
    </p>
  `,
  );
}

function buildChildCredentialsHtml(o: {
  parentName: string;
  childName: string;
  childEmail: string;
}): string {
  return baseLayout(
    'Konto dziecka utworzone',
    'Konto dziecka',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.parentName}!</p>
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Konto dla ${o.childName} jest gotowe</h2>
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 24px;">
      Dziecko loguje się poniższym adresem (to login w systemie, nie skrzynka email). Hasło ustawiłeś podczas konfiguracji.
    </p>
    ${infoTable([
      { label: 'Imię i nazwisko', value: o.childName },
      { label: 'Login dziecka', value: o.childEmail, highlight: true },
    ])}
    <p style="font-size:13px;color:#a1a1aa;margin:20px 0 0;line-height:1.6;">
      Powiadomienia dotyczące dziecka (nieobecności, płatności, przypomnienia) będą przychodzić na Twój adres.
    </p>
  `,
  );
}

function buildPasswordResetHtml(o: {
  firstName: string;
  resetUrl: string;
  forChildName?: string;
}): string {
  const heading = o.forChildName
    ? `Zresetuj hasło konta dziecka`
    : 'Zresetuj swoje hasło';
  const intro = o.forChildName
    ? `Otrzymaliśmy prośbę o zmianę hasła do konta dziecka — <strong style="color:#18181b;">${o.forChildName}</strong>. Kliknij poniższy przycisk, aby ustawić nowe. Link jest ważny przez <strong style="color:#18181b;">1 godzinę</strong>.`
    : `Otrzymaliśmy prośbę o zmianę hasła. Kliknij poniższy przycisk, aby ustawić nowe. Link jest ważny przez <strong style="color:#18181b;">1 godzinę</strong>.`;

  return baseLayout(
    'Reset hasła',
    'Reset hasła',
    `
    <p style="margin:0 0 6px;font-size:14px;color:#71717a;">Cześć, ${o.firstName}!</p>
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">${heading}</h2>
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 28px;">
      ${intro}
    </p>
    ${btn(o.resetUrl, 'Ustaw nowe hasło')}
    <p style="font-size:12px;color:#a1a1aa;margin:20px 0 0;line-height:1.6;">
      Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość — hasło pozostanie bez zmian.
    </p>
  `,
  );
}
