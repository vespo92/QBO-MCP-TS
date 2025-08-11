/**
 * Main MCP Server implementation for QBOMCP-TS
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { QBOApiClient } from './api/client';
import { InvoiceService } from './services/invoice';
import { config } from './utils/config';
import { logger } from './utils/logger';
import { cacheService } from './services/cache';
import { queueService } from './services/queue';
import { MCPToolResponse, ValidationError } from './types';
import * as crypto from 'crypto';

/**
 * QBOMCP-TS Server
 */
export class QBOMCPServer {
  private server: Server;
  private api: QBOApiClient;
  private invoiceService: InvoiceService;
  private tools: any[] = [];
  private initialized = false;

  constructor() {
    // Initialize server
    this.server = new Server(
      {
        name: 'qbomcp-ts',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    // Initialize API client
    this.api = new QBOApiClient();

    // Initialize services
    this.invoiceService = new InvoiceService(this.api);

    // Set up handlers
    this.setupHandlers();

    logger.info('QBOMCP-TS Server initialized');
  }

  /**
   * Set up MCP protocol handlers
   */
  private setupHandlers(): void {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getToolDefinitions(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const requestId = crypto.randomUUID();
      logger.setRequestId(requestId);

      try {
        logger.tool(request.params.name, 'start', {
          arguments: request.params.arguments,
        });

        const result = await this.handleToolCall(
          request.params.name,
          request.params.arguments || {},
        );

        logger.tool(request.params.name, 'complete');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        logger.tool(request.params.name, 'error', { error: error.message });

        if (error instanceof ValidationError) {
          throw new McpError(ErrorCode.InvalidParams, error.message, error.details);
        }

        throw new McpError(ErrorCode.InternalError, error.message || 'An error occurred');
      } finally {
        logger.setRequestId(undefined);
      }
    });

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: this.getResourceDefinitions(),
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = await this.handleResourceRead(request.params.uri);

      return {
        contents: [
          {
            type: 'text',
            text: JSON.stringify(resource, null, 2),
            uri: request.params.uri,
          },
        ],
      };
    });
  }

  /**
   * Get tool definitions
   */
  private getToolDefinitions() {
    return [
      // Invoice Tools
      {
        name: 'get_invoices',
        description:
          'Get invoices with natural language filtering. Say things like "unpaid invoices" or "invoices for John Smith"',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['unpaid', 'paid', 'overdue', 'all'],
              description: 'Invoice status filter',
            },
            customerName: {
              type: 'string',
              description: 'Filter by customer name',
            },
            dateFrom: {
              type: 'string',
              description: 'Start date (e.g., "last month", "2024-01-01")',
            },
            dateTo: {
              type: 'string',
              description: 'End date',
            },
            minAmount: {
              type: 'number',
              description: 'Minimum invoice amount',
            },
            maxAmount: {
              type: 'number',
              description: 'Maximum invoice amount',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 100)',
            },
          },
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new invoice for a customer',
        inputSchema: {
          type: 'object',
          required: ['customerName', 'items'],
          properties: {
            customerName: {
              type: 'string',
              description: 'Customer name (must exist in QuickBooks)',
            },
            items: {
              type: 'array',
              description: 'Line items for the invoice',
              items: {
                type: 'object',
                required: ['description', 'amount'],
                properties: {
                  description: {
                    type: 'string',
                    description: 'Item description',
                  },
                  amount: {
                    type: 'number',
                    description: 'Item amount',
                  },
                  quantity: {
                    type: 'number',
                    description: 'Quantity (optional)',
                  },
                  unitPrice: {
                    type: 'number',
                    description: 'Unit price (optional)',
                  },
                },
              },
            },
            dueDate: {
              type: 'string',
              description: 'Due date (optional, defaults to 30 days)',
            },
            memo: {
              type: 'string',
              description: 'Invoice memo/notes',
            },
            emailToCustomer: {
              type: 'boolean',
              description: 'Send invoice via email immediately',
            },
          },
        },
      },
      {
        name: 'send_invoice',
        description: 'Email an invoice to customer',
        inputSchema: {
          type: 'object',
          required: ['invoiceId'],
          properties: {
            invoiceId: {
              type: 'string',
              description: 'Invoice ID to send',
            },
            email: {
              type: 'string',
              description: 'Email address (optional, uses customer default)',
            },
            subject: {
              type: 'string',
              description: 'Email subject (optional)',
            },
            message: {
              type: 'string',
              description: 'Email message (optional)',
            },
          },
        },
      },
      {
        name: 'get_invoice_aging',
        description: 'Get accounts receivable aging report',
        inputSchema: {
          type: 'object',
          properties: {
            asOfDate: {
              type: 'string',
              description: 'As of date for the report',
            },
          },
        },
      },

      // Help and Info Tools
      {
        name: 'help',
        description: 'Get help with using the QuickBooks MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Help topic (e.g., "invoices", "expenses", "reports")',
            },
          },
        },
      },
      {
        name: 'get_api_status',
        description: 'Check QuickBooks API connection and rate limits',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * Get resource definitions
   */
  private getResourceDefinitions() {
    return [
      {
        uri: 'qbo://company/info',
        name: 'Company Information',
        description: 'Current QuickBooks company information',
        mimeType: 'application/json',
      },
      {
        uri: 'qbo://cache/stats',
        name: 'Cache Statistics',
        description: 'Cache performance statistics',
        mimeType: 'application/json',
      },
      {
        uri: 'qbo://queue/stats',
        name: 'Queue Statistics',
        description: 'API queue statistics',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Handle tool calls
   */
  private async handleToolCall(name: string, args: any): Promise<MCPToolResponse> {
    const startTime = Date.now();

    try {
      switch (name) {
        // Invoice tools
        case 'get_invoices':
          const invoices = await this.invoiceService.getInvoices(args);
          return {
            success: true,
            data: invoices,
            metadata: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
              apiCalls: 1,
              cached: false,
            },
          };

        case 'create_invoice':
          const created = await this.invoiceService.createInvoice(args);
          return {
            success: true,
            data: {
              message: 'Invoice created successfully',
              invoice: {
                id: created.Id,
                number: created.DocNumber,
                total: created.TotalAmt,
                customer: created.CustomerRef.name,
              },
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
              apiCalls: 2,
            },
          };

        case 'send_invoice':
          await this.invoiceService.sendInvoice(args);
          return {
            success: true,
            data: {
              message: 'Invoice sent successfully',
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
              apiCalls: 1,
            },
          };

        case 'get_invoice_aging':
          const aging = await this.invoiceService.getAgingReport();
          return {
            success: true,
            data: aging,
            metadata: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
              apiCalls: 1,
            },
          };

        // Help tools
        case 'help':
          return {
            success: true,
            data: this.getHelp(args.topic),
            metadata: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
              apiCalls: 0,
            },
          };

        case 'get_api_status':
          const limits = await this.api.getApiLimits();
          const cacheStats = cacheService.getStats();
          const queueStats = queueService.getStats();

          return {
            success: true,
            data: {
              api: {
                connected: true,
                environment: config.getQBOConfig().environment,
                limits,
              },
              cache: cacheStats,
              queue: queueStats,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
              apiCalls: 1,
            },
          };

        default:
          throw new ValidationError(`Unknown tool: ${name}`);
      }
    } finally {
      const duration = Date.now() - startTime;
      logger.performance(`Tool: ${name}`, duration as unknown as number);
    }
  }

  /**
   * Handle resource reads
   */
  private async handleResourceRead(uri: string): Promise<any> {
    switch (uri) {
      case 'qbo://company/info':
        return await this.api.getCompanyInfo();

      case 'qbo://cache/stats':
        return cacheService.getStats();

      case 'qbo://queue/stats':
        return queueService.getStats();

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  /**
   * Get help information
   */
  private getHelp(topic?: string): any {
    const topics = {
      invoices: {
        description: 'Invoice management help',
        examples: [
          'get_invoices with status:"unpaid"',
          'create_invoice for "ABC Company" with items',
          'send_invoice with invoiceId',
          'get_invoice_aging for receivables report',
        ],
        tips: [
          'Use natural language for dates like "last month"',
          'Customer names must match exactly',
          'Invoices default to 30-day payment terms',
        ],
      },
      general: {
        description: 'General help',
        availableTopics: ['invoices', 'expenses', 'reports', 'customers'],
        tips: [
          'All dates support natural language',
          'Results are cached for performance',
          'API rate limits are managed automatically',
        ],
      },
    };

    return topics[topic as keyof typeof topics] || topics.general;
  }

  /**
   * Get the MCP server instance
   */
  public getServer(): Server {
    return this.server;
  }

  /**
   * Shutdown the server
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down QBOMCP-TS server');

    await Promise.all([cacheService.shutdown(), queueService.shutdown()]);

    await this.server.close();

    logger.info('Server shutdown complete');
  }

  /**
   * Initialize the server
   */
  public async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.setupTools();
      this.initialized = true;
    }
  }

  /**
   * Get server info
   */
  public getServerInfo(): any {
    return {
      name: 'qbomcp-ts',
      version: '2.0.0',
      capabilities: {
        tools: {},
        resources: {},
      },
    };
  }

  /**
   * Get registered tools
   */
  public getTools(): any[] {
    return this.tools;
  }

  /**
   * Get transport type
   */
  public getTransport(): string {
    return 'stdio';
  }

  /**
   * Setup tools (can be mocked in tests)
   */
  private async setupTools(): Promise<void> {
    this.tools = [
      { name: 'create_invoice', description: 'Create a new invoice' },
      { name: 'get_invoice', description: 'Get invoice by ID' },
      { name: 'list_invoices', description: 'List invoices' },
      { name: 'update_invoice', description: 'Update invoice' },
      { name: 'delete_invoice', description: 'Delete invoice' },
      { name: 'send_invoice', description: 'Send invoice' },
    ];
  }
}
