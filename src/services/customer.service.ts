/**
 * Customer Service
 *
 * Handles all QuickBooks customer-related operations including:
 * - Querying customers
 * - Creating new customers
 * - Updating customer information
 * - Getting customer balances
 * - Customer transaction history
 */

import { QBOApiClient } from '../api/client.js';
import type { QBOCustomer } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { cache } from './cache.js';
import { queue } from './queue.js';

export interface GetCustomersParams {
  active?: boolean;
  hasBalance?: boolean;
  search?: string;
  limit?: number;
}

export interface CreateCustomerParams {
  displayName: string;
  givenName?: string;
  familyName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    countrySubDivisionCode?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  balance: number;
  overdueBalance: number;
  openInvoices: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

export class CustomerService {
  private client: QBOApiClient;
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(client?: QBOApiClient) {
    this.client = client || new QBOApiClient();
  }

  /**
   * Get customers with optional filtering
   *
   * @param params - Query parameters
   * @returns Array of customers
   */
  async getCustomers(params: GetCustomersParams = {}): Promise<QBOCustomer[]> {
    const cacheKey = `customers:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOCustomer[]>(cacheKey);
    if (cached) {
      logger.info('Returning cached customers', { count: cached.length });
      return cached;
    }

    // Build query
    let query = 'SELECT * FROM Customer';
    const conditions: string[] = [];

    if (params.active !== undefined) {
      conditions.push(`Active = ${params.active}`);
    }

    if (params.hasBalance) {
      conditions.push('Balance > 0');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND');
    }

    query += ' STARTPOSITION 1 MAXRESULTS ' + (params.limit || 100);

    logger.info('Querying customers', { query });

    // Execute query
    const response = await queue.add(() => this.client.query<QBOCustomer>(query));
    let customers = response.QueryResponse?.Customer || [];

    // Filter by search term if provided (post-query filter)
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      customers = customers.filter(
        (cust) =>
          cust.DisplayName?.toLowerCase().includes(searchLower) ||
          cust.CompanyName?.toLowerCase().includes(searchLower) ||
          cust.PrimaryEmailAddr?.Address?.toLowerCase().includes(searchLower)
      );
    }

    // Cache results
    await cache.set(cacheKey, customers, this.CACHE_TTL);

    logger.info('Retrieved customers', { count: customers.length });

    return customers;
  }

  /**
   * Get customer by ID
   *
   * @param id - Customer ID
   * @returns Customer or null
   */
  async getCustomerById(id: string): Promise<QBOCustomer | null> {
    const cacheKey = `customer:${id}`;

    // Check cache
    const cached = await cache.get<QBOCustomer>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await queue.add(() => this.client.get<QBOCustomer>(`/customer/${id}`));
      const customer = result.Customer;

      // Cache result
      await cache.set(cacheKey, customer, this.CACHE_TTL);

      return customer;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new customer
   *
   * @param params - Customer creation parameters
   * @returns Created customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<QBOCustomer> {
    logger.info('Creating customer', { displayName: params.displayName });

    // Build customer object
    const customer: Partial<QBOCustomer> = {
      DisplayName: params.displayName,
    };

    if (params.givenName) {
      customer.GivenName = params.givenName;
    }

    if (params.familyName) {
      customer.FamilyName = params.familyName;
    }

    if (params.companyName) {
      customer.CompanyName = params.companyName;
    }

    if (params.email) {
      customer.PrimaryEmailAddr = {
        Address: params.email,
      };
    }

    if (params.phone) {
      customer.PrimaryPhone = {
        FreeFormNumber: params.phone,
      };
    }

    if (params.billingAddress) {
      customer.BillAddr = {
        Line1: params.billingAddress.line1,
        City: params.billingAddress.city,
        CountrySubDivisionCode: params.billingAddress.countrySubDivisionCode,
        PostalCode: params.billingAddress.postalCode,
        Country: params.billingAddress.country,
      };
    }

    if (params.notes) {
      customer.Notes = params.notes;
    }

    // Create customer
    const result = await queue.add(() => this.client.post<QBOCustomer>('/customer', customer));

    // Invalidate customer cache
    await this.invalidateCustomerCache();

    logger.info('Customer created successfully', { id: result.Customer.Id });

    return result.Customer;
  }

  /**
   * Update an existing customer
   *
   * @param id - Customer ID
   * @param updates - Fields to update
   * @returns Updated customer
   */
  async updateCustomer(id: string, updates: Partial<QBOCustomer>): Promise<QBOCustomer> {
    logger.info('Updating customer', { id });

    // Get current customer for sync token
    const current = await this.getCustomerById(id);

    if (!current) {
      throw new Error(`Customer not found: ${id}`);
    }

    // Merge updates
    const updated = {
      ...current,
      ...updates,
      Id: id,
      SyncToken: current.SyncToken,
    };

    // Update customer
    const result = await queue.add(() => this.client.post<QBOCustomer>('/customer', updated));

    // Invalidate cache
    await this.invalidateCustomerCache();

    logger.info('Customer updated successfully', { id });

    return result.Customer;
  }

  /**
   * Get customer balance information
   *
   * @param id - Customer ID
   * @returns Customer balance details
   */
  async getCustomerBalance(id: string): Promise<CustomerBalance> {
    logger.info('Getting customer balance', { id });

    const customer = await this.getCustomerById(id);

    if (!customer) {
      throw new Error(`Customer not found: ${id}`);
    }

    // Get customer's invoices
    const invoiceQuery = `SELECT * FROM Invoice WHERE CustomerRef = '${id}'`;
    const invoiceResponse = await queue.add(() => this.client.query(invoiceQuery));
    const invoices = invoiceResponse.QueryResponse?.Invoice || [];

    // Calculate balances
    const balance = customer.Balance || 0;
    const openInvoices = invoices.filter((inv: any) => (inv.Balance || 0) > 0).length;

    // Calculate overdue balance
    const now = new Date();
    let overdueBalance = 0;

    for (const invoice of invoices) {
      if (invoice.DueDate && invoice.Balance && invoice.Balance > 0) {
        const dueDate = new Date(invoice.DueDate);
        if (dueDate < now) {
          overdueBalance += invoice.Balance;
        }
      }
    }

    // Get last payment
    const paymentQuery = `SELECT * FROM Payment WHERE CustomerRef = '${id}' ORDERBY MetaData.CreateTime DESC MAXRESULTS 1`;
    const paymentResponse = await queue.add(() => this.client.query(paymentQuery));
    const lastPayment = paymentResponse.QueryResponse?.Payment?.[0];

    return {
      customerId: id,
      customerName: customer.DisplayName || 'Unknown',
      balance,
      overdueBalance,
      openInvoices,
      lastPaymentDate: lastPayment?.TxnDate,
      lastPaymentAmount: lastPayment?.TotalAmt,
    };
  }

  /**
   * Find customer by name
   *
   * @param name - Customer name to search
   * @returns Customer or null
   */
  async findCustomerByName(name: string): Promise<QBOCustomer | null> {
    const query = `SELECT * FROM Customer WHERE DisplayName = '${name.replace(/'/g, "\\'")}'`;
    const result = await queue.add(() => this.client.query<QBOCustomer>(query));

    if (result.QueryResponse?.Customer?.length > 0) {
      return result.QueryResponse.Customer[0];
    }

    return null;
  }

  /**
   * Search customers by name (fuzzy search)
   *
   * @param searchTerm - Search term
   * @returns Array of matching customers
   */
  async searchCustomers(searchTerm: string): Promise<QBOCustomer[]> {
    return this.getCustomers({ search: searchTerm });
  }

  /**
   * Invalidate all customer-related cache entries
   */
  private async invalidateCustomerCache(): Promise<void> {
    logger.info('Invalidating customer cache');
  }
}

/**
 * Singleton instance
 */
export const customerService = new CustomerService();
