import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { SendInvoiceSchema } from '../../types/index.js';
import type { z } from 'zod';
import { InvoiceService } from '../../services/invoice.js';
import { logger } from '../../utils/logger.js';

// Create service instance
const invoiceService = new InvoiceService();

/**
 * Send invoice tool parameters
 */
type SendInvoiceParams = z.infer<typeof SendInvoiceSchema>;

/**
 * Send Invoice Tool
 *
 * Sends an invoice email to a customer.
 * Supports custom email address, subject, and message.
 *
 * Features:
 * - Send to customer's default email or custom address
 * - Customizable email subject and message
 * - Automatic PDF attachment
 *
 * @example
 * ```typescript
 * const tool = new SendInvoiceTool();
 * const result = await tool.execute({
 *   invoiceId: '123',
 *   email: 'billing@acme.com',
 *   subject: 'Invoice from ABC Company',
 *   message: 'Please find your invoice attached. Payment is due in 30 days.'
 * });
 * ```
 */
export class SendInvoiceTool extends BaseTool<SendInvoiceParams, { success: boolean; message: string }> {
  metadata: ToolMetadata = {
    name: 'send_invoice',
    description: 'Send an invoice email to a customer with optional custom message',
    category: 'invoice',
    tags: ['invoices', 'email', 'communication'],
    examples: [
      {
        description: 'Send invoice with default settings',
        params: {
          invoiceId: '123',
        },
      },
      {
        description: 'Send invoice with custom email and message',
        params: {
          invoiceId: '456',
          email: 'billing@acme.com',
          subject: 'Your Invoice from ABC Company',
          message: 'Thank you for your business! Payment is due in 30 days.',
        },
      },
    ],
  };

  schema = SendInvoiceSchema;

  /**
   * Execute the send invoice operation
   *
   * @param params - Validated send parameters
   * @param context - Execution context
   * @returns Send result
   */
  protected async executeImpl(params: SendInvoiceParams): Promise<{ success: boolean; message: string }> {
    logger.info('Sending invoice', {
      invoiceId: params.invoiceId,
      email: params.email || 'default',
    });

    try {
      await invoiceService.sendInvoice({
        invoiceId: params.invoiceId,
        email: params.email,
        subject: params.subject,
        message: params.message,
      });

      logger.info('Invoice sent successfully', { invoiceId: params.invoiceId });

      return {
        success: true,
        message: `Invoice sent successfully${params.email ? ` to ${params.email}` : ''}`,
      };
    } catch (error) {
      logger.error('Failed to send invoice', { error, invoiceId: params.invoiceId });
      throw error;
    }
  }

  /**
   * Format send result for display
   *
   * @param result - Send result
   * @returns Formatted text
   */
  protected override formatResultText(result: { success: boolean; message: string }): string {
    return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
  }
}

/**
 * Export default instance for convenience
 */
export default SendInvoiceTool;
