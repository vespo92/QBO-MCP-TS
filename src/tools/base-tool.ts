import { z } from 'zod';
import type { MCPToolResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { QBOError, ValidationError } from '../errors/index.js';
import { ErrorBuilder } from '../errors/builder.js';

/**
 * Tool metadata interface
 */
export interface ToolMetadata {
  name: string;
  description: string;
  category: 'invoice' | 'expense' | 'report' | 'customer' | 'automation' | 'utility';
  tags?: string[];
  examples?: Array<{
    description: string;
    params: Record<string, unknown>;
  }>;
}

/**
 * Tool execution context
 */
export interface ToolContext {
  userId?: string;
  companyId?: string;
  requestId?: string;
  startTime: number;
}

/**
 * Tool execution result
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
    details?: unknown;
  };
  metadata?: {
    executionTime: number;
    cached: boolean;
    [key: string]: unknown;
  };
}

/**
 * Abstract base class for all MCP tools
 *
 * Provides common functionality for:
 * - Parameter validation using Zod schemas
 * - Standardized error handling
 * - Execution logging and metrics
 * - Result formatting
 *
 * @abstract
 * @example
 * ```typescript
 * class GetInvoicesTool extends BaseTool<GetInvoicesParams, QBOInvoice[]> {
 *   metadata = {
 *     name: 'get_invoices',
 *     description: 'Query invoices from QuickBooks',
 *     category: 'invoice' as const
 *   };
 *
 *   schema = GetInvoicesSchema;
 *
 *   async executeImpl(params: GetInvoicesParams): Promise<QBOInvoice[]> {
 *     return this.invoiceService.getInvoices(params);
 *   }
 * }
 * ```
 */
export abstract class BaseTool<TParams = unknown, TResult = unknown> {
  /**
   * Tool metadata (name, description, category, etc.)
   */
  abstract metadata: ToolMetadata;

  /**
   * Zod schema for parameter validation
   */
  abstract schema: z.ZodSchema<TParams>;

  /**
   * Tool implementation - override this in subclasses
   *
   * @param params - Validated parameters
   * @param context - Execution context
   * @returns Tool result
   */
  protected abstract executeImpl(
    params: TParams,
    context: ToolContext
  ): Promise<TResult>;

  /**
   * Execute the tool with automatic validation, error handling, and logging
   *
   * @param params - Raw parameters from MCP client
   * @param context - Optional execution context
   * @returns Standardized tool response
   */
  async execute(
    params: unknown,
    context?: Partial<ToolContext>
  ): Promise<MCPToolResponse<TResult>> {
    const ctx: ToolContext = {
      requestId: this.generateRequestId(),
      startTime: Date.now(),
      ...context,
    };

    logger.info(`Executing tool: ${this.metadata.name}`, {
      tool: this.metadata.name,
      requestId: ctx.requestId,
      params: this.sanitizeForLogging(params),
    });

    try {
      // Validate parameters
      const validated = this.validate(params);
      if (!validated.success) {
        throw validated.error;
      }

      // Execute implementation
      const result = await this.executeImpl(validated.data, ctx);

      // Calculate execution time
      const executionTime = Date.now() - ctx.startTime;

      logger.info(`Tool executed successfully: ${this.metadata.name}`, {
        tool: this.metadata.name,
        requestId: ctx.requestId,
        executionTime,
      });

      return this.formatSuccess(result, {
        executionTime,
        cached: false,
      });
    } catch (error) {
      const executionTime = Date.now() - ctx.startTime;

      logger.error(`Tool execution failed: ${this.metadata.name}`, {
        tool: this.metadata.name,
        requestId: ctx.requestId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      return this.handleError(error, ctx);
    }
  }

  /**
   * Validate parameters using the tool's Zod schema
   *
   * @param params - Raw parameters to validate
   * @returns Validation result
   */
  validate(params: unknown): { success: true; data: TParams } | { success: false; error: ValidationError } {
    try {
      const data = this.schema.parse(params);
      return { success: true, data };
    } catch (err) {
      if (err instanceof z.ZodError) {
        const validationError = new ValidationError(
          'Invalid parameters',
          'VALIDATION_ERROR',
          'Check the required parameters and their formats',
          err.errors.map((e: z.ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          }))
        );
        return { success: false, error: validationError };
      }

      const validationError = new ValidationError(
        err instanceof Error ? err.message : 'Validation failed'
      );
      return { success: false, error: validationError };
    }
  }

  /**
   * Format successful execution result
   *
   * @param data - Result data
   * @param metadata - Execution metadata
   * @returns Formatted response
   */
  protected formatSuccess(
    data: TResult,
    metadata?: Record<string, unknown>
  ): MCPToolResponse<TResult> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        ...metadata,
      } as any,
    };
  }

  /**
   * Handle errors and format error response
   *
   * @param error - Error that occurred
   * @param context - Execution context
   * @returns Formatted error response
   */
  protected handleError(
    error: unknown,
    context: ToolContext
  ): MCPToolResponse<never> {
    let qboError: QBOError;

    if (error instanceof QBOError) {
      qboError = error;
    } else if (error instanceof Error) {
      qboError = ErrorBuilder.fromError(error);
    } else {
      qboError = new QBOError(
        'An unexpected error occurred',
        'QBO_UNKNOWN',
        'Please try again or contact support'
      );
    }

    return {
      success: false,
      error: qboError.message,
      suggestion: qboError.suggestion,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      } as any,
    };
  }

  /**
   * Format result data as human-readable text
   * Override this method for custom formatting
   *
   * @param data - Result data
   * @returns Formatted text
   */
  protected formatResultText(data: TResult): string {
    if (Array.isArray(data)) {
      return `Found ${data.length} results:\n\n${JSON.stringify(data, null, 2)}`;
    }

    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  }

  /**
   * Format error as human-readable text
   *
   * @param error - QBO error
   * @returns Formatted error text
   */
  protected formatErrorText(error: QBOError): string {
    let text = `❌ Error: ${error.message}`;

    if (error.code) {
      text += `\n\n📋 Error Code: ${error.code}`;
    }

    if (error.suggestion) {
      text += `\n\n💡 Suggestion: ${error.suggestion}`;
    }

    if (error.details) {
      text += `\n\n📝 Details:\n${JSON.stringify(error.details, null, 2)}`;
    }

    return text;
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   *
   * @param params - Parameters to sanitize
   * @returns Sanitized parameters
   */
  protected sanitizeForLogging(params: unknown): unknown {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const sanitized = { ...params } as Record<string, unknown>;
    const sensitiveFields = ['token', 'password', 'secret', 'apiKey'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * Generate unique request ID for tracking
   *
   * @returns Request ID
   */
  protected generateRequestId(): string {
    return `${this.metadata.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get tool definition for MCP registration
   *
   * @returns Tool definition
   */
  getDefinition() {
    return {
      name: this.metadata.name,
      description: this.metadata.description,
      inputSchema: {
        type: 'object',
        properties: this.getSchemaProperties(),
        required: this.getRequiredFields(),
      },
    };
  }

  /**
   * Extract properties from Zod schema for MCP tool definition
   *
   * @returns Schema properties
   */
  private getSchemaProperties(): Record<string, unknown> {
    // This is a simplified version - you might want to use a library
    // like zod-to-json-schema for more complex schemas
    const shape = (this.schema as any)._def?.shape?.();

    if (!shape) {
      return {};
    }

    const properties: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(shape)) {
      const zodType = (value as any)._def;
      properties[key] = {
        type: this.mapZodTypeToJsonSchema(zodType),
        description: zodType.description || '',
      };
    }

    return properties;
  }

  /**
   * Get required fields from Zod schema
   *
   * @returns Array of required field names
   */
  private getRequiredFields(): string[] {
    const shape = (this.schema as any)._def?.shape?.();

    if (!shape) {
      return [];
    }

    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodType = (value as any)._def;
      // If not optional, it's required
      if (zodType.typeName !== 'ZodOptional') {
        required.push(key);
      }
    }

    return required;
  }

  /**
   * Map Zod type to JSON Schema type
   *
   * @param zodDef - Zod type definition
   * @returns JSON Schema type
   */
  private mapZodTypeToJsonSchema(zodDef: any): string {
    const typeMap: Record<string, string> = {
      ZodString: 'string',
      ZodNumber: 'number',
      ZodBoolean: 'boolean',
      ZodArray: 'array',
      ZodObject: 'object',
      ZodDate: 'string',
    };

    return typeMap[zodDef.typeName] || 'string';
  }
}
