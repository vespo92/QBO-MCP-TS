/**
 * Multi-Company Service
 *
 * Manages multiple QuickBooks company connections.
 * Allows switching between companies and managing separate contexts.
 *
 * Features:
 * - Multiple company configurations
 * - Per-company API clients
 * - Per-company caching
 * - Company switching
 * - Company-specific rate limiting
 */

import { QBOApiClient } from '../api/client.js';
import type { QBOConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { CacheService, type ICacheService } from './cache.js';
import { QueueService } from './queue.js';

/**
 * Company context
 */
export interface CompanyContext {
  id: string;
  name: string;
  config: QBOConfig;
  client: QBOApiClient;
  cache: ICacheService;
  queue: QueueService;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Multi-Company Service
 *
 * @example
 * ```typescript
 * const multiCompany = new MultiCompanyService();
 *
 * // Add companies
 * await multiCompany.addCompany('company1', {
 *   name: 'Acme Corp',
 *   config: { ... }
 * });
 *
 * await multiCompany.addCompany('company2', {
 *   name: 'XYZ Inc',
 *   config: { ... }
 * });
 *
 * // Switch between companies
 * multiCompany.setActiveCompany('company1');
 * const invoices = await multiCompany.getActiveClient().query('...');
 *
 * multiCompany.setActiveCompany('company2');
 * const expenses = await multiCompany.getActiveClient().query('...');
 * ```
 */
export class MultiCompanyService {
  private companies: Map<string, CompanyContext> = new Map();
  private activeCompanyId: string | null = null;

  /**
   * Add a company
   *
   * @param id - Company ID
   * @param options - Company options
   */
  async addCompany(
    id: string,
    options: {
      name: string;
      config: QBOConfig;
    }
  ): Promise<void> {
    if (this.companies.has(id)) {
      throw new Error(`Company already exists: ${id}`);
    }

    logger.info('Adding company', { id, name: options.name });

    // Create company-specific instances
    const client = new QBOApiClient(options.config);
    const cache = new CacheService();
    const queue = new QueueService();

    const context: CompanyContext = {
      id,
      name: options.name,
      config: options.config,
      client,
      cache,
      queue,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    this.companies.set(id, context);

    // Set as active if first company
    if (this.companies.size === 1) {
      this.activeCompanyId = id;
      logger.info('Set as active company', { id, name: options.name });
    }

    logger.info('Company added successfully', {
      id,
      name: options.name,
      totalCompanies: this.companies.size,
    });
  }

  /**
   * Remove a company
   *
   * @param id - Company ID
   */
  async removeCompany(id: string): Promise<void> {
    const company = this.companies.get(id);

    if (!company) {
      throw new Error(`Company not found: ${id}`);
    }

    logger.info('Removing company', { id, name: company.name });

    // Clear cache
    await company.cache.clear();

    // Remove from map
    this.companies.delete(id);

    // Update active company if necessary
    if (this.activeCompanyId === id) {
      const firstCompany = this.companies.keys().next().value;
      this.activeCompanyId = firstCompany || null;

      if (this.activeCompanyId) {
        logger.info('Active company changed', { id: this.activeCompanyId });
      }
    }

    logger.info('Company removed successfully', {
      id,
      totalCompanies: this.companies.size,
    });
  }

  /**
   * Set active company
   *
   * @param id - Company ID
   */
  setActiveCompany(id: string): void {
    const company = this.companies.get(id);

    if (!company) {
      throw new Error(`Company not found: ${id}`);
    }

    this.activeCompanyId = id;
    company.lastUsedAt = new Date();

    logger.info('Active company set', { id, name: company.name });
  }

  /**
   * Get active company context
   *
   * @returns Active company context
   */
  getActiveCompany(): CompanyContext | null {
    if (!this.activeCompanyId) {
      return null;
    }

    const company = this.companies.get(this.activeCompanyId);

    if (company) {
      company.lastUsedAt = new Date();
    }

    return company || null;
  }

  /**
   * Get active company client
   *
   * @returns Active company API client
   */
  getActiveClient(): QBOApiClient {
    const company = this.getActiveCompany();

    if (!company) {
      throw new Error('No active company set');
    }

    return company.client;
  }

  /**
   * Get active company cache
   *
   * @returns Active company cache
   */
  getActiveCache(): ICacheService {
    const company = this.getActiveCompany();

    if (!company) {
      throw new Error('No active company set');
    }

    return company.cache;
  }

  /**
   * Get active company queue
   *
   * @returns Active company queue
   */
  getActiveQueue(): QueueService {
    const company = this.getActiveCompany();

    if (!company) {
      throw new Error('No active company set');
    }

    return company.queue;
  }

  /**
   * Get company by ID
   *
   * @param id - Company ID
   * @returns Company context
   */
  getCompany(id: string): CompanyContext | null {
    return this.companies.get(id) || null;
  }

  /**
   * Get all companies
   *
   * @returns Array of company contexts
   */
  getAllCompanies(): CompanyContext[] {
    return Array.from(this.companies.values());
  }

  /**
   * Check if company exists
   *
   * @param id - Company ID
   * @returns True if company exists
   */
  hasCompany(id: string): boolean {
    return this.companies.has(id);
  }

  /**
   * Get company count
   *
   * @returns Number of companies
   */
  getCompanyCount(): number {
    return this.companies.size;
  }

  /**
   * Execute operation for specific company
   *
   * @param companyId - Company ID
   * @param operation - Operation to execute
   * @returns Operation result
   */
  async withCompany<T>(companyId: string, operation: (context: CompanyContext) => Promise<T>): Promise<T> {
    const company = this.companies.get(companyId);

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    company.lastUsedAt = new Date();

    logger.debug('Executing operation for company', {
      companyId,
      name: company.name,
    });

    try {
      return await operation(company);
    } catch (error) {
      logger.error('Operation failed for company', {
        companyId,
        name: company.name,
        error,
      });
      throw error;
    }
  }

  /**
   * Execute operation for all companies
   *
   * @param operation - Operation to execute
   * @returns Map of company ID to result
   */
  async forAllCompanies<T>(
    operation: (context: CompanyContext) => Promise<T>
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    for (const [id, company] of this.companies) {
      try {
        const result = await operation(company);
        results.set(id, result);
      } catch (error) {
        logger.error('Operation failed for company', {
          companyId: id,
          name: company.name,
          error,
        });
      }
    }

    return results;
  }

  /**
   * Get statistics for all companies
   */
  getStatistics() {
    const stats: Record<string, any> = {
      totalCompanies: this.companies.size,
      activeCompanyId: this.activeCompanyId,
      companies: {},
    };

    for (const [id, company] of this.companies) {
      stats.companies[id] = {
        name: company.name,
        cacheSize: company.cache.getStats().size,
        queueStats: company.queue.getStats(),
        createdAt: company.createdAt.toISOString(),
        lastUsedAt: company.lastUsedAt.toISOString(),
      };
    }

    return stats;
  }
}

/**
 * Singleton instance
 */
export const multiCompanyService = new MultiCompanyService();
