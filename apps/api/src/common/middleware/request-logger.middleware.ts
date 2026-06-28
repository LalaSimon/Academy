import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

/**
 * Loguje każde żądanie HTTP po zakończeniu odpowiedzi (`res.finish`).
 * Middleware działa PRZED guardami, więc access-log obejmuje również
 * żądania odrzucone przez auth (401/403). `req.user` jest dostępny
 * w handlerze `finish`, bo cały cykl żądania już się wykonał.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: AuthedRequest, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const user = req.user ? `${req.user.email} [${req.user.role}]` : 'anon';
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms — ${user}`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
