/**
 * Simple rate limiter service for managing API rate limits
 */

import { IQueueService } from '../types';

/**
 * Simple rate limiter implementation without external dependencies
 */
export class QueueService implements IQueueService {
  private readonly rateLimitPerMinute: number;
  private readonly concurrency: number;
  private readonly queue: Array<() => Promise<any>> = [];
  private activeTasks = 0;
  private requestsInWindow: number[] = [];
  private processing = false;

  constructor(rateLimitPerMinute: number = 60, concurrency: number = 5) {
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.concurrency = concurrency;
  }

  /**
   * Add a task to the queue
   */
  async add<T>(fn: () => Promise<T>, _priority?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.queue.push(task);
      this.process();
    });
  }

  /**
   * Process the queue
   */
  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.canProcessNext()) {
      const task = this.queue.shift();
      if (task) {
        this.activeTasks++;
        this.trackRequest();

        task().finally(() => {
          this.activeTasks--;
          this.process();
        });
      }
    }

    this.processing = false;
  }

  /**
   * Check if we can process the next task
   */
  private canProcessNext(): boolean {
    // Check concurrency limit
    if (this.activeTasks >= this.concurrency) {
      return false;
    }

    // Check rate limit
    this.cleanOldRequests();
    return this.requestsInWindow.length < this.rateLimitPerMinute;
  }

  /**
   * Track a new request
   */
  private trackRequest(): void {
    this.requestsInWindow.push(Date.now());
  }

  /**
   * Clean requests older than 1 minute
   */
  private cleanOldRequests(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.requestsInWindow = this.requestsInWindow.filter((time) => time > oneMinuteAgo);
  }

  /**
   * Get queue statistics
   */
  getStats() {
    this.cleanOldRequests();
    return {
      pending: this.queue.length,
      active: this.activeTasks,
      size: this.queue.length + this.activeTasks,
      requestsInLastMinute: this.requestsInWindow.length,
      rateLimitPerMinute: this.rateLimitPerMinute,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.length = 0;
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    // Simple implementation - just stop processing
    this.processing = false;
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    this.process();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get pending tasks count
   */
  pending(): number {
    return this.queue.length;
  }

  /**
   * Wait for all tasks to complete
   */
  async onIdle(): Promise<void> {
    while (this.queue.length > 0 || this.activeTasks > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Shutdown the queue service
   */
  async shutdown(): Promise<void> {
    this.clear();
    await this.onIdle();
  }
}

// Export singleton instance with config-based settings
export const queueService = new QueueService(60, 5);
