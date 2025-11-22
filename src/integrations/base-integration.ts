/**
 * Base Integration Class
 *
 * Abstract base class for all third-party integrations.
 * Provides common functionality for authentication, health checks,
 * event handling, and error management.
 */

import { logger } from '../utils/logger.js';
import type {
  IntegrationMetadata,
  IntegrationConfig,
  IntegrationHealthCheck,
  IntegrationStatus,
  IntegrationEvent,
  WebhookPayload,
} from './types.js';

/**
 * Abstract base class for integrations
 */
export abstract class BaseIntegration<TConfig extends IntegrationConfig = IntegrationConfig> {
  protected config: TConfig;
  protected _status: IntegrationStatus = 'inactive';
  protected _lastHealthCheck?: IntegrationHealthCheck;
  protected eventHandlers: Map<string, Array<(event: IntegrationEvent) => Promise<void>>> = new Map();

  /**
   * Integration metadata - must be implemented by subclasses
   */
  abstract readonly metadata: IntegrationMetadata;

  constructor(config: TConfig) {
    this.config = config;
  }

  /**
   * Get current status
   */
  get status(): IntegrationStatus {
    return this._status;
  }

  /**
   * Get last health check result
   */
  get lastHealthCheck(): IntegrationHealthCheck | undefined {
    return this._lastHealthCheck;
  }

  /**
   * Initialize the integration
   * Override in subclasses for custom initialization
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this._status = 'inactive';
      logger.info(`Integration ${this.metadata.name} is disabled`);
      return;
    }

    try {
      await this.onInitialize();
      this._status = 'active';
      logger.info(`Integration ${this.metadata.name} initialized`, {
        integrationId: this.metadata.id,
        version: this.metadata.version,
      });
    } catch (error) {
      this._status = 'error';
      logger.error(`Failed to initialize integration ${this.metadata.name}`, { error });
      throw error;
    }
  }

  /**
   * Shutdown the integration
   */
  async shutdown(): Promise<void> {
    try {
      await this.onShutdown();
      this._status = 'inactive';
      logger.info(`Integration ${this.metadata.name} shutdown`);
    } catch (error) {
      logger.error(`Error shutting down integration ${this.metadata.name}`, { error });
    }
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<IntegrationHealthCheck> {
    const startTime = Date.now();

    try {
      const details = await this.onHealthCheck();
      const latency = Date.now() - startTime;

      this._lastHealthCheck = {
        status: 'active',
        lastCheck: new Date(),
        latency,
        message: 'OK',
        details,
      };

      this._status = 'active';
    } catch (error) {
      this._lastHealthCheck = {
        status: 'error',
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Health check failed',
      };

      this._status = 'error';
    }

    return this._lastHealthCheck;
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    logger.debug(`Webhook received for ${this.metadata.name}`, {
      type: payload.type,
      source: payload.source,
    });

    // Verify webhook signature if required
    if (!this.verifyWebhookSignature(payload)) {
      throw new Error('Invalid webhook signature');
    }

    // Process the webhook
    await this.onWebhook(payload);

    // Emit event to handlers
    const event: IntegrationEvent = {
      id: payload.id,
      integrationId: this.metadata.id,
      type: payload.type,
      timestamp: new Date(payload.timestamp),
      data: payload.data,
      status: 'processed',
    };

    await this.emitEvent(event);
  }

  /**
   * Subscribe to integration events
   */
  on(eventType: string, handler: (event: IntegrationEvent) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Unsubscribe from integration events
   */
  off(eventType: string, handler: (event: IntegrationEvent) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  protected async emitEvent(event: IntegrationEvent): Promise<void> {
    const handlers = [
      ...(this.eventHandlers.get(event.type) || []),
      ...(this.eventHandlers.get('*') || []), // Wildcard handlers
    ];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Event handler error for ${this.metadata.name}`, {
          eventType: event.type,
          error,
        });
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info(`Configuration updated for ${this.metadata.name}`);
  }

  /**
   * Get integration info
   */
  getInfo(): {
    metadata: IntegrationMetadata;
    status: IntegrationStatus;
    lastHealthCheck?: IntegrationHealthCheck;
    config: Omit<TConfig, 'apiKey' | 'apiSecret'>;
  } {
    // Exclude sensitive config values
    const { apiKey, apiSecret, ...safeConfig } = this.config;

    return {
      metadata: this.metadata,
      status: this._status,
      lastHealthCheck: this._lastHealthCheck,
      config: safeConfig as Omit<TConfig, 'apiKey' | 'apiSecret'>,
    };
  }

  // ============================================================================
  // Abstract methods - must be implemented by subclasses
  // ============================================================================

  /**
   * Custom initialization logic
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Custom shutdown logic
   */
  protected abstract onShutdown(): Promise<void>;

  /**
   * Custom health check logic
   */
  protected abstract onHealthCheck(): Promise<Record<string, unknown>>;

  /**
   * Webhook processing logic
   */
  protected abstract onWebhook(payload: WebhookPayload): Promise<void>;

  /**
   * Verify webhook signature
   */
  protected abstract verifyWebhookSignature(payload: WebhookPayload): boolean;
}

/**
 * Decorator for retry logic
 */
export function withRetry(maxRetries: number = 3, backoffMs: number = 1000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`Retry attempt ${attempt}/${maxRetries} for ${propertyKey}`, {
            error: lastError.message,
          });

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
          }
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
