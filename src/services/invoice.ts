/**
 * Invoice service for QuickBooks operations
 */

import { QBOApiClient } from '../api/client';
import {
  QBOInvoice,
  QBOCustomer,
  InvoiceListResponse,
  GetInvoicesSchema,
  CreateInvoiceSchema,
  SendInvoiceSchema,
  ValidationError,
} from '../types';
import { DateParser } from '../utils/date-parser';
import { logger } from '../utils/logger';
import { cacheService } from './cache';
import { queueService } from './queue';

export class InvoiceService {
  constructor(private api: QBOApiClient) {}

  /**
   * Get invoices with filtering
   */
  public async getInvoices(params: any): Promise<InvoiceListResponse> {
    try {
      // Validate input
      const validated = GetInvoicesSchema.parse(params);

      // Build cache key
      const cacheKey = `invoices:${JSON.stringify(validated)}`;

      // Check cache
      const cached = await cacheService.get<InvoiceListResponse>(cacheKey);
      if (cached) {
        logger.info('Returning cached invoice list');
        return cached;
      }

      // Build query
      let query = 'SELECT * FROM Invoice';
      const conditions: string[] = [];

      // Status filter
      if (validated.status && validated.status !== 'all') {
        switch (validated.status) {
          case 'unpaid':
            conditions.push("Balance > '0'");
            break;
          case 'paid':
            conditions.push("Balance = '0'");
            break;
          case 'overdue':
            conditions.push(`Balance > '0' AND DueDate < '${DateParser.parse('today')}'`);
            break;
        }
      }

      // Customer filter
      if (validated.customerName) {
        // First, find the customer
        const customer = await this.findCustomerByName(validated.customerName);
        if (customer) {
          conditions.push(`CustomerRef = '${customer.Id}'`);
        }
      }

      // Date range filter
      if (validated.dateFrom) {
        conditions.push(`TxnDate >= '${DateParser.parse(validated.dateFrom)}'`);
      }
      if (validated.dateTo) {
        conditions.push(`TxnDate <= '${DateParser.parse(validated.dateTo)}'`);
      }

      // Amount filters
      if (validated.minAmount !== undefined) {
        conditions.push(`TotalAmt >= '${validated.minAmount}'`);
      }
      if (validated.maxAmount !== undefined) {
        conditions.push(`TotalAmt <= '${validated.maxAmount}'`);
      }

      // Add conditions to query
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Add ordering and limit
      query += ' ORDER BY TxnDate DESC';
      if (validated.limit) {
        query += ` MAXRESULTS ${validated.limit}`;
      }

      // Execute query with queue
      const result = await queueService.add(() => this.api.query<any>(query));

      // Format response
      const invoices = result.QueryResponse?.Invoice || [];
      const response = this.formatInvoiceList(invoices);

      // Cache the result
      await cacheService.set(cacheKey, response, 300); // 5 minutes

      return response;
    } catch (error) {
      logger.error('Failed to get invoices', error);
      throw error;
    }
  }

  /**
   * Create a new invoice
   */
  public async createInvoice(params: any): Promise<QBOInvoice> {
    try {
      // Validate input
      const validated = CreateInvoiceSchema.parse(params);

      // Find customer
      const customer = await this.findCustomerByName(validated.customerName);
      if (!customer) {
        throw new ValidationError(`Customer not found: ${validated.customerName}`);
      }

      // Build invoice object
      const invoice: any = {
        CustomerRef: {
          value: customer.Id,
          name: customer.DisplayName,
        },
        Line: validated.items.map((item, index) => ({
          LineNum: index + 1,
          Description: item.description,
          Amount: item.amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: {
              value: '1', // Default service item
              name: 'Services',
            },
            UnitPrice: item.unitPrice || item.amount,
            Qty: item.quantity || 1,
          },
        })),
      };

      // Set due date
      if (validated.dueDate) {
        invoice.DueDate = DateParser.parse(validated.dueDate);
      } else {
        // Default to 30 days
        invoice.DueDate = DateParser.addBusinessDays('today', 30);
      }

      // Add memo if provided
      if (validated.memo) {
        invoice.PrivateNote = validated.memo;
      }

      // Create invoice with queue
      const created = await queueService.add(() => this.api.post<QBOInvoice>('/invoice', invoice));

      logger.info('Created invoice', {
        invoiceId: created.Id,
        customer: validated.customerName,
        total: created.TotalAmt,
      });

      // Send email if requested
      if (validated.emailToCustomer) {
        await this.sendInvoice({
          invoiceId: created.Id,
        });
      }

      // Clear cache
      await cacheService.delete('invoices:*');

      return created;
    } catch (error) {
      logger.error('Failed to create invoice', error);
      throw error;
    }
  }

  /**
   * Send invoice via email
   */
  public async sendInvoice(params: any): Promise<void> {
    try {
      // Validate input
      const validated = SendInvoiceSchema.parse(params);

      // Send with queue
      await queueService.add(() =>
        this.api.sendEmail('Invoice', validated.invoiceId, validated.email || ''),
      );

      logger.info('Sent invoice', {
        invoiceId: validated.invoiceId,
        email: validated.email,
      });
    } catch (error) {
      logger.error('Failed to send invoice', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  public async getInvoiceById(invoiceId: string): Promise<QBOInvoice> {
    try {
      const cacheKey = `invoice:${invoiceId}`;

      // Check cache
      const cached = await cacheService.get<QBOInvoice>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from API
      const invoice = await queueService.add(() =>
        this.api.get<QBOInvoice>(`/invoice/${invoiceId}`),
      );

      // Cache it
      await cacheService.set(cacheKey, invoice, 600); // 10 minutes

      return invoice;
    } catch (error) {
      logger.error('Failed to get invoice by ID', error);
      throw error;
    }
  }

  /**
   * Update an invoice
   */
  public async updateInvoice(invoiceId: string, updates: Partial<QBOInvoice>): Promise<QBOInvoice> {
    try {
      // Get current invoice
      const current = await this.getInvoiceById(invoiceId);

      // Merge updates
      const updated = {
        ...current,
        ...updates,
        Id: invoiceId,
        SyncToken: current.MetaData?.LastUpdatedTime,
      };

      // Update with queue
      const result = await queueService.add(() => this.api.post<QBOInvoice>('/invoice', updated));

      // Clear cache
      await cacheService.delete(`invoice:${invoiceId}`);
      await cacheService.delete('invoices:*');

      return result;
    } catch (error) {
      logger.error('Failed to update invoice', error);
      throw error;
    }
  }

  /**
   * Delete an invoice
   */
  public async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      // Get current invoice for sync token
      const current = await this.getInvoiceById(invoiceId);

      // Delete with queue
      await queueService.add(() =>
        this.api.post('/invoice', {
          Id: invoiceId,
          SyncToken: current.MetaData?.LastUpdatedTime,
          Active: false,
        }),
      );

      // Clear cache
      await cacheService.delete(`invoice:${invoiceId}`);
      await cacheService.delete('invoices:*');

      logger.info('Deleted invoice', { invoiceId });
    } catch (error) {
      logger.error('Failed to delete invoice', error);
      throw error;
    }
  }

  /**
   * Get invoice PDF
   */
  public async getInvoicePDF(invoiceId: string): Promise<Buffer> {
    try {
      return await queueService.add(() => this.api.downloadPDF('Invoice', invoiceId));
    } catch (error) {
      logger.error('Failed to get invoice PDF', error);
      throw error;
    }
  }

  /**
   * Find customer by name
   */
  private async findCustomerByName(name: string): Promise<QBOCustomer | null> {
    try {
      const query = `SELECT * FROM Customer WHERE DisplayName = '${name}' OR CompanyName = '${name}'`;
      const result = await this.api.query<any>(query);

      const customers = result.QueryResponse?.Customer || [];
      return customers[0] || null;
    } catch (error) {
      logger.error('Failed to find customer', error);
      return null;
    }
  }

  /**
   * Format invoice list for response
   */
  private formatInvoiceList(invoices: QBOInvoice[]): InvoiceListResponse {
    let totalAmount = 0;

    const formatted = invoices.map((inv) => {
      totalAmount += inv.TotalAmt;

      return {
        invoiceNumber: inv.DocNumber || `INV-${inv.Id}`,
        customer: inv.CustomerRef.name || 'Unknown',
        date: DateParser.formatDisplay(inv.TxnDate),
        dueDate: inv.DueDate ? DateParser.formatDisplay(inv.DueDate) : 'N/A',
        total: `$${inv.TotalAmt.toFixed(2)}`,
        balance: `$${(inv.Balance || 0).toFixed(2)}`,
        status: this.getInvoiceStatus(inv),
        id: inv.Id,
      };
    });

    return {
      summary: `Found ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`,
      count: invoices.length,
      totalAmount,
      invoices: formatted,
    };
  }

  /**
   * Determine invoice status
   */
  private getInvoiceStatus(invoice: QBOInvoice): 'Paid' | 'Unpaid' | 'Overdue' {
    if (!invoice.Balance || invoice.Balance === 0) {
      return 'Paid';
    }

    if (invoice.DueDate && DateParser.isOverdue(invoice.DueDate)) {
      return 'Overdue';
    }

    return 'Unpaid';
  }

  /**
   * Get aging report for invoices
   */
  public async getAgingReport(): Promise<any> {
    try {
      const invoices = await this.getInvoices({ status: 'unpaid' });

      const aging = {
        current: [] as any[],
        '30days': [] as any[],
        '60days': [] as any[],
        '90days': [] as any[],
        over90: [] as any[],
      };

      const today = new Date();

      for (const inv of invoices.invoices) {
        if (inv.status === 'Unpaid' || inv.status === 'Overdue') {
          const daysOld = DateParser.daysBetween(inv.date, today);

          if (daysOld <= 30) {
            aging.current.push(inv);
          } else if (daysOld <= 60) {
            aging['30days'].push(inv);
          } else if (daysOld <= 90) {
            aging['60days'].push(inv);
          } else if (daysOld <= 120) {
            aging['90days'].push(inv);
          } else {
            aging['over90'].push(inv);
          }
        }
      }

      return aging;
    } catch (error) {
      logger.error('Failed to get aging report', error);
      throw error;
    }
  }
}
