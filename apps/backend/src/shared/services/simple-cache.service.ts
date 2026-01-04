import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class SimpleCacheService {
  private readonly logger = new Logger(SimpleCacheService.name);
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired for key: ${key}`);
      return undefined;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data: value, expiresAt });
    this.logger.debug(`Cache set for key: ${key} (TTL: ${ttlSeconds}s)`);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.logger.debug(`Cache deleted for key: ${key}`);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
