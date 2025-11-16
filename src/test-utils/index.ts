/**
 * Test Utilities
 *
 * Common utilities and mocks for testing QuickBooks MCP
 */

import type { QBOApiClient } from '../api/client.js';
import type { QBOInvoice, QBOCustomer, QBOExpense } from '../types/index.js';

/**
 * Mock QBO API Client
 */
export class MockQBOApiClient {
  private mockData: Map<string, any> = new Map();
  private callLog: Array<{ method: string; endpoint: string; data?: any }> = [];

  /**
   * Set mock data for an endpoint
   */
  setMockData(endpoint: string, data: any): void {
    this.mockData.set(endpoint, data);
  }

  /**
   * Get call log
   */
  getCallLog(): Array<{ method: string; endpoint: string; data?: any }> {
    return this.callLog;
  }

  /**
   * Clear call log
   */
  clearCallLog(): void {
    this.callLog = [];
  }

  /**
   * Mock GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    this.callLog.push({ method: 'GET', endpoint });

    const mockData = this.mockData.get(endpoint);
    if (mockData) {
      return mockData as T;
    }

    throw new Error(`No mock data for GET ${endpoint}`);
  }

  /**
   * Mock POST request
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    this.callLog.push({ method: 'POST', endpoint, data });

    const mockData = this.mockData.get(endpoint);
    if (mockData) {
      return mockData as T;
    }

    // Return the data as-is wrapped in response
    return { [this.getEntityName(endpoint)]: data } as T;
  }

  /**
   * Mock PUT request
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    this.callLog.push({ method: 'PUT', endpoint, data });

    const mockData = this.mockData.get(endpoint);
    if (mockData) {
      return mockData as T;
    }

    return { [this.getEntityName(endpoint)]: data } as T;
  }

  /**
   * Mock DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    this.callLog.push({ method: 'DELETE', endpoint });

    const mockData = this.mockData.get(endpoint);
    if (mockData) {
      return mockData as T;
    }

    return {} as T;
  }

  /**
   * Mock query request
   */
  async query<T>(query: string): Promise<{ QueryResponse?: any }> {
    this.callLog.push({ method: 'QUERY', endpoint: query });

    const mockData = this.mockData.get('query:' + query);
    if (mockData) {
      return { QueryResponse: mockData };
    }

    return { QueryResponse: {} };
  }

  /**
   * Mock download PDF
   */
  async downloadPDF(endpoint: string): Promise<Buffer> {
    this.callLog.push({ method: 'DOWNLOAD_PDF', endpoint });
    return Buffer.from('mock-pdf-content');
  }

  /**
   * Mock send email
   */
  async sendEmail(endpoint: string, params: any): Promise<any> {
    this.callLog.push({ method: 'SEND_EMAIL', endpoint, data: params });
    return { success: true };
  }

  /**
   * Get entity name from endpoint
   */
  private getEntityName(endpoint: string): string {
    const match = endpoint.match(/\/([a-z]+)/i);
    return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Entity';
  }
}

/**
 * Create mock invoice
 */
export function createMockInvoice(overrides?: Partial<QBOInvoice>): QBOInvoice {
  return {
    Id: '123',
    DocNumber: 'INV-001',
    TxnDate: '2025-01-15',
    DueDate: '2025-02-14',
    TotalAmt: 1500.0,
    Balance: 1500.0,
    CustomerRef: {
      value: 'CUST-123',
      name: 'Acme Corp',
    },
    Line: [
      {
        Amount: 1500.0,
        DetailType: 'SalesItemLineDetail',
        Description: 'Consulting Services',
        SalesItemLineDetail: {
          ItemRef: {
            value: 'ITEM-001',
            name: 'Consulting',
          },
          Qty: 1,
          UnitPrice: 1500.0,
        },
      },
    ],
    EmailStatus: 'NotSet',
    SyncToken: '0',
    MetaData: {
      CreateTime: '2025-01-15T10:00:00Z',
      LastUpdatedTime: '2025-01-15T10:00:00Z',
    },
    ...overrides,
  };
}

/**
 * Create mock customer
 */
export function createMockCustomer(overrides?: Partial<QBOCustomer>): QBOCustomer {
  return {
    Id: 'CUST-123',
    DisplayName: 'Acme Corp',
    CompanyName: 'Acme Corporation',
    GivenName: 'John',
    FamilyName: 'Doe',
    PrimaryEmailAddr: {
      Address: 'john@acme.com',
    },
    PrimaryPhone: {
      FreeFormNumber: '555-1234',
    },
    Balance: 5000.0,
    Active: true,
    SyncToken: '0',
    MetaData: {
      CreateTime: '2025-01-01T00:00:00Z',
      LastUpdatedTime: '2025-01-15T10:00:00Z',
    },
    ...overrides,
  };
}

/**
 * Create mock expense
 */
export function createMockExpense(overrides?: Partial<QBOExpense>): QBOExpense {
  return {
    Id: 'EXP-123',
    TxnDate: '2025-01-15',
    TotalAmt: 250.0,
    PaymentType: 'Cash',
    EntityRef: {
      value: 'VENDOR-123',
      name: 'Office Supplies Inc',
    },
    Line: [
      {
        Amount: 250.0,
        DetailType: 'AccountBasedExpenseLineDetail',
        Description: 'Office supplies',
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: 'ACC-001',
            name: 'Office Expenses',
          },
        },
      },
    ],
    SyncToken: '0',
    MetaData: {
      CreateTime: '2025-01-15T10:00:00Z',
      LastUpdatedTime: '2025-01-15T10:00:00Z',
    },
    ...overrides,
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Mock cache service
 */
export class MockCacheService {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

/**
 * Mock queue service
 */
export class MockQueueService {
  async add<T>(task: () => Promise<T>): Promise<T> {
    return task();
  }

  getStats() {
    return {
      queuedRequests: 0,
      activeRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
    };
  }
}

/**
 * Create test context with mocks
 */
export function createTestContext() {
  return {
    client: new MockQBOApiClient(),
    cache: new MockCacheService(),
    queue: new MockQueueService(),
  };
}
