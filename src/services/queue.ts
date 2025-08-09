/**
 * Queue service for managing API rate limits and concurrent requests
 */

import PQueue from 'p-queue';
import { IQueueService } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * Queue service implementation using p-queue
 */
export class QueueService implements IQueueService {
  private queue: PQueue;
  private readonly rateLimitPerMinute: number;

  constructor() {
    const apiConfig = config.getAPIConfig();
    this.rateLimitPerMinute = apiConfig.rateLimitPerMinute;

    // Create queue with rate limiting
    this.queue = new PQueue({
      concurrency: 5, // Max concurrent requests
      interval: 60000, // 1 minute
      intervalCap: this.rateLimitPerMinute, // Requests per minute
      timeout: apiConfig.timeout,
      throwOnTimeout: true,
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up queue event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.queue.on('active', () => {
      logger.debug(`Queue: Task started. Size: ${this.queue.size}, Pending: ${this.queue.pending}`);
    });

    this.queue.on('idle', () => {
      logger.debug('Queue: All tasks completed');
    });

    this.queue.on('add', () => {
      logger.debug(`Queue: Task added. Size: ${this.queue.size}`);
    });

    this.queue.on('next', () => {
      logger.debug(`Queue: Processing next task. Remaining: ${this.queue.size}`);
    });
  }

  /**
   * Add a task to the queue
   */
  public async add<T>(task: () => Promise<T>, priority: number = 0): Promise<T> {
    return this.queue.add(task, { priority }) as Promise<T>;
  }

  /**
   * Pause the queue
   */
  public pause(): void {
    this.queue.pause();
    logger.info('Queue paused');
  }

  /**
   * Resume the queue
   */
  public resume(): void {
    this.queue.start();
    logger.info('Queue resumed');
  }

  /**
   * Clear all pending tasks
   */
  public clear(): void {
    this.queue.clear();
    logger.info('Queue cleared');
  }

  /**
   * Get queue size (waiting tasks)
   */
  public size(): number {
    return this.queue.size;
  }

  /**
   * Get number of pending tasks (running + waiting)
   */
  public pending(): number {
    return this.queue.pending;
  }

  /**
   * Check if queue is paused
   */
  public isPaused(): boolean {
    return this.queue.isPaused;
  }

  /**
   * Check if queue is idle
   */
  public isIdle(): boolean {
    return this.queue.size === 0 && this.queue.pending === 0;
  }

  /**
   * Wait for all tasks to complete
   */
  public async onIdle(): Promise<void> {
    await this.queue.onIdle();
  }

  /**
   * Wait for queue to be empty (no waiting tasks)
   */
  public async onEmpty(): Promise<void> {
    await this.queue.onEmpty();
  }

  /**
   * Get queue statistics
   */
  public getStats(): {
    size: number;
    pending: number;
    isPaused: boolean;
    concurrency: number;
    rateLimitPerMinute: number;
  } {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused,
      concurrency: this.queue.concurrency,
      rateLimitPerMinute: this.rateLimitPerMinute,
    };
  }

  /**
   * Add multiple tasks as a batch
   */
  public async addBatch<T>(tasks: Array<() => Promise<T>>, priority: number = 0): Promise<T[]> {
    const promises = tasks.map((task) => this.add(task, priority));
    return Promise.all(promises);
  }

  /**
   * Execute a task with retry logic
   */
  public async addWithRetry<T>(
    task: () => Promise<T>,
    options: {
      retries?: number;
      retryDelay?: number;
      priority?: number;
      onRetry?: (attempt: number, error: Error) => void;
    } = {},
  ): Promise<T> {
    const { retries = 3, retryDelay = 1000, priority = 0, onRetry } = options;

    return this.add(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          return await task();
        } catch (error) {
          lastError = error as Error;

          if (attempt < retries) {
            if (onRetry) {
              onRetry(attempt, lastError);
            }

            logger.warn(`Task retry attempt ${attempt}/${retries}`, {
              error: lastError.message,
            });

            // Exponential backoff
            const delay = retryDelay * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    }, priority);
  }

  /**
   * Execute tasks with rate limiting per time window
   */
  public createRateLimitedExecutor<T>(
    windowMs: number,
    maxRequests: number,
  ): (task: () => Promise<T>) => Promise<T> {
    const requestTimes: number[] = [];

    return async (task: () => Promise<T>): Promise<T> => {
      return this.add(async () => {
        const now = Date.now();

        // Remove old requests outside the window
        while (requestTimes.length > 0 && requestTimes[0]! < now - windowMs) {
          requestTimes.shift();
        }

        // Check if we've exceeded the limit
        if (requestTimes.length >= maxRequests) {
          const oldestRequest = requestTimes[0]!;
          const waitTime = windowMs - (now - oldestRequest);

          if (waitTime > 0) {
            logger.debug(`Rate limit: waiting ${waitTime}ms`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }

        // Record this request
        requestTimes.push(Date.now());

        // Execute the task
        return task();
      });
    };
  }

  /**
   * Shutdown the queue gracefully
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down queue service');

    // Stop accepting new tasks
    this.pause();

    // Wait for current tasks to complete
    if (this.pending() > 0) {
      logger.info(`Waiting for ${this.pending()} tasks to complete`);
      await this.onIdle();
    }

    logger.info('Queue service shutdown complete');
  }
}

// Export singleton instance
export const queueService = new QueueService();
