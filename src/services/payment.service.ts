/**
 * Payment Service
 *
 * Handles all QuickBooks payment-related operations including:
 * - Recording customer payments
 * - Applying payments to invoices
 * - Querying payment history
 * - Payment method management
 */

import { QBOApiClient } from '../api/client.js';
import { logger } from '../utils/logger.js';
import { cache } from './cache.js';
import { queue } from './queue.js';
import { parseDateString } from '../utils/date-parser.js';

export interface QBOPayment {
  Id: string;
  TxnDate: string;
  CustomerRef: {
    value: string;
    name?: string;
  };
  TotalAmt: number;
  Line?: Array<{
    Amount: number;
    LinkedTxn?: Array<{
      TxnId: string;
      TxnType: string;
    }>;
  }>;
  DepositToAccountRef?: {
    value: string;
    name?: string;
  };
  PaymentMethodRef?: {
    value: string;
    name?: string;
  };
  PaymentRefNum?: string;
  SyncToken?: string;
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface RecordPaymentParams {
  customerId: string;
  amount: number;
  date?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  depositToAccount?: string;
  invoiceIds?: string[];
  memo?: string;
}

export interface GetPaymentsParams {
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
}

export class PaymentService {
  private client: QBOApiClient;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(client?: QBOApiClient) {
    this.client = client || new QBOApiClient();
  }

  /**
   * Record a customer payment
   *
   * @param params - Payment parameters
   * @returns Created payment
   */
  async recordPayment(params: RecordPaymentParams): Promise<QBOPayment> {
    logger.info('Recording payment', {
      customerId: params.customerId,
      amount: params.amount,
    });

    // Parse date
    const txnDate = params.date ? parseDateString(params.date) : new Date().toISOString().split('T')[0];

    // Build payment object
    const payment: Partial<QBOPayment> = {
      TxnDate: txnDate,
      CustomerRef: {
        value: params.customerId,
      },
      TotalAmt: params.amount,
    };

    // Add payment method if provided
    if (params.paymentMethod) {
      const paymentMethod = await this.findOrCreatePaymentMethod(params.paymentMethod);
      payment.PaymentMethodRef = {
        value: paymentMethod.Id,
        name: paymentMethod.Name,
      };
    }

    // Add deposit account if provided
    if (params.depositToAccount) {
      const account = await this.findAccount(params.depositToAccount);
      if (account) {
        payment.DepositToAccountRef = {
          value: account.Id,
          name: account.Name,
        };
      }
    }

    // Add reference number
    if (params.referenceNumber) {
      payment.PaymentRefNum = params.referenceNumber;
    }

    // Apply to specific invoices if provided
    if (params.invoiceIds && params.invoiceIds.length > 0) {
      payment.Line = [];

      for (const invoiceId of params.invoiceIds) {
        // Get invoice to determine amount to apply
        const invoice = await this.getInvoiceById(invoiceId);

        if (invoice) {
          payment.Line.push({
            Amount: Math.min(invoice.Balance || 0, params.amount),
            LinkedTxn: [
              {
                TxnId: invoiceId,
                TxnType: 'Invoice',
              },
            ],
          });
        }
      }
    }

    // Create payment
    const result = await queue.add(() => this.client.post<QBOPayment>('/payment', payment));

    // Invalidate caches
    await this.invalidatePaymentCache();
    await this.invalidateInvoiceCache(params.invoiceIds);

    logger.info('Payment recorded successfully', { id: result.Payment.Id });

    return result.Payment;
  }

  /**
   * Get payments with optional filtering
   *
   * @param params - Query parameters
   * @returns Array of payments
   */
  async getPayments(params: GetPaymentsParams = {}): Promise<QBOPayment[]> {
    const cacheKey = `payments:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOPayment[]>(cacheKey);
    if (cached) {
      logger.info('Returning cached payments', { count: cached.length });
      return cached;
    }

    // Build query
    let query = 'SELECT * FROM Payment';
    const conditions: string[] = [];

    if (params.customerId) {
      conditions.push(`CustomerRef = '${params.customerId}'`);
    }

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
      query += ' WHERE ' + conditions.join(' AND');
    }

    query += ' ORDERBY TxnDate DESC';
    query += ' STARTPOSITION 1 MAXRESULTS ' + (params.limit || 100);

    logger.info('Querying payments', { query });

    // Execute query
    const response = await queue.add(() => this.client.query<QBOPayment>(query));
    const payments = response.QueryResponse?.Payment || [];

    // Cache results
    await cache.set(cacheKey, payments, this.CACHE_TTL);

    logger.info('Retrieved payments', { count: payments.length });

    return payments;
  }

  /**
   * Get payment by ID
   *
   * @param id - Payment ID
   * @returns Payment or null
   */
  async getPaymentById(id: string): Promise<QBOPayment | null> {
    const cacheKey = `payment:${id}`;

    // Check cache
    const cached = await cache.get<QBOPayment>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await queue.add(() => this.client.get<QBOPayment>(`/payment/${id}`));
      const payment = result.Payment;

      // Cache result
      await cache.set(cacheKey, payment, this.CACHE_TTL);

      return payment;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Void a payment
   *
   * @param id - Payment ID
   * @returns Voided payment
   */
  async voidPayment(id: string): Promise<QBOPayment> {
    logger.info('Voiding payment', { id });

    // Get current payment for sync token
    const current = await this.getPaymentById(id);

    if (!current) {
      throw new Error(`Payment not found: ${id}`);
    }

    // Void payment
    const result = await queue.add(() =>
      this.client.post<QBOPayment>(`/payment/${id}?operation=void`, {
        Id: id,
        SyncToken: current.SyncToken,
      })
    );

    // Invalidate caches
    await this.invalidatePaymentCache();

    logger.info('Payment voided successfully', { id });

    return result.Payment;
  }

  /**
   * Get available payment methods
   *
   * @returns Array of payment methods
   */
  async getPaymentMethods(): Promise<any[]> {
    const cacheKey = 'payment-methods';

    // Check cache
    const cached = await cache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = 'SELECT * FROM PaymentMethod';
    const result = await queue.add(() => this.client.query(query));
    const methods = result.QueryResponse?.PaymentMethod || [];

    // Cache results
    await cache.set(cacheKey, methods, 3600); // 1 hour

    return methods;
  }

  /**
   * Find or create payment method
   *
   * @param name - Payment method name
   * @returns Payment method
   */
  private async findOrCreatePaymentMethod(name: string): Promise<any> {
    // Try to find existing method
    const query = `SELECT * FROM PaymentMethod WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const result = await queue.add(() => this.client.query(query));

    if (result.QueryResponse?.PaymentMethod?.length > 0) {
      return result.QueryResponse.PaymentMethod[0];
    }

    // Create new payment method
    logger.info('Creating new payment method', { name });

    const method = {
      Name: name,
      Type: 'OTHER',
    };

    const createResult = await queue.add(() => this.client.post('/paymentmethod', method));

    return createResult.PaymentMethod;
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
   * Get invoice by ID (helper method)
   *
   * @param id - Invoice ID
   * @returns Invoice or null
   */
  private async getInvoiceById(id: string): Promise<any> {
    try {
      const result = await queue.add(() => this.client.get(`/invoice/${id}`));
      return result.Invoice;
    } catch (error) {
      return null;
    }
  }

  /**
   * Invalidate payment cache
   */
  private async invalidatePaymentCache(): Promise<void> {
    logger.info('Invalidating payment cache');
  }

  /**
   * Invalidate invoice cache for specific invoices
   *
   * @param invoiceIds - Invoice IDs to invalidate
   */
  private async invalidateInvoiceCache(invoiceIds?: string[]): Promise<void> {
    if (invoiceIds && invoiceIds.length > 0) {
      logger.info('Invalidating invoice cache', { invoiceIds });
    }
  }
}

/**
 * Singleton instance
 */
export const paymentService = new PaymentService();
