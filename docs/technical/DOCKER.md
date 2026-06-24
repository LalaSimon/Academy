# Konfiguracja Docker

## Serwisy (docker-compose.yml — development)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]  # API + Console
    command: server /data --console-address ":9001"
    volumes: [minio_data:/data]
    environment:
      MINIO_ROOT_USER, MINIO_ROOT_PASSWORD

  api:
    build: ./apps/api
    ports: ["3000:3000"]
    depends_on: [postgres, redis, minio]
    volumes: [./apps/api:/app]  # hot reload
    environment: .env

  web:
    build: ./apps/web
    ports: ["5173:5173"]
    volumes: [./apps/web:/app]  # hot reload
```

## Zmienne środowiskowe (.env.example)

```env
# Database
DATABASE_URL="postgresql://user:password@postgres:5432/academy"

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=academy-files

# Redis
REDIS_URL=redis://redis:6379

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=password

# Google OAuth (Meet integration)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Payments
PRZELEWY24_MERCHANT_ID=
PRZELEWY24_POS_ID=
PRZELEWY24_CRC=
PRZELEWY24_API_KEY=

# App
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3000
```

## Komendy deweloperskie

```bash
# Start całego stacku
docker-compose up -d

# Tylko baza danych (do lokalnego developmentu API bez Dockera)
docker-compose up -d postgres redis minio

# Migracje Prisma
docker-compose exec api npx prisma migrate dev

# Prisma Studio (UI do bazy)
docker-compose exec api npx prisma studio

# Logi konkretnego serwisu
docker-compose logs -f api

# Reset bazy danych
docker-compose down -v && docker-compose up -d
```

## Produkcja (docker-compose.prod.yml)

Dodatkowe zmiany względem dev:
- Nginx jako reverse proxy z SSL (certbot/Let's Encrypt)
- Brak montowania wolumenów lokalnych
- `NODE_ENV=production`
- Health checks na wszystkich serwisach
- Restart policy: `unless-stopped`
- Oddzielna sieć Docker (nie ekspozycja portów bazy na zewnątrz)
