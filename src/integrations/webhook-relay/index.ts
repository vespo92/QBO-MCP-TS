/**
 * Webhook Relay Integration
 *
 * Forward QuickBooks events to external webhook endpoints.
 * Supports Zapier, Make, custom webhooks, and other automation platforms.
 */

import crypto from 'crypto';
import { BaseIntegration } from '../base-integration.js';
import type {
  IntegrationMetadata,
  WebhookRelayConfig,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookPayload,
} from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * Webhook relay integration
 */
export class WebhookRelayIntegration extends BaseIntegration<WebhookRelayConfig> {
  readonly metadata: IntegrationMetadata = {
    id: 'webhook-relay',
    name: 'Webhook Relay',
    description: 'Forward QuickBooks events to external webhook endpoints',
    version: '1.0.0',
    tier: 'generic',
    category: 'automation',
    vendor: 'Internal',
    features: [
      'Multi-endpoint support',
      'Event filtering',
      'Signed payloads',
      'Retry with backoff',
      'Delivery tracking',
    ],
  };

  private deliveryQueue: WebhookDelivery[] = [];

  protected async onInitialize(): Promise<void> {
    logger.info('Initializing Webhook Relay integration', {
      endpoints: this.config.endpoints?.length || 0,
    });
  }

  protected async onShutdown(): Promise<void> {
    logger.info('Shutting down Webhook Relay integration');
  }

  protected async onHealthCheck(): Promise<Record<string, unknown>> {
    return {
      endpoints: this.config.endpoints?.length || 0,
      queuedDeliveries: this.deliveryQueue.length,
    };
  }

  protected async onWebhook(payload: WebhookPayload): Promise<void> {
    // Not applicable for outbound relay
  }

  protected verifyWebhookSignature(payload: WebhookPayload): boolean {
    return true; // Outbound only
  }

  /**
   * Add a webhook endpoint
   */
  addEndpoint(endpoint: Omit<WebhookEndpoint, 'id'>): WebhookEndpoint {
    const newEndpoint: WebhookEndpoint = {
      ...endpoint,
      id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.config.endpoints) {
      this.config.endpoints = [];
    }

    this.config.endpoints.push(newEndpoint);
    logger.info('Webhook endpoint added', { name: newEndpoint.name, url: newEndpoint.url });

    return newEndpoint;
  }

  /**
   * Remove a webhook endpoint
   */
  removeEndpoint(endpointId: string): boolean {
    if (!this.config.endpoints) return false;

    const index = this.config.endpoints.findIndex(e => e.id === endpointId);
    if (index === -1) return false;

    this.config.endpoints.splice(index, 1);
    logger.info('Webhook endpoint removed', { endpointId });

    return true;
  }

  /**
   * Update a webhook endpoint
   */
  updateEndpoint(endpointId: string, updates: Partial<WebhookEndpoint>): WebhookEndpoint | null {
    if (!this.config.endpoints) return null;

    const endpoint = this.config.endpoints.find(e => e.id === endpointId);
    if (!endpoint) return null;

    Object.assign(endpoint, updates);
    logger.info('Webhook endpoint updated', { endpointId });

    return endpoint;
  }

  /**
   * Get all endpoints
   */
  getEndpoints(): WebhookEndpoint[] {
    return this.config.endpoints || [];
  }

  /**
   * Relay an event to all matching endpoints
   */
  async relayEvent(event: {
    type: string;
    data: unknown;
    timestamp?: string;
  }): Promise<WebhookDelivery[]> {
    const deliveries: WebhookDelivery[] = [];
    const endpoints = (this.config.endpoints || []).filter(
      e => e.enabled && e.events.includes(event.type)
    );

    if (endpoints.length === 0) {
      logger.debug('No endpoints configured for event', { type: event.type });
      return deliveries;
    }

    const payload: WebhookPayload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: 'qbo-mcp',
      type: event.type,
      timestamp: event.timestamp || new Date().toISOString(),
      data: event.data,
    };

    for (const endpoint of endpoints) {
      const delivery = await this.deliverToEndpoint(endpoint, payload);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  /**
   * Deliver payload to a single endpoint
   */
  private async deliverToEndpoint(
    endpoint: WebhookEndpoint,
    payload: WebhookPayload
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endpointId: endpoint.id,
      event: payload.type,
      payload,
      status: 'pending',
      attempts: 0,
    };

    // Sign the payload if secret is configured
    if (endpoint.secret) {
      payload.signature = this.signPayload(payload, endpoint.secret);
    }

    const maxRetries = endpoint.retryPolicy?.maxRetries || 3;
    const backoffMs = endpoint.retryPolicy?.backoffMs || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      delivery.attempts = attempt;
      delivery.lastAttempt = new Date();

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-ID': payload.id,
            'X-Webhook-Timestamp': payload.timestamp,
            ...(payload.signature && { 'X-Webhook-Signature': payload.signature }),
            ...endpoint.headers,
          },
          body: JSON.stringify(payload),
        });

        delivery.response = {
          status: response.status,
          body: await response.text(),
        };

        if (response.ok) {
          delivery.status = 'delivered';
          logger.info('Webhook delivered', {
            endpointId: endpoint.id,
            event: payload.type,
          });
          break;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        delivery.error = error instanceof Error ? error.message : String(error);

        if (attempt < maxRetries) {
          logger.warn('Webhook delivery failed, retrying', {
            endpointId: endpoint.id,
            attempt,
            error: delivery.error,
          });
          await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
        } else {
          delivery.status = 'failed';
          logger.error('Webhook delivery failed', {
            endpointId: endpoint.id,
            error: delivery.error,
          });
        }
      }
    }

    this.deliveryQueue.push(delivery);
    return delivery;
  }

  /**
   * Sign a payload with HMAC-SHA256
   */
  private signPayload(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Get delivery history
   */
  getDeliveryHistory(limit: number = 100): WebhookDelivery[] {
    return this.deliveryQueue.slice(-limit);
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    const delivery = this.deliveryQueue.find(d => d.id === deliveryId);
    if (!delivery || delivery.status !== 'failed') return null;

    const endpoint = (this.config.endpoints || []).find(e => e.id === delivery.endpointId);
    if (!endpoint) return null;

    return this.deliverToEndpoint(endpoint, delivery.payload as WebhookPayload);
  }
}
