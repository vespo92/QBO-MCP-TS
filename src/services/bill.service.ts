/**
 * Bill Service - Vendor bill management
 */

import type { QBOClient } from '../api/client.js';
import type {
  QBOBill,
  QBOBillInput,
  GetBillsParams,
  CreateBillParams,
  UpdateBillParams,
} from '../types/entities/purchasing/bill.types.js';
import type { QBOVendor } from '../types/entities/purchasing/vendor.types.js';
import type { QBOAccount } from '../types/entities/core/account.types.js';
import { logger } from '../utils/logger.js';
import type { ICacheService } from '../types/index.js';

/**
 * Service for managing Bills (AP)
 */
export class BillService {
  private client: QBOClient;
  private cache?: ICacheService;
  private readonly CACHE_PREFIX = 'bill:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(client: QBOClient, cache?: ICacheService) {
    this.client = client;
    this.cache = cache;
  }

  /**
   * Get bills with optional filtering
   */
  async getBills(params: GetBillsParams = {}): Promise<QBOBill[]> {
    const {
      vendorName,
      status,
      dateFrom,
      dateTo,
      dueDateFrom,
      dueDateTo,
      minAmount,
      maxAmount,
      limit = 100
    } = params;

    // Build query conditions
    const conditions: string[] = [];

    if (dateFrom) {
      conditions.push(`TxnDate >= '${dateFrom}'`);
    }

    if (dateTo) {
      conditions.push(`TxnDate <= '${dateTo}'`);
    }

    if (dueDateFrom) {
      conditions.push(`DueDate >= '${dueDateFrom}'`);
    }

    if (dueDateTo) {
      conditions.push(`DueDate <= '${dueDateTo}'`);
    }

    if (minAmount !== undefined) {
      conditions.push(`TotalAmt >= ${minAmount}`);
    }

    if (maxAmount !== undefined) {
      conditions.push(`TotalAmt <= ${maxAmount}`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Bill${whereClause} ORDERBY TxnDate DESC MAXRESULTS ${limit}`;

    logger.debug('Querying bills', { query });

    const response = await this.client.query<QBOBill>(query);
    let bills = response.QueryResponse?.Bill || [];

    // Filter by vendor name (post-query since QB doesn't support LIKE on refs)
    if (vendorName) {
      const vendorNameLower = vendorName.toLowerCase();
      bills = bills.filter(bill =>
        bill.VendorRef?.name?.toLowerCase().includes(vendorNameLower)
      );
    }

    // Filter by status (post-query calculation)
    if (status && status !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      bills = bills.filter(bill => {
        const hasBalance = (bill.Balance || 0) > 0;
        const dueDate = bill.DueDate ? new Date(bill.DueDate) : null;
        const isOverdue = dueDate ? dueDate < today : false;

        switch (status) {
          case 'unpaid':
            return hasBalance;
          case 'paid':
            return !hasBalance;
          case 'overdue':
            return hasBalance && isOverdue;
          default:
            return true;
        }
      });
    }

    return bills;
  }

  /**
   * Get a single bill by ID
   */
  async getBillById(billId: string): Promise<QBOBill | null> {
    try {
      const response = await this.client.read<QBOBill>('bill', billId);
      return response.Bill || null;
    } catch (error) {
      logger.error('Failed to get bill', { billId, error });
      return null;
    }
  }

  /**
   * Create a new bill
   */
  async createBill(params: CreateBillParams): Promise<QBOBill> {
    // Find vendor
    const vendor = await this.findVendorByName(params.vendorName);
    if (!vendor) {
      throw new Error(`Vendor not found: ${params.vendorName}`);
    }

    // Build line items
    const lines: QBOBillInput['Line'] = [];

    for (const line of params.lines) {
      if (line.itemName) {
        // Item-based line
        const item = await this.findItemByName(line.itemName);
        if (!item) {
          throw new Error(`Item not found: ${line.itemName}`);
        }

        lines.push({
          Amount: line.amount,
          DetailType: 'ItemBasedExpenseLineDetail',
          Description: line.description,
          ItemBasedExpenseLineDetail: {
            ItemRef: { value: item.Id },
            UnitPrice: line.unitPrice,
            Qty: line.quantity || 1,
            BillableStatus: line.billable ? 'Billable' : 'NotBillable',
            ...(line.customerName && await this.getCustomerRef(line.customerName)),
          },
        });
      } else if (line.accountName) {
        // Account-based line
        const account = await this.findAccountByName(line.accountName);
        if (!account) {
          throw new Error(`Account not found: ${line.accountName}`);
        }

        lines.push({
          Amount: line.amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          Description: line.description,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: account.Id },
            BillableStatus: line.billable ? 'Billable' : 'NotBillable',
            ...(line.customerName && await this.getCustomerRef(line.customerName)),
          },
        });
      } else {
        throw new Error('Each line must have either itemName or accountName');
      }
    }

    const billInput: QBOBillInput = {
      VendorRef: { value: vendor.Id },
      Line: lines,
      TxnDate: params.date,
      DueDate: params.dueDate,
      DocNumber: params.referenceNumber,
      PrivateNote: params.memo,
    };

    // Add terms if specified
    if (params.terms) {
      const term = await this.findTermByName(params.terms);
      if (term) {
        billInput.SalesTermRef = { value: term.Id };
      }
    }

    logger.info('Creating bill', { vendor: params.vendorName, lineCount: lines.length });

    const response = await this.client.create<QBOBill>('bill', billInput);
    return response.Bill;
  }

  /**
   * Update an existing bill
   */
  async updateBill(params: UpdateBillParams): Promise<QBOBill> {
    const current = await this.getBillById(params.billId);
    if (!current) {
      throw new Error(`Bill not found: ${params.billId}`);
    }

    const updateData: Partial<QBOBill> = {
      Id: params.billId,
      SyncToken: current.SyncToken,
      VendorRef: current.VendorRef,
      Line: current.Line,
    };

    if (params.dueDate) updateData.DueDate = params.dueDate;
    if (params.memo) updateData.PrivateNote = params.memo;

    // Update vendor if specified
    if (params.vendorName) {
      const vendor = await this.findVendorByName(params.vendorName);
      if (vendor) {
        updateData.VendorRef = { value: vendor.Id, name: vendor.DisplayName };
      }
    }

    // Update lines if specified
    if (params.lines && params.lines.length > 0) {
      const newLines: QBOBillInput['Line'] = [];
      for (const line of params.lines) {
        if (line.accountName) {
          const account = await this.findAccountByName(line.accountName);
          if (account) {
            newLines.push({
              Amount: line.amount,
              DetailType: 'AccountBasedExpenseLineDetail',
              Description: line.description,
              AccountBasedExpenseLineDetail: {
                AccountRef: { value: account.Id },
              },
            });
          }
        }
      }
      if (newLines.length > 0) {
        updateData.Line = newLines as any;
      }
    }

    logger.info('Updating bill', { billId: params.billId });

    const response = await this.client.update<QBOBill>('bill', updateData);
    return response.Bill;
  }

  /**
   * Void a bill
   */
  async voidBill(billId: string): Promise<QBOBill> {
    const bill = await this.getBillById(billId);
    if (!bill) {
      throw new Error(`Bill not found: ${billId}`);
    }

    logger.info('Voiding bill', { billId });

    // QB uses delete operation for bills (which actually voids them)
    const response = await this.client.delete<QBOBill>('bill', {
      Id: billId,
      SyncToken: bill.SyncToken,
    });

    return response.Bill;
  }

  /**
   * Get unpaid bills
   */
  async getUnpaidBills(): Promise<QBOBill[]> {
    return this.getBills({ status: 'unpaid' });
  }

  /**
   * Get overdue bills
   */
  async getOverdueBills(): Promise<QBOBill[]> {
    return this.getBills({ status: 'overdue' });
  }

  /**
   * Get bills by vendor
   */
  async getBillsByVendor(vendorName: string): Promise<QBOBill[]> {
    return this.getBills({ vendorName });
  }

  /**
   * Get AP aging summary
   */
  async getAPAgingSummary(): Promise<{
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  }> {
    const bills = await this.getUnpaidBills();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    };

    for (const bill of bills) {
      const balance = bill.Balance || 0;
      const dueDate = bill.DueDate ? new Date(bill.DueDate) : today;
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      aging.total += balance;

      if (daysPastDue <= 0) {
        aging.current += balance;
      } else if (daysPastDue <= 30) {
        aging.days1to30 += balance;
      } else if (daysPastDue <= 60) {
        aging.days31to60 += balance;
      } else if (daysPastDue <= 90) {
        aging.days61to90 += balance;
      } else {
        aging.over90 += balance;
      }
    }

    return aging;
  }

  // Helper methods
  private async findVendorByName(name: string): Promise<QBOVendor | null> {
    const query = `SELECT * FROM Vendor WHERE DisplayName = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<QBOVendor>(query);
    return response.QueryResponse?.Vendor?.[0] || null;
  }

  private async findAccountByName(name: string): Promise<QBOAccount | null> {
    const query = `SELECT * FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<QBOAccount>(query);
    return response.QueryResponse?.Account?.[0] || null;
  }

  private async findItemByName(name: string): Promise<any | null> {
    const query = `SELECT * FROM Item WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<any>(query);
    return response.QueryResponse?.Item?.[0] || null;
  }

  private async findTermByName(name: string): Promise<any | null> {
    const query = `SELECT * FROM Term WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<any>(query);
    return response.QueryResponse?.Term?.[0] || null;
  }

  private async getCustomerRef(customerName: string): Promise<{ CustomerRef: { value: string } } | {}> {
    const query = `SELECT * FROM Customer WHERE DisplayName = '${customerName.replace(/'/g, "\\'")}'`;
    const response = await this.client.query<any>(query);
    const customer = response.QueryResponse?.Customer?.[0];
    return customer ? { CustomerRef: { value: customer.Id } } : {};
  }
}
