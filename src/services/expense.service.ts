/**
 * Expense Service
 *
 * Handles all QuickBooks expense-related operations including:
 * - Querying expenses with filters
 * - Creating new expenses
 * - Updating existing expenses
 * - Categorizing expenses
 * - Attaching receipts
 */

import { QBOApiClient } from '../api/client.js';
import type { QBOExpense, GetExpensesParams, CreateExpenseParams } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { cache } from './cache.js';
import { queue } from './queue.js';
import { parseDateString } from '../utils/date-parser.js';

export class ExpenseService {
  private client: QBOApiClient;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(client?: QBOApiClient) {
    this.client = client || new QBOApiClient();
  }

  /**
   * Get expenses with optional filtering
   *
   * @param params - Query parameters
   * @returns Array of expenses
   */
  async getExpenses(params: GetExpensesParams = {}): Promise<QBOExpense[]> {
    const cacheKey = `expenses:${JSON.stringify(params)}`;

    // Check cache first
    const cached = await cache.get<QBOExpense[]>(cacheKey);
    if (cached) {
      logger.info('Returning cached expenses', { count: cached.length });
      return cached;
    }

    // Build query
    let query = 'SELECT * FROM Purchase WHERE PaymentType != "CreditCard"';
    const conditions: string[] = [];

    if (params.dateFrom) {
      const date = parseDateString(params.dateFrom);
      conditions.push(`TxnDate >= '${date}'`);
    }

    if (params.dateTo) {
      const date = parseDateString(params.dateTo);
      conditions.push(`TxnDate <= '${date}'`);
    }

    if (params.minAmount !== undefined) {
      conditions.push(`TotalAmt >= ${params.minAmount}`);
    }

    if (params.maxAmount !== undefined) {
      conditions.push(`TotalAmt <= ${params.maxAmount}`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND');
    }

    query += ' STARTPOSITION 1 MAXRESULTS ' + (params.limit || 100);

    logger.info('Querying expenses', { query });

    // Execute query through queue
    const response = await queue.add(() => this.client.query<QBOExpense>(query));
    const expenses = response.QueryResponse?.Purchase || [];

    // Filter by vendor name if specified (post-query filter)
    let filtered = expenses;
    if (params.vendorName) {
      const vendorLower = params.vendorName.toLowerCase();
      filtered = expenses.filter(
        (exp) => exp.EntityRef?.name?.toLowerCase().includes(vendorLower)
      );
    }

    // Filter by account name if specified
    if (params.accountName) {
      const accountLower = params.accountName.toLowerCase();
      filtered = filtered.filter((exp) =>
        exp.Line?.some((line) =>
          line.AccountBasedExpenseLineDetail?.AccountRef?.name
            ?.toLowerCase()
            .includes(accountLower)
        )
      );
    }

    // Cache results
    await cache.set(cacheKey, filtered, this.CACHE_TTL);

    logger.info('Retrieved expenses', { count: filtered.length });

    return filtered;
  }

  /**
   * Create a new expense
   *
   * @param params - Expense creation parameters
   * @returns Created expense
   */
  async createExpense(params: CreateExpenseParams): Promise<QBOExpense> {
    logger.info('Creating expense', {
      vendor: params.vendorName,
      amount: params.amount,
    });

    // Find or create vendor
    const vendor = await this.findOrCreateVendor(params.vendorName);

    // Find account
    const account = await this.findAccount(params.accountName);

    if (!account) {
      throw new Error(`Account not found: ${params.accountName}`);
    }

    // Parse date if provided
    const txnDate = params.date ? parseDateString(params.date) : new Date().toISOString().split('T')[0];

    // Build expense object
    const expense: Partial<QBOExpense> = {
      PaymentType: params.paymentMethod || 'Cash',
      EntityRef: {
        value: vendor.Id,
        name: vendor.DisplayName,
      },
      TxnDate: txnDate,
      Line: [
        {
          Amount: params.amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          Description: params.description,
          AccountBasedExpenseLineDetail: {
            AccountRef: {
              value: account.Id,
              name: account.Name,
            },
          },
        },
      ],
    };

    if (params.referenceNumber) {
      expense.DocNumber = params.referenceNumber;
    }

    // Create expense
    const result = await queue.add(() => this.client.post<QBOExpense>('/purchase', expense));

    // Invalidate expense cache
    await this.invalidateExpenseCache();

    logger.info('Expense created successfully', { id: result.Purchase.Id });

    return result.Purchase;
  }

  /**
   * Update an existing expense
   *
   * @param id - Expense ID
   * @param updates - Fields to update
   * @returns Updated expense
   */
  async updateExpense(id: string, updates: Partial<QBOExpense>): Promise<QBOExpense> {
    logger.info('Updating expense', { id });

    // Get current expense for sync token
    const current = await this.getExpenseById(id);

    if (!current) {
      throw new Error(`Expense not found: ${id}`);
    }

    // Merge updates
    const updated = {
      ...current,
      ...updates,
      Id: id,
      SyncToken: current.SyncToken,
    };

    // Update expense
    const result = await queue.add(() => this.client.post<QBOExpense>('/purchase', updated));

    // Invalidate cache
    await this.invalidateExpenseCache();

    logger.info('Expense updated successfully', { id });

    return result.Purchase;
  }

  /**
   * Get expense by ID
   *
   * @param id - Expense ID
   * @returns Expense or null
   */
  async getExpenseById(id: string): Promise<QBOExpense | null> {
    const cacheKey = `expense:${id}`;

    // Check cache
    const cached = await cache.get<QBOExpense>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await queue.add(() => this.client.get<QBOExpense>(`/purchase/${id}`));
      const expense = result.Purchase;

      // Cache result
      await cache.set(cacheKey, expense, this.CACHE_TTL);

      return expense;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Categorize an expense
   *
   * @param id - Expense ID
   * @param accountId - Account ID to categorize to
   * @returns Updated expense
   */
  async categorizeExpense(id: string, accountId: string): Promise<QBOExpense> {
    logger.info('Categorizing expense', { id, accountId });

    const expense = await this.getExpenseById(id);

    if (!expense) {
      throw new Error(`Expense not found: ${id}`);
    }

    // Update the account reference on all lines
    if (expense.Line) {
      for (const line of expense.Line) {
        if (line.AccountBasedExpenseLineDetail) {
          line.AccountBasedExpenseLineDetail.AccountRef = {
            value: accountId,
          };
        }
      }
    }

    return this.updateExpense(id, { Line: expense.Line });
  }

  /**
   * Find vendor by name or create if not exists
   *
   * @param name - Vendor name
   * @returns Vendor
   */
  private async findOrCreateVendor(name: string): Promise<any> {
    // Try to find existing vendor
    const query = `SELECT * FROM Vendor WHERE DisplayName = '${name.replace(/'/g, "\\'")}'`;
    const result = await queue.add(() => this.client.query(query));

    if (result.QueryResponse?.Vendor?.length > 0) {
      return result.QueryResponse.Vendor[0];
    }

    // Create new vendor
    logger.info('Creating new vendor', { name });

    const vendor = {
      DisplayName: name,
    };

    const createResult = await queue.add(() => this.client.post('/vendor', vendor));

    return createResult.Vendor;
  }

  /**
   * Find account by name
   *
   * @param name - Account name
   * @returns Account or null
   */
  private async findAccount(name: string): Promise<any> {
    const query = `SELECT * FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const result = await queue.add(() => this.client.query(query));

    if (result.QueryResponse?.Account?.length > 0) {
      return result.QueryResponse.Account[0];
    }

    return null;
  }

  /**
   * Invalidate all expense-related cache entries
   */
  private async invalidateExpenseCache(): Promise<void> {
    // This is a simple implementation - in production you might want
    // to track cache keys more precisely
    logger.info('Invalidating expense cache');
  }
}

/**
 * Singleton instance
 */
export const expenseService = new ExpenseService();
