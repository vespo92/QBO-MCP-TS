import { BaseTool, type ToolCategory } from './base-tool.js';
import { logger } from '../utils/logger.js';
import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool registration options
 */
export interface ToolRegistrationOptions {
  /**
   * Whether to override existing tool with same name
   */
  override?: boolean;

  /**
   * Whether tool is enabled
   */
  enabled?: boolean;
}

/**
 * Tool registry statistics
 */
export interface RegistryStats {
  totalTools: number;
  enabledTools: number;
  disabledTools: number;
  categories: Record<string, number>;
}

/**
 * Central registry for all MCP tools
 *
 * Manages tool registration, discovery, and retrieval.
 * Supports auto-discovery of tools from filesystem.
 *
 * @example
 * ```typescript
 * const registry = ToolRegistry.getInstance();
 *
 * // Manual registration
 * registry.register(new GetInvoicesTool());
 *
 * // Auto-discovery
 * await registry.autoDiscover('./src/tools');
 *
 * // List all tools
 * const tools = registry.listAll();
 * ```
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, { tool: BaseTool; enabled: boolean }> = new Map();

  private constructor() {
    logger.info('Tool registry initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool
   *
   * @param tool - Tool instance to register
   * @param options - Registration options
   * @throws Error if tool already registered and override is false
   */
  register(tool: BaseTool, options: ToolRegistrationOptions = {}): void {
    const { override = false, enabled = true } = options;
    const name = tool.metadata.name;

    if (this.tools.has(name) && !override) {
      throw new Error(`Tool already registered: ${name}. Use override option to replace.`);
    }

    this.tools.set(name, { tool, enabled });

    logger.info(`Tool registered: ${name}`, {
      category: tool.metadata.category,
      enabled,
      override: this.tools.has(name) && override,
    });
  }

  /**
   * Unregister a tool
   *
   * @param name - Tool name to unregister
   * @returns True if tool was unregistered, false if not found
   */
  unregister(name: string): boolean {
    const deleted = this.tools.delete(name);

    if (deleted) {
      logger.info(`Tool unregistered: ${name}`);
    }

    return deleted;
  }

  /**
   * Get a tool by name
   *
   * @param name - Tool name
   * @returns Tool instance or undefined if not found
   */
  get(name: string): BaseTool | undefined {
    const entry = this.tools.get(name);
    return entry?.enabled ? entry.tool : undefined;
  }

  /**
   * Check if a tool is registered
   *
   * @param name - Tool name
   * @returns True if tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Enable a tool
   *
   * @param name - Tool name
   * @returns True if tool was enabled, false if not found
   */
  enable(name: string): boolean {
    const entry = this.tools.get(name);

    if (!entry) {
      return false;
    }

    entry.enabled = true;
    logger.info(`Tool enabled: ${name}`);
    return true;
  }

  /**
   * Disable a tool
   *
   * @param name - Tool name
   * @returns True if tool was disabled, false if not found
   */
  disable(name: string): boolean {
    const entry = this.tools.get(name);

    if (!entry) {
      return false;
    }

    entry.enabled = false;
    logger.info(`Tool disabled: ${name}`);
    return true;
  }

  /**
   * List all registered tools
   *
   * @param includeDisabled - Whether to include disabled tools
   * @returns Array of tool definitions
   */
  listAll(includeDisabled = false): Tool[] {
    const tools: Tool[] = [];

    for (const [_, entry] of this.tools) {
      if (entry.enabled || includeDisabled) {
        tools.push(entry.tool.getDefinition());
      }
    }

    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * List tools by category
   *
   * @param category - Tool category
   * @returns Array of tool definitions in category
   */
  listByCategory(category: ToolCategory): Tool[] {
    const tools: Tool[] = [];

    for (const [_, entry] of this.tools) {
      if (entry.enabled && entry.tool.metadata.category === category) {
        tools.push(entry.tool.getDefinition());
      }
    }

    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * List tools by multiple categories
   *
   * @param categories - Array of tool categories
   * @returns Array of tool definitions in the specified categories
   */
  listByCategories(categories: ToolCategory[]): Tool[] {
    const tools: Tool[] = [];
    const categorySet = new Set(categories);

    for (const [_, entry] of this.tools) {
      if (entry.enabled && categorySet.has(entry.tool.metadata.category)) {
        tools.push(entry.tool.getDefinition());
      }
    }

    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all available categories
   *
   * @returns Array of unique categories with tool counts
   */
  getCategories(): Array<{ category: ToolCategory; count: number }> {
    const categoryCounts = new Map<ToolCategory, number>();

    for (const [_, entry] of this.tools) {
      if (entry.enabled) {
        const category = entry.tool.metadata.category;
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    }

    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * Get registry statistics
   *
   * @returns Registry stats
   */
  getStats(): RegistryStats {
    const stats: RegistryStats = {
      totalTools: this.tools.size,
      enabledTools: 0,
      disabledTools: 0,
      categories: {},
    };

    for (const [_, entry] of this.tools) {
      if (entry.enabled) {
        stats.enabledTools++;
      } else {
        stats.disabledTools++;
      }

      const category = entry.tool.metadata.category;
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Auto-discover and register tools from a directory
   *
   * Recursively scans directory for tool files (*.tool.ts or *.tool.js)
   * and registers them automatically.
   *
   * @param directory - Directory to scan
   * @returns Number of tools discovered and registered
   */
  async autoDiscover(directory: string): Promise<number> {
    logger.info(`Auto-discovering tools in: ${directory}`);

    let discovered = 0;

    try {
      const files = await this.scanDirectory(directory);

      for (const file of files) {
        try {
          const module = await import(file);

          // Look for default export or named exports that extend BaseTool
          const ToolClass = module.default || Object.values(module).find(
            (exp: any) => exp.prototype instanceof BaseTool
          );

          if (ToolClass && typeof ToolClass === 'function') {
            const tool = new (ToolClass as any)() as BaseTool;
            this.register(tool, { override: false });
            discovered++;
          }
        } catch (error) {
          logger.error(`Failed to load tool from ${file}`, { error });
        }
      }

      logger.info(`Auto-discovery complete: ${discovered} tools registered`);
    } catch (error) {
      logger.error('Auto-discovery failed', { error, directory });
      throw error;
    }

    return discovered;
  }

  /**
   * Recursively scan directory for tool files
   *
   * @param directory - Directory to scan
   * @returns Array of tool file paths
   */
  private async scanDirectory(directory: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if it's a tool file
          const ext = extname(entry.name);
          const isTool = entry.name.endsWith('.tool.ts') || entry.name.endsWith('.tool.js');

          if (isTool && (ext === '.ts' || ext === '.js')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to scan directory: ${directory}`, { error });
    }

    return files;
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    const count = this.tools.size;
    this.tools.clear();
    logger.info(`Registry cleared: ${count} tools removed`);
  }

  /**
   * Validate all registered tools
   *
   * Checks that all tools have valid schemas and metadata
   *
   * @returns Validation results
   */
  validateAll(): Array<{ name: string; valid: boolean; errors: string[] }> {
    const results: Array<{ name: string; valid: boolean; errors: string[] }> = [];

    for (const [name, entry] of this.tools) {
      const errors: string[] = [];
      const tool = entry.tool;

      // Check metadata
      if (!tool.metadata.name) {
        errors.push('Missing metadata.name');
      }

      if (!tool.metadata.description) {
        errors.push('Missing metadata.description');
      }

      if (!tool.metadata.category) {
        errors.push('Missing metadata.category');
      }

      // Check schema
      if (!tool.schema) {
        errors.push('Missing schema');
      }

      // Check executeImpl method
      if (typeof tool['executeImpl'] !== 'function') {
        errors.push('Missing executeImpl method');
      }

      results.push({
        name,
        valid: errors.length === 0,
        errors,
      });
    }

    return results;
  }
}

/**
 * Singleton instance for convenience
 */
export const toolRegistry = ToolRegistry.getInstance();
