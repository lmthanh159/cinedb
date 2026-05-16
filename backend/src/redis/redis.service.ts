import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<string>('REDIS_PORT', '6379'));

    this.client = createClient({
      url: `redis://${host}:${port}`,
    });
  }

  async onModuleInit() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number) {
    const serializedValue =
      typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, serializedValue, {
        EX: ttlSeconds,
      });
      return;
    }

    await this.client.set(key, serializedValue);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async delPattern(pattern: string) {
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async increment(key: string, ttlSeconds?: number) {
    const value = await this.client.incr(key);

    if (ttlSeconds && value === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    return value;
  }

  async ttl(key: string) {
    return this.client.ttl(key);
  }
}
