/**
 * Cache service for QBOMCP-TS
 */

import { ICacheService } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  hits: number;
  size: number;
}

/**
 * In-memory cache with optional file persistence
 */
export class CacheService implements ICacheService {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly persistPath?: string;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor() {
    const cacheConfig = config.getCacheConfig();
    this.cache = new Map();
    this.maxSize = cacheConfig.maxSize;
    this.defaultTTL = cacheConfig.ttl;

    if (cacheConfig.enabled) {
      this.persistPath = path.join(cacheConfig.dir, 'cache.json');
      this.loadFromDisk();

      // Start cleanup interval
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60000); // Every minute
    }
  }

  /**
   * Generate cache key from input
   */
  private generateKey(input: string | object): string {
    const data = typeof input === 'string' ? input : JSON.stringify(input);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate size of value in bytes
   */
  private calculateSize(value: any): number {
    const str = JSON.stringify(value);
    return Buffer.byteLength(str, 'utf8');
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    const normalizedKey = this.generateKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      logger.cache('miss', normalizedKey);
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      logger.cache('miss', normalizedKey, { reason: 'expired' });
      this.cache.delete(normalizedKey);
      return null;
    }

    // Update hit count
    entry.hits++;
    logger.cache('hit', normalizedKey, { hits: entry.hits });

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const normalizedKey = this.generateKey(key);
    const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL) * 1000);
    const size = this.calculateSize(value);

    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key: normalizedKey,
      value,
      expiresAt,
      createdAt: new Date(),
      hits: 0,
      size,
    };

    this.cache.set(normalizedKey, entry);
    logger.cache('set', normalizedKey, { ttl: ttl || this.defaultTTL, size });

    // Persist to disk if enabled
    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<void> {
    const normalizedKey = this.generateKey(key);
    const deleted = this.cache.delete(normalizedKey);

    if (deleted) {
      logger.cache('delete', normalizedKey);

      // Persist to disk if enabled
      if (this.persistPath) {
        this.saveToDisk();
      }
    }
  }

  /**
   * Clear entire cache
   */
  public async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    logger.cache('clear', undefined, { cleared: size });

    // Clear persisted cache
    if (this.persistPath) {
      try {
        await fs.unlink(this.persistPath);
      } catch (_error) {
        // File might not exist
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruHits = Infinity;
    // let lruTime = new Date();

    for (const [key, entry] of this.cache.entries()) {
      // Skip if expired (will be cleaned up)
      if (new Date() > entry.expiresAt) {
        continue;
      }

      // Find least recently used based on hits and creation time
      const score = entry.hits / ((Date.now() - entry.createdAt.getTime()) / 1000);
      if (score < lruHits) {
        lruHits = score;
        lruKey = key;
        // lruTime = entry.createdAt;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.debug(`Evicted LRU cache entry: ${lruKey}`);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);

      // Persist to disk if enabled
      if (this.persistPath) {
        this.saveToDisk();
      }
    }
  }

  /**
   * Load cache from disk
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.persistPath) return;

    try {
      const data = await fs.readFile(this.persistPath, 'utf-8');
      const entries = JSON.parse(data) as CacheEntry[];

      const now = new Date();
      let loaded = 0;

      for (const entry of entries) {
        // Convert date strings back to Date objects
        entry.expiresAt = new Date(entry.expiresAt);
        entry.createdAt = new Date(entry.createdAt);

        // Skip expired entries
        if (now > entry.expiresAt) {
          continue;
        }

        this.cache.set(entry.key, entry);
        loaded++;
      }

      logger.info(`Loaded ${loaded} cache entries from disk`);
    } catch (_error) {
      // File might not exist or be corrupted
      logger.debug('No existing cache file found or failed to load');
    }
  }

  /**
   * Save cache to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.persistPath) return;

    try {
      const entries = Array.from(this.cache.values());
      await fs.writeFile(this.persistPath, JSON.stringify(entries, null, 2));
    } catch (error) {
      logger.error('Failed to save cache to disk', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    totalSize: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1; // +1 for initial set
      totalSize += entry.size;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits,
      totalSize,
    };
  }

  /**
   * Shutdown cache service
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.persistPath) {
      await this.saveToDisk();
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
