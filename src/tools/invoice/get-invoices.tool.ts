import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { GetInvoicesSchema, type QBOInvoice } from '../../types/index.js';
import type { z } from 'zod';
import { InvoiceService } from '../../services/invoice.js';
import { logger } from '../../utils/logger.js';

// Create service instance
const invoiceService = new InvoiceService();

/**
 * Get invoices tool parameters
 */
type GetInvoicesParams = z.infer<typeof GetInvoicesSchema>;

/**
 * Get Invoices Tool
 *
 * Query invoices from QuickBooks with comprehensive filtering options.
 * Supports filtering by status, customer, date range, and amount range.
 *
 * Features:
 * - Natural language date parsing ("last week", "this month", etc.)
 * - Customer name search
 * - Amount range filtering
 * - Status filtering (unpaid, paid, overdue, all)
 * - Automatic caching for performance
 *
 * @example
 * ```typescript
 * const tool = new GetInvoicesTool();
 * const result = await tool.execute({
 *   status: 'overdue',
 *   dateFrom: 'last month',
 *   dateTo: 'today',
 *   limit: 10
 * });
 * ```
 */
export class GetInvoicesTool extends BaseTool<GetInvoicesParams, QBOInvoice[]> {
  metadata: ToolMetadata = {
    name: 'get_invoices',
    description: 'Query invoices from QuickBooks with filtering options (status, customer, date range, amount)',
    category: 'invoice',
    tags: ['invoices', 'accounts-receivable', 'query'],
    examples: [
      {
        description: 'Get all overdue invoices',
        params: {
          status: 'overdue',
        },
      },
      {
        description: 'Get invoices for specific customer in date range',
        params: {
          customerName: 'Acme Corp',
          dateFrom: 'last month',
          dateTo: 'today',
        },
      },
      {
        description: 'Get high-value unpaid invoices',
        params: {
          status: 'unpaid',
          minAmount: 1000,
          limit: 20,
        },
      },
    ],
  };

  schema = GetInvoicesSchema;

  /**
   * Execute the get invoices operation
   *
   * @param params - Validated query parameters
   * @param context - Execution context
   * @returns Array of matching invoices
   */
  protected async executeImpl(params: GetInvoicesParams): Promise<QBOInvoice[]> {
    logger.info('Fetching invoices with filters', {
      status: params.status,
      customer: params.customerName,
      dateRange: params.dateFrom && params.dateTo ? `${params.dateFrom} to ${params.dateTo}` : undefined,
    });

    try {
      const invoices = await invoiceService.getInvoices(params);

      logger.info(`Retrieved ${invoices.length} invoices`, {
        count: invoices.length,
        filtered: params.status !== 'all',
      });

      return invoices;
    } catch (error) {
      logger.error('Failed to fetch invoices', { error });
      throw error;
    }
  }

  /**
   * Format invoice results for display
   *
   * @param invoices - Array of invoices
   * @returns Formatted text
   */
  protected override formatResultText(invoices: QBOInvoice[]): string {
    if (invoices.length === 0) {
      return '📭 No invoices found matching the criteria.';
    }

    let text = `📄 Found ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}:\n\n`;

    for (const invoice of invoices) {
      const status = this.getInvoiceStatus(invoice);
      const emoji = this.getStatusEmoji(status);

      text += `${emoji} Invoice #${invoice.DocNumber || invoice.Id}\n`;
      text += `   Customer: ${invoice.CustomerRef?.name || 'Unknown'}\n`;
      text += `   Amount: $${invoice.TotalAmt?.toFixed(2) || '0.00'}\n`;
      text += `   Balance: $${invoice.Balance?.toFixed(2) || '0.00'}\n`;
      text += `   Date: ${invoice.TxnDate}\n`;

      if (invoice.DueDate) {
        text += `   Due: ${invoice.DueDate}`;

        if (status === 'overdue') {
          const daysOverdue = this.getDaysOverdue(invoice.DueDate);
          text += ` (${daysOverdue} days overdue)`;
        }

        text += '\n';
      }

      text += '\n';
    }

    // Add summary
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.TotalAmt || 0), 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + (inv.Balance || 0), 0);

    text += `💰 Totals:\n`;
    text += `   Total Amount: $${totalAmount.toFixed(2)}\n`;
    text += `   Total Balance Due: $${totalBalance.toFixed(2)}`;

    return text;
  }

  /**
   * Determine invoice status
   *
   * @param invoice - Invoice object
   * @returns Invoice status
   */
  private getInvoiceStatus(invoice: QBOInvoice): 'paid' | 'unpaid' | 'overdue' | 'partial' {
    const balance = invoice.Balance || 0;

    if (balance === 0) {
      return 'paid';
    }

    if (invoice.DueDate) {
      const dueDate = new Date(invoice.DueDate);
      const now = new Date();

      if (dueDate < now && balance > 0) {
        return 'overdue';
      }
    }

    const total = invoice.TotalAmt || 0;

    if (balance < total && balance > 0) {
      return 'partial';
    }

    return 'unpaid';
  }

  /**
   * Get emoji for invoice status
   *
   * @param status - Invoice status
   * @returns Status emoji
   */
  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      paid: '✅',
      unpaid: '⏳',
      overdue: '🚨',
      partial: '⚠️',
    };

    return emojiMap[status] || '📄';
  }

  /**
   * Calculate days overdue
   *
   * @param dueDate - Invoice due date
   * @returns Days overdue
   */
  private getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = now.getTime() - due.getTime();

    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

/**
 * Export default instance for convenience
 */
export default GetInvoicesTool;
