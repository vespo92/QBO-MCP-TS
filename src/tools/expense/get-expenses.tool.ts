import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { GetExpensesSchema, type QBOExpense } from '../../types/index.js';
import type { z } from 'zod';
import { ExpenseService } from '../../services/expense.service.js';
import { logger } from '../../utils/logger.js';

const expenseService = new ExpenseService();

type GetExpensesParams = z.infer<typeof GetExpensesSchema>;

/**
 * Get Expenses Tool
 *
 * Query expenses from QuickBooks with filtering options.
 * Supports filtering by date, vendor, account, and amount range.
 *
 * @example
 * ```typescript
 * const tool = new GetExpensesTool();
 * const result = await tool.execute({
 *   dateFrom: 'this month',
 *   vendorName: 'Office Supplies',
 *   minAmount: 100
 * });
 * ```
 */
export class GetExpensesTool extends BaseTool<GetExpensesParams, QBOExpense[]> {
  metadata: ToolMetadata = {
    name: 'get_expenses',
    description: 'Query expenses from QuickBooks with filtering options (date, vendor, account, amount)',
    category: 'expense',
    tags: ['expenses', 'accounts-payable', 'query'],
    examples: [
      {
        description: 'Get all expenses for current month',
        params: {
          dateFrom: 'this month',
          dateTo: 'today',
        },
      },
      {
        description: 'Get expenses from specific vendor',
        params: {
          vendorName: 'Office Supplies Inc',
          minAmount: 100,
        },
      },
    ],
  };

  schema = GetExpensesSchema;

  protected async executeImpl(params: GetExpensesParams): Promise<QBOExpense[]> {
    logger.info('Fetching expenses with filters', params);

    const expenses = await expenseService.getExpenses(params);

    logger.info(`Retrieved ${expenses.length} expenses`);

    return expenses;
  }

  protected override formatResultText(expenses: QBOExpense[]): string {
    if (expenses.length === 0) {
      return '📭 No expenses found matching the criteria.';
    }

    let text = `💳 Found ${expenses.length} expense${expenses.length === 1 ? '' : 's'}:\n\n`;

    for (const expense of expenses) {
      text += `📄 Expense #${expense.Id}\n`;
      text += `   Vendor: ${expense.EntityRef?.name || 'Unknown'}\n`;
      text += `   Amount: $${expense.TotalAmt?.toFixed(2) || '0.00'}\n`;
      text += `   Date: ${expense.TxnDate}\n`;
      text += `   Payment: ${expense.PaymentType || 'N/A'}\n`;

      if (expense.Line && expense.Line.length > 0) {
        const description = expense.Line[0].Description;
        if (description) {
          text += `   Description: ${description}\n`;
        }
      }

      text += '\n';
    }

    const totalAmount = expenses.reduce((sum, exp) => sum + (exp.TotalAmt || 0), 0);
    text += `💰 Total Amount: $${totalAmount.toFixed(2)}`;

    return text;
  }
}

export default GetExpensesTool;
