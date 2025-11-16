import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { CreateExpenseSchema, type QBOExpense } from '../../types/index.js';
import type { z } from 'zod';
import { ExpenseService } from '../../services/expense.service.js';
import { logger } from '../../utils/logger.js';

const expenseService = new ExpenseService();

type CreateExpenseParams = z.infer<typeof CreateExpenseSchema>;

/**
 * Create Expense Tool
 *
 * Creates a new expense in QuickBooks with automatic vendor and account lookup.
 *
 * @example
 * ```typescript
 * const tool = new CreateExpenseTool();
 * const result = await tool.execute({
 *   vendorName: 'Office Supplies Inc',
 *   amount: 250.50,
 *   accountName: 'Office Expenses',
 *   description: 'Printer paper and ink',
 *   paymentMethod: 'Credit Card'
 * });
 * ```
 */
export class CreateExpenseTool extends BaseTool<CreateExpenseParams, QBOExpense> {
  metadata: ToolMetadata = {
    name: 'create_expense',
    description: 'Create a new expense in QuickBooks with vendor and account lookup',
    category: 'expense',
    tags: ['expenses', 'accounts-payable', 'create'],
    examples: [
      {
        description: 'Create simple expense',
        params: {
          vendorName: 'Office Depot',
          amount: 149.99,
          accountName: 'Office Supplies',
          description: 'Printer paper',
        },
      },
      {
        description: 'Create expense with payment method',
        params: {
          vendorName: 'Utility Company',
          amount: 350.0,
          accountName: 'Utilities',
          paymentMethod: 'Check',
          referenceNumber: 'CHK-1234',
          description: 'Monthly electricity bill',
        },
      },
    ],
  };

  schema = CreateExpenseSchema;

  protected async executeImpl(params: CreateExpenseParams): Promise<QBOExpense> {
    logger.info('Creating expense', {
      vendor: params.vendorName,
      amount: params.amount,
    });

    const expense = await expenseService.createExpense(params);

    logger.info('Expense created successfully', { id: expense.Id });

    return expense;
  }

  protected override formatResultText(expense: QBOExpense): string {
    let text = `✅ Expense created successfully!\n\n`;

    text += `💳 Expense #${expense.Id}\n`;
    text += `👤 Vendor: ${expense.EntityRef?.name || 'Unknown'}\n`;
    text += `💰 Amount: $${expense.TotalAmt?.toFixed(2) || '0.00'}\n`;
    text += `📅 Date: ${expense.TxnDate}\n`;
    text += `💵 Payment: ${expense.PaymentType || 'N/A'}\n`;

    if (expense.DocNumber) {
      text += `🔢 Reference: ${expense.DocNumber}\n`;
    }

    if (expense.Line && expense.Line.length > 0) {
      const line = expense.Line[0];
      if (line.Description) {
        text += `📝 Description: ${line.Description}\n`;
      }
      if (line.AccountBasedExpenseLineDetail?.AccountRef?.name) {
        text += `📂 Account: ${line.AccountBasedExpenseLineDetail.AccountRef.name}\n`;
      }
    }

    text += `\n🔗 Expense ID: ${expense.Id}`;

    return text;
  }
}

export default CreateExpenseTool;
