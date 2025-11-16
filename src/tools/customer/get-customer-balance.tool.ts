import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { z } from 'zod';
import type { CustomerBalance } from '../../services/customer.service.js';
import { CustomerService } from '../../services/customer.service.js';
import { logger } from '../../utils/logger.js';

const customerService = new CustomerService();

const GetCustomerBalanceSchema = z.object({
  customerId: z.string(),
});

type GetCustomerBalanceParams = z.infer<typeof GetCustomerBalanceSchema>;

/**
 * Get Customer Balance Tool
 *
 * Get detailed balance information for a customer including overdue amounts.
 *
 * @example
 * ```typescript
 * const tool = new GetCustomerBalanceTool();
 * const result = await tool.execute({
 *   customerId: '123'
 * });
 * ```
 */
export class GetCustomerBalanceTool extends BaseTool<GetCustomerBalanceParams, CustomerBalance> {
  metadata: ToolMetadata = {
    name: 'get_customer_balance',
    description: 'Get detailed balance information for a customer including overdue amounts and payment history',
    category: 'customer',
    tags: ['customers', 'accounts-receivable', 'balance'],
    examples: [
      {
        description: 'Get customer balance details',
        params: {
          customerId: '123',
        },
      },
    ],
  };

  schema = GetCustomerBalanceSchema;

  protected async executeImpl(params: GetCustomerBalanceParams): Promise<CustomerBalance> {
    logger.info('Getting customer balance', params);

    const balance = await customerService.getCustomerBalance(params.customerId);

    logger.info('Retrieved customer balance', { customerId: params.customerId });

    return balance;
  }

  protected override formatResultText(balance: CustomerBalance): string {
    let text = `💰 Customer Balance Report\n\n`;

    text += `👤 Customer: ${balance.customerName}\n`;
    text += `🆔 ID: ${balance.customerId}\n\n`;

    text += `📊 Balance Summary:\n`;
    text += `   Total Balance: $${balance.balance.toFixed(2)}\n`;
    text += `   Overdue Amount: $${balance.overdueBalance.toFixed(2)}\n`;
    text += `   Open Invoices: ${balance.openInvoices}\n\n`;

    if (balance.lastPaymentDate) {
      text += `💳 Last Payment:\n`;
      text += `   Date: ${balance.lastPaymentDate}\n`;
      text += `   Amount: $${balance.lastPaymentAmount?.toFixed(2) || '0.00'}\n`;
    } else {
      text += `💳 No payment history\n`;
    }

    // Add status indicator
    if (balance.overdueBalance > 0) {
      text += `\n⚠️  OVERDUE: Customer has $${balance.overdueBalance.toFixed(2)} in overdue invoices`;
    } else if (balance.balance > 0) {
      text += `\n✅ Current: All invoices are current`;
    } else {
      text += `\n✅ Paid in full: No outstanding balance`;
    }

    return text;
  }
}

export default GetCustomerBalanceTool;
