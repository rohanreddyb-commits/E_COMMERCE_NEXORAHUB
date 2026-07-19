import NodeCache from 'node-cache';
import { ICacheService } from './cache.interface';
import { logger } from '../../config/logger';

/**
 * In-memory cache implementation using node-cache.
 * Drop-in replaceable with RedisCache — same interface.
 */
export class MemoryCacheService implements ICacheService {
  private readonly cache: NodeCache;
  private readonly defaultTtl: number;

  constructor(defaultTtlSeconds = 300) {
    this.defaultTtl = defaultTtlSeconds;
    this.cache = new NodeCache({
      stdTTL: defaultTtlSeconds,
      checkperiod: 120,
      useClones: false, // performance: avoid deep cloning
    });
    logger.info('[Cache] In-memory cache initialized');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    return value !== undefined ? value : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value, ttlSeconds ?? this.defaultTtl);
  }

  async del(key: string): Promise<void> {
    this.cache.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const allKeys = this.cache.keys();
    const regex = new RegExp(pattern.replace('*', '.*'));
    const matchingKeys = allKeys.filter((k) => regex.test(k));
    if (matchingKeys.length > 0) {
      this.cache.del(matchingKeys);
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async flush(): Promise<void> {
    this.cache.flushAll();
  }
}
