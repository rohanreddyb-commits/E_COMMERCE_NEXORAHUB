/**
 * Cache abstraction interface.
 * Implementations: InMemoryCache (current), RedisCache (future).
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
}
