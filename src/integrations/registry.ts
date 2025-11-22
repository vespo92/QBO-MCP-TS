/**
 * Integration Registry
 *
 * Central registry for managing third-party integrations.
 * Handles registration, discovery, and lifecycle management.
 */

import { BaseIntegration } from './base-integration.js';
import { logger } from '../utils/logger.js';
import type {
  IntegrationMetadata,
  IntegrationCategory,
  IntegrationTier,
  IntegrationHealthCheck,
} from './types.js';

/**
 * Integration registry statistics
 */
export interface IntegrationRegistryStats {
  total: number;
  active: number;
  inactive: number;
  error: number;
  byCategory: Record<string, number>;
  byTier: Record<string, number>;
}

/**
 * Central registry for all integrations
 */
export class IntegrationRegistry {
  private static instance: IntegrationRegistry;
  private integrations: Map<string, BaseIntegration> = new Map();

  private constructor() {
    logger.info('Integration registry initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  /**
   * Register an integration
   */
  register(integration: BaseIntegration): void {
    const { id, name } = integration.metadata;

    if (this.integrations.has(id)) {
      throw new Error(`Integration already registered: ${id}`);
    }

    this.integrations.set(id, integration);

    logger.info(`Integration registered: ${name}`, {
      integrationId: id,
      category: integration.metadata.category,
      tier: integration.metadata.tier,
    });
  }

  /**
   * Unregister an integration
   */
  async unregister(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);

    if (!integration) {
      return false;
    }

    // Shutdown before removing
    await integration.shutdown();
    this.integrations.delete(integrationId);

    logger.info(`Integration unregistered: ${integration.metadata.name}`);
    return true;
  }

  /**
   * Get an integration by ID
   */
  get<T extends BaseIntegration>(integrationId: string): T | undefined {
    return this.integrations.get(integrationId) as T | undefined;
  }

  /**
   * Check if an integration is registered
   */
  has(integrationId: string): boolean {
    return this.integrations.has(integrationId);
  }

  /**
   * Get all integrations
   */
  getAll(): BaseIntegration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Get integrations by category
   */
  getByCategory(category: IntegrationCategory): BaseIntegration[] {
    return this.getAll().filter(i => i.metadata.category === category);
  }

  /**
   * Get integrations by tier
   */
  getByTier(tier: IntegrationTier): BaseIntegration[] {
    return this.getAll().filter(i => i.metadata.tier === tier);
  }

  /**
   * Get active integrations
   */
  getActive(): BaseIntegration[] {
    return this.getAll().filter(i => i.status === 'active');
  }

  /**
   * Initialize all registered integrations
   */
  async initializeAll(): Promise<void> {
    logger.info('Initializing all integrations');

    const results = await Promise.allSettled(
      this.getAll().map(integration => integration.initialize())
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      logger.warn(`${failed.length} integrations failed to initialize`);
    }

    logger.info(`Integrations initialized: ${results.length - failed.length}/${results.length} successful`);
  }

  /**
   * Shutdown all integrations
   */
  async shutdownAll(): Promise<void> {
    logger.info('Shutting down all integrations');

    await Promise.allSettled(
      this.getAll().map(integration => integration.shutdown())
    );

    logger.info('All integrations shut down');
  }

  /**
   * Perform health check on all integrations
   */
  async healthCheckAll(): Promise<Map<string, IntegrationHealthCheck>> {
    const results = new Map<string, IntegrationHealthCheck>();

    await Promise.all(
      this.getAll().map(async integration => {
        const check = await integration.healthCheck();
        results.set(integration.metadata.id, check);
      })
    );

    return results;
  }

  /**
   * Get registry statistics
   */
  getStats(): IntegrationRegistryStats {
    const stats: IntegrationRegistryStats = {
      total: this.integrations.size,
      active: 0,
      inactive: 0,
      error: 0,
      byCategory: {},
      byTier: {},
    };

    for (const integration of this.integrations.values()) {
      // Count by status
      switch (integration.status) {
        case 'active':
          stats.active++;
          break;
        case 'inactive':
          stats.inactive++;
          break;
        case 'error':
          stats.error++;
          break;
      }

      // Count by category
      const category = integration.metadata.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by tier
      const tier = integration.metadata.tier;
      stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
    }

    return stats;
  }

  /**
   * List all integrations with metadata
   */
  list(): Array<{
    metadata: IntegrationMetadata;
    status: string;
  }> {
    return this.getAll().map(i => ({
      metadata: i.metadata,
      status: i.status,
    }));
  }

  /**
   * Clear the registry
   */
  async clear(): Promise<void> {
    await this.shutdownAll();
    this.integrations.clear();
    logger.info('Integration registry cleared');
  }
}

/**
 * Singleton instance
 */
export const integrationRegistry = IntegrationRegistry.getInstance();
