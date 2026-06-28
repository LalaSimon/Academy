import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';

/**
 * Globalny filtr wyjątków. Loguje pełny stack trace dla błędów 5xx
 * (nieobsłużone wyjątki, błędy serwera) — to jest realnie przydatne
 * przy debugowaniu. Błędy 4xx (klient) pokrywa już access-log middleware.
 *
 * Rozszerza `BaseExceptionFilter` i deleguje do `super.catch()`, dzięki
 * czemu NIE zmienia domyślnego kształtu odpowiedzi błędu — frontend i
 * testy e2e dostają dokładnie to samo co wcześniej.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      const message =
        exception instanceof Error ? exception.message : 'Unknown error';
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${req.method} ${req.originalUrl} → ${status} — ${message}`,
        stack,
      );
    }

    super.catch(exception, host);
  }
}
