import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => ReturnType<
  typeof import('cookie-parser')
>;
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

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
