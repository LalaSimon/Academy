import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => ReturnType<
  typeof import('cookie-parser')
>;
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Liczba warstw proxy przed API. Zero = brak proxy (dev, docker compose).
 *
 * Świadomie LICZBA, nie `true`. `trust proxy: true` każe Expressowi wierzyć
 * całemu `X-Forwarded-For`, który klient może dopisać sam — limity żądań stają
 * się wtedy obchodzalne jednym nagłówkiem. Liczba mówi „ufaj dokładnie tylu
 * wpisom z prawej", czyli tym, które dokłada nasza infrastruktura.
 *
 * Zero po drugiej stronie też jest ryzykowne, ale w odwrotny sposób: za proxy
 * `req.ip` byłby adresem proxy, wspólnym dla wszystkich, więc pierwszy user,
 * który wyczerpie limit, zablokowałby całą szkołę. Dlatego przy wdrożeniu za
 * reverse proxy TRZEBA ustawić `TRUST_PROXY_HOPS` na liczbę warstw.
 */
function trustProxyHops(): number {
  const raw = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  return Number.isInteger(raw) && raw >= 0 ? raw : 0;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.set('trust proxy', trustProxyHops());

  // Ciała żądań poza uploadem to JSON-y na kilka kilobajtów; limit multera
  // (materials.controller.ts) dotyczy wyłącznie multipart. 256kb z zapasem
  // mieści największe realne żądanie (`PATCH /attendance/bulk` dla dużej grupy).
  app.useBodyParser('json', { limit: '256kb' });
  app.useBodyParser('urlencoded', { limit: '256kb', extended: true });

  // Nagłówki bezpieczeństwa. `nosniff` domyka wektor uploadu: dziś pliki broni
  // wyłącznie `Content-Disposition: attachment`, bo `Content-Type` pochodzi
  // z metadanych podanych przez wgrywającego.
  // CSP wyłączone — API zwraca JSON i pliki, nie HTML, a domyślna polityka
  // helmeta potrafi kolidować ze streamowaniem załączników.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}
void bootstrap();
