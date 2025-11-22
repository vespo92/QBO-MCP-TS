/**
 * Account Service - Chart of Accounts management
 */

import type { QBOClient } from '../api/client.js';
import type {
  QBOAccount,
  QBOAccountInput,
  GetAccountsParams,
  CreateAccountParams,
  UpdateAccountParams,
} from '../types/entities/core/account.types.js';
import { logger } from '../utils/logger.js';
import type { ICacheService } from '../types/index.js';

/**
 * Service for managing Chart of Accounts
 */
export class AccountService {
  private client: QBOClient;
  private cache?: ICacheService;
  private readonly CACHE_PREFIX = 'account:';
  private readonly CACHE_TTL = 3600; // 1 hour for relatively static data

  constructor(client: QBOClient, cache?: ICacheService) {
    this.client = client;
    this.cache = cache;
  }

  /**
   * Get accounts with optional filtering
   */
  async getAccounts(params: GetAccountsParams = {}): Promise<QBOAccount[]> {
    const { accountType, classification, active, nameContains, limit = 1000 } = params;

    // Build query
    const conditions: string[] = [];

    if (accountType) {
      conditions.push(`AccountType = '${accountType}'`);
    }

    if (classification) {
      conditions.push(`Classification = '${classification}'`);
    }

    if (active !== undefined) {
      conditions.push(`Active = ${active}`);
    }

    if (nameContains) {
      conditions.push(`Name LIKE '%${nameContains}%'`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Account${whereClause} MAXRESULTS ${limit}`;

    logger.debug('Querying accounts', { query });

    const response = await this.client.query<QBOAccount>(query);
    return response.QueryResponse?.Account || [];
  }

  /**
   * Get a single account by ID
   */
  async getAccountById(accountId: string): Promise<QBOAccount | null> {
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get<QBOAccount>(`${this.CACHE_PREFIX}${accountId}`);
      if (cached) {
        logger.debug('Account cache hit', { accountId });
        return cached;
      }
    }

    try {
      const response = await this.client.read<QBOAccount>('account', accountId);
      const account = response.Account;

      // Cache the result
      if (this.cache && account) {
        await this.cache.set(`${this.CACHE_PREFIX}${accountId}`, account, this.CACHE_TTL);
      }

      return account || null;
    } catch (error) {
      logger.error('Failed to get account', { accountId, error });
      return null;
    }
  }

  /**
   * Find account by name
   */
  async findAccountByName(name: string): Promise<QBOAccount | null> {
    const query = `SELECT * FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<QBOAccount>(query);
    return response.QueryResponse?.Account?.[0] || null;
  }

  /**
   * Find account by name (fuzzy match)
   */
  async findAccountByNameFuzzy(name: string): Promise<QBOAccount | null> {
    // Try exact match first
    const exact = await this.findAccountByName(name);
    if (exact) return exact;

    // Try contains match
    const query = `SELECT * FROM Account WHERE Name LIKE '%${name.replace(/'/g, "\\'")}%' MAXRESULTS 10`;
    const response = await this.client.query<QBOAccount>(query);
    const accounts = response.QueryResponse?.Account || [];

    // Return best match (shortest name that contains the search term)
    if (accounts.length > 0) {
      return accounts.sort((a, b) => a.Name.length - b.Name.length)[0];
    }

    return null;
  }

  /**
   * Get accounts by type
   */
  async getAccountsByType(accountType: string): Promise<QBOAccount[]> {
    const query = `SELECT * FROM Account WHERE AccountType = '${accountType}' AND Active = true`;
    const response = await this.client.query<QBOAccount>(query);
    return response.QueryResponse?.Account || [];
  }

  /**
   * Get accounts by classification
   */
  async getAccountsByClassification(classification: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'): Promise<QBOAccount[]> {
    const query = `SELECT * FROM Account WHERE Classification = '${classification}' AND Active = true`;
    const response = await this.client.query<QBOAccount>(query);
    return response.QueryResponse?.Account || [];
  }

  /**
   * Get bank accounts
   */
  async getBankAccounts(): Promise<QBOAccount[]> {
    return this.getAccountsByType('Bank');
  }

  /**
   * Get expense accounts
   */
  async getExpenseAccounts(): Promise<QBOAccount[]> {
    return this.getAccountsByClassification('Expense');
  }

  /**
   * Get income accounts
   */
  async getIncomeAccounts(): Promise<QBOAccount[]> {
    return this.getAccountsByClassification('Revenue');
  }

  /**
   * Get AR accounts
   */
  async getARAccounts(): Promise<QBOAccount[]> {
    return this.getAccountsByType('Accounts Receivable');
  }

  /**
   * Get AP accounts
   */
  async getAPAccounts(): Promise<QBOAccount[]> {
    return this.getAccountsByType('Accounts Payable');
  }

  /**
   * Create a new account
   */
  async createAccount(params: CreateAccountParams): Promise<QBOAccount> {
    const accountInput: QBOAccountInput = {
      Name: params.name,
      AccountType: params.accountType,
      AccountSubType: params.accountSubType as any,
      AcctNum: params.accountNumber,
      Description: params.description,
    };

    // Add parent reference for sub-accounts
    if (params.parentAccountId) {
      accountInput.ParentRef = { value: params.parentAccountId };
    }

    logger.info('Creating account', { name: params.name, type: params.accountType });

    const response = await this.client.create<QBOAccount>('account', accountInput);
    const account = response.Account;

    // Invalidate cache
    if (this.cache) {
      await this.cache.delete(`${this.CACHE_PREFIX}list`);
    }

    return account;
  }

  /**
   * Update an existing account
   */
  async updateAccount(params: UpdateAccountParams): Promise<QBOAccount> {
    // Get current account to get SyncToken
    const current = await this.getAccountById(params.accountId);
    if (!current) {
      throw new Error(`Account not found: ${params.accountId}`);
    }

    const updateData: Partial<QBOAccount> = {
      Id: params.accountId,
      SyncToken: current.SyncToken,
    };

    if (params.name !== undefined) updateData.Name = params.name;
    if (params.description !== undefined) updateData.Description = params.description;
    if (params.accountNumber !== undefined) updateData.AcctNum = params.accountNumber;
    if (params.active !== undefined) updateData.Active = params.active;

    logger.info('Updating account', { accountId: params.accountId });

    const response = await this.client.update<QBOAccount>('account', updateData);
    const account = response.Account;

    // Invalidate cache
    if (this.cache) {
      await this.cache.delete(`${this.CACHE_PREFIX}${params.accountId}`);
      await this.cache.delete(`${this.CACHE_PREFIX}list`);
    }

    return account;
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<number | null> {
    const account = await this.getAccountById(accountId);
    return account?.CurrentBalance ?? null;
  }

  /**
   * Get Chart of Accounts summary
   */
  async getChartOfAccountsSummary(): Promise<{
    total: number;
    byType: Record<string, number>;
    byClassification: Record<string, number>;
  }> {
    const accounts = await this.getAccounts({ active: true });

    const byType: Record<string, number> = {};
    const byClassification: Record<string, number> = {};

    for (const account of accounts) {
      byType[account.AccountType] = (byType[account.AccountType] || 0) + 1;
      if (account.Classification) {
        byClassification[account.Classification] = (byClassification[account.Classification] || 0) + 1;
      }
    }

    return {
      total: accounts.length,
      byType,
      byClassification,
    };
  }
}
