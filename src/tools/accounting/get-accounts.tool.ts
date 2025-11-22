/**
 * Get Accounts Tool - Query Chart of Accounts
 */

import { z } from 'zod';
import { BaseTool, type ToolMetadata, type ToolContext } from '../base-tool.js';
import { AccountService } from '../../services/account.service.js';
import type { QBOClient } from '../../api/client.js';
import type { QBOAccount } from '../../types/entities/core/account.types.js';
import { GetAccountsSchema, type GetAccountsParams } from '../../types/entities/core/account.types.js';

/**
 * Response structure for account listing
 */
interface GetAccountsResponse {
  summary: string;
  count: number;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    subType?: string;
    classification?: string;
    balance: string;
    accountNumber?: string;
    active: boolean;
  }>;
}

/**
 * Tool for querying Chart of Accounts
 */
export class GetAccountsTool extends BaseTool<GetAccountsParams, GetAccountsResponse> {
  metadata: ToolMetadata = {
    name: 'accounting_get_accounts',
    description: 'Query Chart of Accounts. Filter by account type, classification, or name. Returns account details including balances.',
    category: 'accounting',
    tags: ['accounts', 'chart-of-accounts', 'gl', 'read'],
    examples: [
      {
        description: 'Get all bank accounts',
        params: { accountType: 'Bank' },
      },
      {
        description: 'Get expense accounts',
        params: { classification: 'Expense' },
      },
      {
        description: 'Search accounts by name',
        params: { nameContains: 'Office' },
      },
    ],
  };

  schema = GetAccountsSchema;

  private accountService: AccountService;

  constructor(client: QBOClient) {
    super();
    this.accountService = new AccountService(client);
  }

  protected async executeImpl(
    params: GetAccountsParams,
    context: ToolContext
  ): Promise<GetAccountsResponse> {
    const accounts = await this.accountService.getAccounts(params);

    const formattedAccounts = accounts.map(account => ({
      id: account.Id,
      name: account.Name,
      type: account.AccountType,
      subType: account.AccountSubType,
      classification: account.Classification,
      balance: this.formatCurrency(account.CurrentBalance || 0),
      accountNumber: account.AcctNum,
      active: account.Active !== false,
    }));

    // Calculate totals by classification
    const totalByClassification: Record<string, number> = {};
    for (const account of accounts) {
      if (account.Classification) {
        totalByClassification[account.Classification] =
          (totalByClassification[account.Classification] || 0) + (account.CurrentBalance || 0);
      }
    }

    let summary = `Found ${accounts.length} account(s)`;
    if (params.accountType) {
      summary += ` of type "${params.accountType}"`;
    }
    if (params.classification) {
      summary += ` with classification "${params.classification}"`;
    }

    return {
      summary,
      count: accounts.length,
      accounts: formattedAccounts,
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}
