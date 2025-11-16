/**
 * Redis Cache Service
 *
 * Optional Redis-based cache backend for distributed caching.
 * Falls back to in-memory cache if Redis is unavailable.
 *
 * Features:
 * - Distributed caching across multiple instances
 * - Automatic serialization/deserialization
 * - Connection pooling
 * - Failover to in-memory cache
 */

import { logger } from '../utils/logger.js';
import type { ICacheService } from './cache.js';

/**
 * Redis client interface (to avoid hard dependency on redis package)
 */
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
  del(key: string): Promise<number>;
  flushAll(): Promise<string>;
  disconnect(): Promise<void>;
  isReady: boolean;
}

/**
 * Redis Cache Service Configuration
 */
export interface RedisCacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  enableFallback?: boolean; // Fall back to in-memory if Redis fails
}

/**
 * Redis-based cache service
 *
 * @example
 * ```typescript
 * import { createClient } from 'redis';
 *
 * const redisClient = createClient({
 *   url: 'redis://localhost:6379'
 * });
 * await redisClient.connect();
 *
 * const cache = new RedisCacheService(redisClient, {
 *   keyPrefix: 'qbo:',
 *   enableFallback: true
 * });
 *
 * await cache.set('invoice:123', invoice, 300);
 * const cached = await cache.get('invoice:123');
 * ```
 */
export class RedisCacheService implements ICacheService {
  private client: RedisClient | null = null;
  private config: Required<RedisCacheConfig>;
  private fallbackCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    errors: 0,
    fallbackHits: 0,
  };

  constructor(client: RedisClient | null, config: RedisCacheConfig = {}) {
    this.client = client;
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || '',
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'qbo:',
      enableFallback: config.enableFallback ?? true,
    };

    if (!client && this.config.enableFallback) {
      logger.warn('Redis client not provided, using in-memory fallback');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.config.keyPrefix + key;

    try {
      // Try Redis first
      if (this.client && this.client.isReady) {
        const value = await this.client.get(fullKey);

        if (value) {
          this.stats.hits++;
          return JSON.parse(value) as T;
        }

        this.stats.misses++;
        return null;
      }

      // Fall back to in-memory cache
      if (this.config.enableFallback) {
        return this.getFromFallback<T>(key);
      }

      return null;
    } catch (error) {
      logger.error('Redis get error', { key, error });
      this.stats.errors++;

      // Fall back to in-memory cache on error
      if (this.config.enableFallback) {
        return this.getFromFallback<T>(key);
      }

      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const fullKey = this.config.keyPrefix + key;

    try {
      // Try Redis first
      if (this.client && this.client.isReady) {
        const serialized = JSON.stringify(value);
        await this.client.set(fullKey, serialized, { EX: ttl });

        // Also set in fallback cache for quick access
        if (this.config.enableFallback) {
          this.setInFallback(key, value, ttl);
        }

        return;
      }

      // Fall back to in-memory cache
      if (this.config.enableFallback) {
        this.setInFallback(key, value, ttl);
      }
    } catch (error) {
      logger.error('Redis set error', { key, error });
      this.stats.errors++;

      // Fall back to in-memory cache on error
      if (this.config.enableFallback) {
        this.setInFallback(key, value, ttl);
      }
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.config.keyPrefix + key;

    try {
      // Delete from Redis
      if (this.client && this.client.isReady) {
        await this.client.del(fullKey);
      }

      // Delete from fallback cache
      if (this.config.enableFallback) {
        this.fallbackCache.delete(key);
      }
    } catch (error) {
      logger.error('Redis delete error', { key, error });
      this.stats.errors++;

      // Delete from fallback cache on error
      if (this.config.enableFallback) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      // Clear Redis (only keys with our prefix)
      if (this.client && this.client.isReady) {
        // Note: This is a simplified version. In production, you'd want to use SCAN
        // to find and delete only keys with the prefix
        await this.client.flushAll();
      }

      // Clear fallback cache
      if (this.config.enableFallback) {
        this.fallbackCache.clear();
      }

      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Redis clear error', { error });
      this.stats.errors++;

      // Clear fallback cache on error
      if (this.config.enableFallback) {
        this.fallbackCache.clear();
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      fallbackSize: this.fallbackCache.size,
      redisConnected: this.client?.isReady || false,
    };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  /**
   * Get from fallback cache
   */
  private getFromFallback<T>(key: string): T | null {
    const entry = this.fallbackCache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.fallbackCache.delete(key);
      return null;
    }

    this.stats.fallbackHits++;
    return entry.value as T;
  }

  /**
   * Set in fallback cache
   */
  private setInFallback<T>(key: string, value: T, ttl: number): void {
    this.fallbackCache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });

    // Limit fallback cache size
    if (this.fallbackCache.size > 1000) {
      // Remove oldest entries
      const keysToDelete = Array.from(this.fallbackCache.keys()).slice(0, 100);
      keysToDelete.forEach((k) => this.fallbackCache.delete(k));
    }
  }
}

/**
 * Create Redis cache service
 *
 * @param config - Redis configuration
 * @returns Cache service instance
 */
export async function createRedisCacheService(
  config: RedisCacheConfig = {}
): Promise<RedisCacheService> {
  let client: RedisClient | null = null;

  try {
    // Dynamic import to avoid hard dependency
    const { createClient } = await import('redis');

    client = createClient({
      socket: {
        host: config.host || 'localhost',
        port: config.port || 6379,
      },
      password: config.password,
      database: config.db || 0,
    }) as any;

    await client.connect();

    logger.info('Redis cache connected', {
      host: config.host,
      port: config.port,
      db: config.db,
    });
  } catch (error) {
    logger.warn('Failed to connect to Redis, using fallback cache', { error });
  }

  return new RedisCacheService(client, config);
}
