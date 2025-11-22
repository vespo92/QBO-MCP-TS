/**
 * Banking Service - Deposits and Transfers management
 */

import type { QBOClient } from '../api/client.js';
import type {
  QBODeposit,
  QBODepositInput,
  GetDepositsParams,
  CreateDepositParams,
} from '../types/entities/banking/deposit.types.js';
import type {
  QBOTransfer,
  QBOTransferInput,
  GetTransfersParams,
  CreateTransferParams,
} from '../types/entities/banking/transfer.types.js';
import type { QBOAccount } from '../types/entities/core/account.types.js';
import type { QBOPayment } from '../types/entities/sales/payment.types.js';
import { logger } from '../utils/logger.js';
import type { ICacheService } from '../types/index.js';

/**
 * Service for banking operations (Deposits and Transfers)
 */
export class BankingService {
  private client: QBOClient;
  private cache?: ICacheService;

  constructor(client: QBOClient, cache?: ICacheService) {
    this.client = client;
    this.cache = cache;
  }

  // ============================================================================
  // DEPOSITS
  // ============================================================================

  /**
   * Get deposits with optional filtering
   */
  async getDeposits(params: GetDepositsParams = {}): Promise<QBODeposit[]> {
    const { accountName, dateFrom, dateTo, minAmount, maxAmount, limit = 100 } = params;

    const conditions: string[] = [];

    if (dateFrom) {
      conditions.push(`TxnDate >= '${dateFrom}'`);
    }

    if (dateTo) {
      conditions.push(`TxnDate <= '${dateTo}'`);
    }

    if (minAmount !== undefined) {
      conditions.push(`TotalAmt >= ${minAmount}`);
    }

    if (maxAmount !== undefined) {
      conditions.push(`TotalAmt <= ${maxAmount}`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Deposit${whereClause} ORDERBY TxnDate DESC MAXRESULTS ${limit}`;

    logger.debug('Querying deposits', { query });

    const response = await this.client.query<QBODeposit>(query);
    let deposits = response.QueryResponse?.Deposit || [];

    // Filter by account name (post-query)
    if (accountName) {
      const accountNameLower = accountName.toLowerCase();
      deposits = deposits.filter(deposit =>
        deposit.DepositToAccountRef?.name?.toLowerCase().includes(accountNameLower)
      );
    }

    return deposits;
  }

  /**
   * Get a single deposit by ID
   */
  async getDepositById(depositId: string): Promise<QBODeposit | null> {
    try {
      const response = await this.client.read<QBODeposit>('deposit', depositId);
      return response.Deposit || null;
    } catch (error) {
      logger.error('Failed to get deposit', { depositId, error });
      return null;
    }
  }

  /**
   * Create a new deposit
   */
  async createDeposit(params: CreateDepositParams): Promise<QBODeposit> {
    // Find deposit account
    const depositAccount = await this.findAccountByName(params.depositToAccount);
    if (!depositAccount) {
      throw new Error(`Deposit account not found: ${params.depositToAccount}`);
    }

    // Build deposit lines
    const lines: QBODepositInput['Line'] = [];

    for (const line of params.lines) {
      const depositLine: QBODepositInput['Line'][0] = {
        Amount: line.amount,
        DetailType: 'DepositLineDetail',
        DepositLineDetail: {},
      };

      // Add entity reference if specified
      if (line.receivedFrom && line.entityType) {
        const entity = await this.findEntityByName(line.receivedFrom, line.entityType);
        if (entity) {
          depositLine.DepositLineDetail.Entity = {
            EntityRef: { value: entity.Id },
            Type: line.entityType,
          };
        }
      }

      // Add account reference if specified
      if (line.fromAccount) {
        const account = await this.findAccountByName(line.fromAccount);
        if (account) {
          depositLine.DepositLineDetail.AccountRef = { value: account.Id };
        }
      }

      // Add payment method if specified
      if (line.paymentMethod) {
        const paymentMethod = await this.findPaymentMethodByName(line.paymentMethod);
        if (paymentMethod) {
          depositLine.DepositLineDetail.PaymentMethodRef = { value: paymentMethod.Id };
        }
      }

      // Add check number if specified
      if (line.checkNumber) {
        depositLine.DepositLineDetail.CheckNum = line.checkNumber;
      }

      // Link to existing payment if specified
      if (line.paymentId) {
        depositLine.LinkedTxn = [{
          TxnId: line.paymentId,
          TxnType: 'Payment',
        }];
      }

      lines.push(depositLine);
    }

    const depositInput: QBODepositInput = {
      DepositToAccountRef: { value: depositAccount.Id },
      Line: lines,
      TxnDate: params.date,
      PrivateNote: params.memo,
    };

    // Add cash back if specified
    if (params.cashBack) {
      const cashBackAccount = await this.findAccountByName(params.cashBack.accountName);
      if (cashBackAccount) {
        depositInput.CashBack = {
          AccountRef: { value: cashBackAccount.Id },
          Amount: params.cashBack.amount,
          Memo: params.cashBack.memo,
        };
      }
    }

    logger.info('Creating deposit', { account: params.depositToAccount, lineCount: lines.length });

    const response = await this.client.create<QBODeposit>('deposit', depositInput);
    return response.Deposit;
  }

  /**
   * Deposit undeposited funds
   */
  async depositUndepositedFunds(
    depositToAccount: string,
    paymentIds?: string[],
    date?: string
  ): Promise<QBODeposit> {
    // Find deposit account
    const depositAccount = await this.findAccountByName(depositToAccount);
    if (!depositAccount) {
      throw new Error(`Deposit account not found: ${depositToAccount}`);
    }

    // Get undeposited payments
    let payments: QBOPayment[];
    if (paymentIds && paymentIds.length > 0) {
      // Get specific payments
      payments = [];
      for (const id of paymentIds) {
        const payment = await this.getPaymentById(id);
        if (payment) {
          payments.push(payment);
        }
      }
    } else {
      // Get all undeposited payments (payments without a deposit)
      const query = `SELECT * FROM Payment WHERE DepositToAccountRef = null`;
      const response = await this.client.query<QBOPayment>(query);
      payments = response.QueryResponse?.Payment || [];
    }

    if (payments.length === 0) {
      throw new Error('No undeposited payments found');
    }

    // Build deposit lines from payments
    const lines: QBODepositInput['Line'] = payments.map(payment => ({
      Amount: payment.TotalAmt,
      DetailType: 'DepositLineDetail' as const,
      DepositLineDetail: {
        Entity: payment.CustomerRef ? {
          EntityRef: { value: payment.CustomerRef.value },
          Type: 'Customer' as const,
        } : undefined,
      },
      LinkedTxn: [{
        TxnId: payment.Id,
        TxnType: 'Payment',
      }],
    }));

    const depositInput: QBODepositInput = {
      DepositToAccountRef: { value: depositAccount.Id },
      Line: lines,
      TxnDate: date,
    };

    logger.info('Depositing undeposited funds', { account: depositToAccount, paymentCount: payments.length });

    const response = await this.client.create<QBODeposit>('deposit', depositInput);
    return response.Deposit;
  }

  /**
   * Void a deposit
   */
  async voidDeposit(depositId: string): Promise<QBODeposit> {
    const deposit = await this.getDepositById(depositId);
    if (!deposit) {
      throw new Error(`Deposit not found: ${depositId}`);
    }

    logger.info('Voiding deposit', { depositId });

    const response = await this.client.delete<QBODeposit>('deposit', {
      Id: depositId,
      SyncToken: deposit.SyncToken,
    });

    return response.Deposit;
  }

  // ============================================================================
  // TRANSFERS
  // ============================================================================

  /**
   * Get transfers with optional filtering
   */
  async getTransfers(params: GetTransfersParams = {}): Promise<QBOTransfer[]> {
    const { fromAccount, toAccount, dateFrom, dateTo, minAmount, maxAmount, limit = 100 } = params;

    const conditions: string[] = [];

    if (dateFrom) {
      conditions.push(`TxnDate >= '${dateFrom}'`);
    }

    if (dateTo) {
      conditions.push(`TxnDate <= '${dateTo}'`);
    }

    if (minAmount !== undefined) {
      conditions.push(`Amount >= ${minAmount}`);
    }

    if (maxAmount !== undefined) {
      conditions.push(`Amount <= ${maxAmount}`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Transfer${whereClause} ORDERBY TxnDate DESC MAXRESULTS ${limit}`;

    logger.debug('Querying transfers', { query });

    const response = await this.client.query<QBOTransfer>(query);
    let transfers = response.QueryResponse?.Transfer || [];

    // Filter by account names (post-query)
    if (fromAccount) {
      const fromAccountLower = fromAccount.toLowerCase();
      transfers = transfers.filter(transfer =>
        transfer.FromAccountRef?.name?.toLowerCase().includes(fromAccountLower)
      );
    }

    if (toAccount) {
      const toAccountLower = toAccount.toLowerCase();
      transfers = transfers.filter(transfer =>
        transfer.ToAccountRef?.name?.toLowerCase().includes(toAccountLower)
      );
    }

    return transfers;
  }

  /**
   * Get a single transfer by ID
   */
  async getTransferById(transferId: string): Promise<QBOTransfer | null> {
    try {
      const response = await this.client.read<QBOTransfer>('transfer', transferId);
      return response.Transfer || null;
    } catch (error) {
      logger.error('Failed to get transfer', { transferId, error });
      return null;
    }
  }

  /**
   * Create a new transfer
   */
  async createTransfer(params: CreateTransferParams): Promise<QBOTransfer> {
    // Find from account
    const fromAccount = await this.findAccountByName(params.fromAccount);
    if (!fromAccount) {
      throw new Error(`From account not found: ${params.fromAccount}`);
    }

    // Find to account
    const toAccount = await this.findAccountByName(params.toAccount);
    if (!toAccount) {
      throw new Error(`To account not found: ${params.toAccount}`);
    }

    const transferInput: QBOTransferInput = {
      FromAccountRef: { value: fromAccount.Id },
      ToAccountRef: { value: toAccount.Id },
      Amount: params.amount,
      TxnDate: params.date,
      PrivateNote: params.memo,
    };

    logger.info('Creating transfer', {
      from: params.fromAccount,
      to: params.toAccount,
      amount: params.amount,
    });

    const response = await this.client.create<QBOTransfer>('transfer', transferInput);
    return response.Transfer;
  }

  /**
   * Void a transfer
   */
  async voidTransfer(transferId: string): Promise<QBOTransfer> {
    const transfer = await this.getTransferById(transferId);
    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`);
    }

    logger.info('Voiding transfer', { transferId });

    const response = await this.client.delete<QBOTransfer>('transfer', {
      Id: transferId,
      SyncToken: transfer.SyncToken,
    });

    return response.Transfer;
  }

  // ============================================================================
  // BANK ACCOUNT OPERATIONS
  // ============================================================================

  /**
   * Get all bank accounts
   */
  async getBankAccounts(): Promise<QBOAccount[]> {
    const query = `SELECT * FROM Account WHERE AccountType = 'Bank' AND Active = true`;
    const response = await this.client.query<QBOAccount>(query);
    return response.QueryResponse?.Account || [];
  }

  /**
   * Get bank account balances
   */
  async getBankAccountBalances(): Promise<Array<{
    id: string;
    name: string;
    balance: number;
    accountNumber?: string;
  }>> {
    const accounts = await this.getBankAccounts();
    return accounts.map(account => ({
      id: account.Id,
      name: account.Name,
      balance: account.CurrentBalance || 0,
      accountNumber: account.AcctNum,
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async findAccountByName(name: string): Promise<QBOAccount | null> {
    const query = `SELECT * FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<QBOAccount>(query);
    return response.QueryResponse?.Account?.[0] || null;
  }

  private async findEntityByName(
    name: string,
    type: 'Customer' | 'Vendor' | 'Employee'
  ): Promise<any | null> {
    const query = `SELECT * FROM ${type} WHERE DisplayName = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<any>(query);
    return response.QueryResponse?.[type]?.[0] || null;
  }

  private async findPaymentMethodByName(name: string): Promise<any | null> {
    const query = `SELECT * FROM PaymentMethod WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<any>(query);
    return response.QueryResponse?.PaymentMethod?.[0] || null;
  }

  private async getPaymentById(paymentId: string): Promise<QBOPayment | null> {
    try {
      const response = await this.client.read<QBOPayment>('payment', paymentId);
      return response.Payment || null;
    } catch {
      return null;
    }
  }
}
