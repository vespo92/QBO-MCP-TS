import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { z } from 'zod';
import type { QBOCustomer } from '../../types/index.js';
import { CustomerService } from '../../services/customer.service.js';
import { logger } from '../../utils/logger.js';

const customerService = new CustomerService();

const GetCustomersSchema = z.object({
  active: z.boolean().optional(),
  hasBalance: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().max(100).optional(),
});

type GetCustomersParams = z.infer<typeof GetCustomersSchema>;

/**
 * Get Customers Tool
 *
 * Query customers from QuickBooks with search and filtering.
 *
 * @example
 * ```typescript
 * const tool = new GetCustomersTool();
 * const result = await tool.execute({
 *   hasBalance: true,
 *   search: 'Acme'
 * });
 * ```
 */
export class GetCustomersTool extends BaseTool<GetCustomersParams, QBOCustomer[]> {
  metadata: ToolMetadata = {
    name: 'get_customers',
    description: 'Query customers from QuickBooks with search and filtering options',
    category: 'customer',
    tags: ['customers', 'accounts-receivable', 'query'],
    examples: [
      {
        description: 'Get all active customers',
        params: {
          active: true,
        },
      },
      {
        description: 'Get customers with outstanding balances',
        params: {
          hasBalance: true,
        },
      },
      {
        description: 'Search for customer by name',
        params: {
          search: 'Acme',
        },
      },
    ],
  };

  schema = GetCustomersSchema;

  protected async executeImpl(params: GetCustomersParams): Promise<QBOCustomer[]> {
    logger.info('Fetching customers with filters', params);

    const customers = await customerService.getCustomers(params);

    logger.info(`Retrieved ${customers.length} customers`);

    return customers;
  }

  protected override formatResultText(customers: QBOCustomer[]): string {
    if (customers.length === 0) {
      return '📭 No customers found matching the criteria.';
    }

    let text = `👥 Found ${customers.length} customer${customers.length === 1 ? '' : 's'}:\n\n`;

    for (const customer of customers) {
      text += `👤 ${customer.DisplayName}\n`;

      if (customer.CompanyName && customer.CompanyName !== customer.DisplayName) {
        text += `   Company: ${customer.CompanyName}\n`;
      }

      if (customer.PrimaryEmailAddr?.Address) {
        text += `   📧 ${customer.PrimaryEmailAddr.Address}\n`;
      }

      if (customer.PrimaryPhone?.FreeFormNumber) {
        text += `   📞 ${customer.PrimaryPhone.FreeFormNumber}\n`;
      }

      if (customer.Balance !== undefined) {
        const balanceEmoji = customer.Balance > 0 ? '💰' : '✅';
        text += `   ${balanceEmoji} Balance: $${customer.Balance.toFixed(2)}\n`;
      }

      text += `   🆔 ID: ${customer.Id}\n`;
      text += '\n';
    }

    const totalBalance = customers.reduce((sum, cust) => sum + (cust.Balance || 0), 0);
    if (totalBalance > 0) {
      text += `💵 Total Outstanding: $${totalBalance.toFixed(2)}`;
    }

    return text;
  }
}

export default GetCustomersTool;
