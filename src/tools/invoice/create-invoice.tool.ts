import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { CreateInvoiceSchema, type QBOInvoice } from '../../types/index.js';
import type { z } from 'zod';
import { InvoiceService } from '../../services/invoice.js';
import { logger } from '../../utils/logger.js';

// Create service instance
const invoiceService = new InvoiceService();

/**
 * Create invoice tool parameters
 */
type CreateInvoiceParams = z.infer<typeof CreateInvoiceSchema>;

/**
 * Create Invoice Tool
 *
 * Creates a new invoice in QuickBooks with line items.
 * Supports natural language due dates and optional auto-email.
 *
 * Features:
 * - Multiple line items with descriptions and amounts
 * - Natural language due dates ("net 30", "next Friday", etc.)
 * - Optional automatic email to customer
 * - Automatic customer lookup by name
 *
 * @example
 * ```typescript
 * const tool = new CreateInvoiceTool();
 * const result = await tool.execute({
 *   customerName: 'Acme Corp',
 *   items: [
 *     { description: 'Web Design', amount: 2500, quantity: 1 }
 *   ],
 *   dueDate: 'net 30',
 *   emailToCustomer: true
 * });
 * ```
 */
export class CreateInvoiceTool extends BaseTool<CreateInvoiceParams, QBOInvoice> {
  metadata: ToolMetadata = {
    name: 'create_invoice',
    description: 'Create a new invoice in QuickBooks with line items and optional auto-email',
    category: 'invoice',
    tags: ['invoices', 'accounts-receivable', 'create'],
    examples: [
      {
        description: 'Create simple invoice',
        params: {
          customerName: 'John Doe',
          items: [{ description: 'Consulting Services', amount: 1500 }],
          dueDate: 'net 30',
        },
      },
      {
        description: 'Create invoice with multiple items and email',
        params: {
          customerName: 'Acme Corp',
          items: [
            { description: 'Web Design', amount: 2500, quantity: 1 },
            { description: 'Hosting (1 year)', amount: 600, quantity: 1 },
          ],
          dueDate: 'next Friday',
          emailToCustomer: true,
          memo: 'Thank you for your business!',
        },
      },
    ],
  };

  schema = CreateInvoiceSchema;

  /**
   * Execute the create invoice operation
   *
   * @param params - Validated invoice parameters
   * @param context - Execution context
   * @returns Created invoice
   */
  protected async executeImpl(params: CreateInvoiceParams): Promise<QBOInvoice> {
    logger.info('Creating invoice', {
      customer: params.customerName,
      itemCount: params.items.length,
      total: params.items.reduce((sum, item) => sum + item.amount, 0),
    });

    try {
      const invoice = await invoiceService.createInvoice({
        customerName: params.customerName,
        lineItems: params.items.map((item) => ({
          description: item.description,
          amount: item.amount,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
        })),
        dueDate: params.dueDate,
        memo: params.memo,
        autoEmail: params.emailToCustomer || false,
      });

      logger.info('Invoice created successfully', {
        id: invoice.Id,
        docNumber: invoice.DocNumber,
        total: invoice.TotalAmt,
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to create invoice', { error });
      throw error;
    }
  }

  /**
   * Format invoice creation result for display
   *
   * @param invoice - Created invoice
   * @returns Formatted text
   */
  protected override formatResultText(invoice: QBOInvoice): string {
    let text = `✅ Invoice created successfully!\n\n`;

    text += `📄 Invoice #${invoice.DocNumber || invoice.Id}\n`;
    text += `👤 Customer: ${invoice.CustomerRef?.name || 'Unknown'}\n`;
    text += `💰 Amount: $${invoice.TotalAmt?.toFixed(2) || '0.00'}\n`;
    text += `📅 Date: ${invoice.TxnDate}\n`;

    if (invoice.DueDate) {
      text += `⏰ Due: ${invoice.DueDate}\n`;
    }

    if (invoice.EmailStatus === 'EmailSent') {
      text += `✉️  Email sent to customer\n`;
    }

    text += `\n🔗 Invoice ID: ${invoice.Id}`;

    return text;
  }
}

/**
 * Export default instance for convenience
 */
export default CreateInvoiceTool;
