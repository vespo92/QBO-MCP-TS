/**
 * Simple in-memory cache service for QBOMCP-TS
 */

import { ICacheService } from '../types';

interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  hits: number;
}

/**
 * Simple in-memory cache implementation
 */
export class CacheService implements ICacheService {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(maxSize: number = 100, ttlSeconds: number = 300) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = ttlSeconds;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Generate cache key from input
   */
  private generateKey(input: string | object): string {
    const data = typeof input === 'string' ? input : JSON.stringify(input);
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.generateKey(key);
    const ttlSeconds = ttl || this.defaultTTL;

    // Check size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(cacheKey)) {
      // Remove least recently used (simple implementation)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      key: cacheKey,
      value,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      createdAt: new Date(),
      hits: 0,
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.generateKey(key);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalSize++;
    }

    return {
      size: totalSize,
      maxSize: this.maxSize,
      hits: totalHits,
      ttl: this.defaultTTL,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Shutdown the cache service
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cache.clear();
  }
}

// Export singleton instance with default settings
export const cacheService = new CacheService(100, 300);
