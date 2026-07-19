import { ICacheService } from './cache.interface';
import { MemoryCacheService } from './memory.cache';

let cacheInstance: ICacheService | null = null;

/**
 * Returns the singleton cache instance.
 * Currently: InMemoryCache.
 * Future: swap to RedisCache by changing this factory.
 */
export const getCacheService = (): ICacheService => {
  if (!cacheInstance) {
    // Future: if (env.REDIS_URL) return new RedisCacheService(env.REDIS_URL);
    cacheInstance = new MemoryCacheService(300);
  }
  return cacheInstance;
};

export const cacheService = getCacheService();
