import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private config: ConfigService) {
    // `getOrThrow` dla poświadczeń i bucketu — nie `get` z wartością domyślną.
    // Poprzednie `get('MINIO_ACCESS_KEY', 'minioadmin')` to ten sam fail-open,
    // który reguła nr 4 z CLAUDE.md zakazuje w postaci `?? ''`: wdrożenie bez
    // kompletu zmiennych WSTAWAŁO i po cichu łączyło się powszechnie znanym
    // hasłem, zamiast zatrzymać start. `docker-compose.yml` naprawiono już
    // wcześniej (`${VAR:?}`), kod został z domyślnymi.
    this.bucket = this.config.getOrThrow<string>('MINIO_BUCKET');
    this.client = new Minio.Client({
      endPoint: this.config.getOrThrow<string>('MINIO_ENDPOINT'),
      accessKey: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
      // Port i SSL nie są sekretami — domyślne wartości są tu bezpieczne,
      // bo ich brak nie wyłącza żadnego zabezpieczenia.
      port: parseInt(this.config.get('MINIO_PORT', '9000')),
      useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" created`);
      }
    } catch (err) {
      this.logger.warn(`MinIO init failed: ${String(err)}`);
    }
  }

  async putObject(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  async getObject(key: string): Promise<import('stream').Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async statObject(key: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucket, key);
  }

  async removeObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
