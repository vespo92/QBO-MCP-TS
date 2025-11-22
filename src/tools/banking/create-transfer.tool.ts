/**
 * Create Transfer Tool - Transfer funds between accounts
 */

import { z } from 'zod';
import { BaseTool, type ToolMetadata, type ToolContext } from '../base-tool.js';
import { BankingService } from '../../services/banking.service.js';
import type { QBOClient } from '../../api/client.js';
import { CreateTransferSchema, type CreateTransferParams } from '../../types/entities/banking/transfer.types.js';

/**
 * Response structure for transfer creation
 */
interface CreateTransferResponse {
  success: boolean;
  message: string;
  transfer: {
    id: string;
    fromAccount: string;
    toAccount: string;
    amount: string;
    date: string;
    memo?: string;
  };
}

/**
 * Tool for creating account transfers
 */
export class CreateTransferTool extends BaseTool<CreateTransferParams, CreateTransferResponse> {
  metadata: ToolMetadata = {
    name: 'banking_create_transfer',
    description: 'Transfer funds between bank accounts. Specify source account, destination account, and amount.',
    category: 'banking',
    tags: ['transfer', 'banking', 'accounts', 'write'],
    examples: [
      {
        description: 'Transfer between checking accounts',
        params: {
          fromAccount: 'Business Checking',
          toAccount: 'Savings Account',
          amount: 5000,
        },
      },
      {
        description: 'Transfer with memo',
        params: {
          fromAccount: 'Operating Account',
          toAccount: 'Payroll Account',
          amount: 25000,
          memo: 'Bi-weekly payroll funding',
        },
      },
    ],
  };

  schema = CreateTransferSchema;

  private bankingService: BankingService;

  constructor(client: QBOClient) {
    super();
    this.bankingService = new BankingService(client);
  }

  protected async executeImpl(
    params: CreateTransferParams,
    context: ToolContext
  ): Promise<CreateTransferResponse> {
    const transfer = await this.bankingService.createTransfer(params);

    return {
      success: true,
      message: `Successfully transferred ${this.formatCurrency(params.amount)} from "${params.fromAccount}" to "${params.toAccount}"`,
      transfer: {
        id: transfer.Id,
        fromAccount: transfer.FromAccountRef?.name || params.fromAccount,
        toAccount: transfer.ToAccountRef?.name || params.toAccount,
        amount: this.formatCurrency(transfer.Amount),
        date: transfer.TxnDate,
        memo: transfer.PrivateNote,
      },
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}
