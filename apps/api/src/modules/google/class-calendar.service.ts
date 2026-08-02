import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarService } from './google-calendar.service';

/**
 * Utrzymuje Kalendarz Google w zgodzie z zajęciami w Academy.
 *
 * Powstało po analizie, która wykazała trzy niezależne ścieżki tworzenia zajęć
 * (`classes.create`, `classes.createBulk`, `groups.generateClasses`) i pięć
 * ścieżek modyfikacji — a integracja Meet obsługiwała tylko dwie pierwsze.
 * Logika siedzi tu, a nie w `classes.service` i `groups.service`, żeby kolejne
 * miejsce tworzące zajęcia nie musiało jej odkrywać od nowa (dokładnie ten sam
 * problem, który rozwiązał `AccessControlService`).
 *
 * ZASADA: żadna metoda nie rzuca i nie blokuje operacji na zajęciach. Kalendarz
 * jest dodatkiem, nie źródłem prawdy — nieudana synchronizacja trafia do logów.
 */
@Injectable()
export class ClassCalendarService {
  private readonly logger = new Logger(ClassCalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleCalendarService,
  ) {}

  /**
   * Tworzy spotkanie dla zajęć, które go jeszcze nie mają, i zapisuje link
   * oraz `googleEventId`. Zajęcia z ręcznie wpisanym linkiem pomija — admin
   * mógł celowo wskazać Zoom albo stały pokój.
   */
  async attach(classIds: string[]): Promise<void> {
    if (!this.google.isEnabled || classIds.length === 0) return;

    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds }, meetLink: null },
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        durationMin: true,
      },
    });

    for (const cls of classes) {
      const event = await this.google.createEvent(cls);
      if (!event) continue;

      await this.prisma.class.update({
        where: { id: cls.id },
        data: { meetLink: event.meetLink, googleEventId: event.eventId },
      });
    }
  }

  /**
   * Przenosi wydarzenie po zmianie terminu, czasu trwania lub tytułu.
   * Bez tego seria przesunięta przez `updateBatch` zostawiała w kalendarzu
   * stare daty.
   */
  async sync(classIds: string[]): Promise<void> {
    if (!this.google.isEnabled || classIds.length === 0) return;

    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds }, googleEventId: { not: null } },
      select: {
        googleEventId: true,
        title: true,
        description: true,
        scheduledAt: true,
        durationMin: true,
      },
    });

    for (const cls of classes) {
      await this.google.updateEvent(cls.googleEventId!, cls);
    }
  }

  /**
   * Usuwa wydarzenia z kalendarza. Wywoływane przy kasowaniu zajęć ORAZ przy
   * odwołaniu — odwołana lekcja nie może dalej widnieć jako aktualna.
   *
   * Kolejność ma znaczenie: `detach` musi polecieć PRZED usunięciem zajęć
   * z bazy, bo potem nie ma skąd wziąć `googleEventId`.
   */
  async detach(classIds: string[]): Promise<void> {
    if (classIds.length === 0) return;

    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds }, googleEventId: { not: null } },
      select: { id: true, googleEventId: true },
    });
    if (classes.length === 0) return;

    for (const cls of classes) {
      // Gdy integracja jest wyłączona, nie mamy jak usunąć wydarzenia —
      // czyścimy tylko powiązanie, żeby nie zostawiać martwego id.
      if (this.google.isEnabled) {
        const ok = await this.google.deleteEvent(cls.googleEventId!);
        if (!ok) {
          this.logger.warn(
            `Wydarzenie ${cls.googleEventId} zostało w kalendarzu — usuń je ręcznie`,
          );
        }
      }
    }

    // `updateMany` zamiast pętli — zajęcia mogły już zniknąć z bazy (kasowanie),
    // a wtedy po prostu nic nie zaktualizuje.
    await this.prisma.class.updateMany({
      where: { id: { in: classes.map((c) => c.id) } },
      data: { meetLink: null, googleEventId: null },
    });
  }

  /** Identyfikatory zajęć należących do serii — używane przy operacjach batch. */
  async classIdsInBatch(batchId: string): Promise<string[]> {
    const classes = await this.prisma.class.findMany({
      where: { batchId },
      select: { id: true },
    });
    return classes.map((c) => c.id);
  }
}
