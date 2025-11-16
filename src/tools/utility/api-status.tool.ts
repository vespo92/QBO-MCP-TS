import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { z } from 'zod';
import { cache } from '../../services/cache.js';
import { queue } from '../../services/queue.js';
import { logger } from '../../utils/logger.js';

const ApiStatusSchema = z.object({});

interface ApiStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  cache: {
    size: number;
    maxSize: number;
    hitRate?: number;
  };
  queue: {
    queued: number;
    active: number;
    completed: number;
    failed: number;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * API Status Tool
 *
 * Get current status of the QuickBooks MCP server including cache, queue, and system metrics.
 *
 * @example
 * ```typescript
 * const tool = new ApiStatusTool();
 * const result = await tool.execute({});
 * ```
 */
export class ApiStatusTool extends BaseTool<{}, ApiStatus> {
  metadata: ToolMetadata = {
    name: 'get_api_status',
    description: 'Get current status and health metrics of the QuickBooks MCP server',
    category: 'utility',
    tags: ['utility', 'health', 'monitoring', 'diagnostics'],
    examples: [
      {
        description: 'Check API status',
        params: {},
      },
    ],
  };

  schema = ApiStatusSchema;

  protected async executeImpl(_params: {}): Promise<ApiStatus> {
    logger.info('Getting API status');

    const cacheStats = cache.getStats();
    const queueStats = queue.getStats();
    const memUsage = process.memoryUsage();

    const status: ApiStatus = {
      status: this.determineHealth(queueStats),
      timestamp: new Date().toISOString(),
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
      },
      queue: {
        queued: queueStats.queuedRequests,
        active: queueStats.activeRequests,
        completed: queueStats.completedRequests,
        failed: queueStats.failedRequests,
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
    };

    return status;
  }

  protected override formatResultText(status: ApiStatus): string {
    const statusEmoji = status.status === 'healthy' ? '✅' : status.status === 'degraded' ? '⚠️' : '❌';

    let text = `${statusEmoji} QuickBooks MCP Server Status\n\n`;

    text += `📊 Overall Status: ${status.status.toUpperCase()}\n`;
    text += `⏰ Timestamp: ${status.timestamp}\n`;
    text += `⏱️  Uptime: ${this.formatUptime(status.uptime)}\n\n`;

    text += `💾 Cache:\n`;
    text += `   Size: ${status.cache.size}/${status.cache.maxSize}\n`;
    if (status.cache.hitRate !== undefined) {
      text += `   Hit Rate: ${(status.cache.hitRate * 100).toFixed(1)}%\n`;
    }
    text += '\n';

    text += `📋 Request Queue:\n`;
    text += `   Queued: ${status.queue.queued}\n`;
    text += `   Active: ${status.queue.active}\n`;
    text += `   Completed: ${status.queue.completed}\n`;
    text += `   Failed: ${status.queue.failed}\n`;
    text += '\n';

    text += `🖥️  Memory:\n`;
    text += `   Used: ${status.memory.used} MB / ${status.memory.total} MB\n`;
    text += `   Percentage: ${status.memory.percentage}%\n`;

    if (status.queue.failed > 0) {
      const failureRate = (status.queue.failed / (status.queue.completed + status.queue.failed)) * 100;
      text += `\n⚠️  Warning: ${failureRate.toFixed(1)}% failure rate detected`;
    }

    return text;
  }

  private determineHealth(queueStats: any): 'healthy' | 'degraded' | 'unhealthy' {
    const totalRequests = queueStats.completedRequests + queueStats.failedRequests;
    if (totalRequests === 0) return 'healthy';

    const failureRate = queueStats.failedRequests / totalRequests;

    if (failureRate > 0.5) return 'unhealthy';
    if (failureRate > 0.1) return 'degraded';

    if (queueStats.queuedRequests > 100) return 'degraded';

    return 'healthy';
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

export default ApiStatusTool;
