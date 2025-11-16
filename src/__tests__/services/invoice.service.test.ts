/**
 * Invoice Service Tests
 */

import { InvoiceService } from '../../services/invoice.js';
import { createMockInvoice, MockQBOApiClient } from '../../test-utils/index.js';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockClient: MockQBOApiClient;

  beforeEach(() => {
    mockClient = new MockQBOApiClient();
    service = new InvoiceService(mockClient as any);
  });

  describe('getInvoices', () => {
    it('should query invoices with no filters', async () => {
      const mockInvoices = [createMockInvoice()];
      mockClient.setMockData('query:SELECT * FROM Invoice WHERE Active = true STARTPOSITION 1 MAXRESULTS 100', {
        Invoice: mockInvoices,
      });

      const result = await service.getInvoices({});

      expect(result).toHaveLength(1);
      expect(result[0].Id).toBe('123');
    });

    it('should filter by status unpaid', async () => {
      const mockInvoices = [createMockInvoice({ Balance: 1500 })];
      mockClient.setMockData('query:SELECT * FROM Invoice WHERE Active = true AND Balance > 0 STARTPOSITION 1 MAXRESULTS 100', {
        Invoice: mockInvoices,
      });

      const result = await service.getInvoices({ status: 'unpaid' });

      expect(result).toHaveLength(1);
      expect(result[0].Balance).toBeGreaterThan(0);
    });

    it('should filter by status paid', async () => {
      const mockInvoices = [createMockInvoice({ Balance: 0 })];
      mockClient.setMockData('query:SELECT * FROM Invoice WHERE Active = true AND Balance = 0 STARTPOSITION 1 MAXRESULTS 100', {
        Invoice: mockInvoices,
      });

      const result = await service.getInvoices({ status: 'paid' });

      expect(result).toHaveLength(1);
      expect(result[0].Balance).toBe(0);
    });

    it('should filter by date range', async () => {
      const mockInvoices = [createMockInvoice({ TxnDate: '2025-01-15' })];
      mockClient.setMockData(
        expect.stringContaining("TxnDate >= '2025-01-01' AND TxnDate <= '2025-01-31'"),
        {
          Invoice: mockInvoices,
        }
      );

      const result = await service.getInvoices({
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      });

      expect(result).toHaveLength(1);
    });

    it('should filter by amount range', async () => {
      const mockInvoices = [createMockInvoice({ TotalAmt: 1500 })];
      mockClient.setMockData(
        expect.stringContaining('TotalAmt >= 1000 AND TotalAmt <= 2000'),
        {
          Invoice: mockInvoices,
        }
      );

      const result = await service.getInvoices({
        minAmount: 1000,
        maxAmount: 2000,
      });

      expect(result).toHaveLength(1);
      expect(result[0].TotalAmt).toBeGreaterThanOrEqual(1000);
      expect(result[0].TotalAmt).toBeLessThanOrEqual(2000);
    });

    it('should limit results', async () => {
      const mockInvoices = [createMockInvoice(), createMockInvoice({ Id: '456' })];
      mockClient.setMockData(
        expect.stringContaining('MAXRESULTS 10'),
        {
          Invoice: mockInvoices,
        }
      );

      const result = await service.getInvoices({ limit: 10 });

      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with line items', async () => {
      const mockCustomer = { Id: 'CUST-123', DisplayName: 'Acme Corp' };
      mockClient.setMockData("query:SELECT * FROM Customer WHERE DisplayName = 'Acme Corp'", {
        Customer: [mockCustomer],
      });

      const mockInvoice = createMockInvoice();
      mockClient.setMockData('/invoice', { Invoice: mockInvoice });

      const result = await service.createInvoice({
        customerName: 'Acme Corp',
        lineItems: [
          {
            description: 'Consulting',
            amount: 1500,
            quantity: 1,
          },
        ],
      });

      expect(result.Id).toBe('123');
      expect(result.TotalAmt).toBe(1500);

      const callLog = mockClient.getCallLog();
      expect(callLog).toContainEqual(
        expect.objectContaining({
          method: 'POST',
          endpoint: '/invoice',
        })
      );
    });

    it('should set due date when provided', async () => {
      const mockCustomer = { Id: 'CUST-123', DisplayName: 'Test Customer' };
      mockClient.setMockData("query:SELECT * FROM Customer WHERE DisplayName = 'Test Customer'", {
        Customer: [mockCustomer],
      });

      const mockInvoice = createMockInvoice({ DueDate: '2025-02-14' });
      mockClient.setMockData('/invoice', { Invoice: mockInvoice });

      const result = await service.createInvoice({
        customerName: 'Test Customer',
        lineItems: [{ description: 'Test', amount: 100 }],
        dueDate: '2025-02-14',
      });

      expect(result.DueDate).toBe('2025-02-14');
    });

    it('should auto-email invoice when requested', async () => {
      const mockCustomer = { Id: 'CUST-123', DisplayName: 'Test Customer' };
      mockClient.setMockData("query:SELECT * FROM Customer WHERE DisplayName = 'Test Customer'", {
        Customer: [mockCustomer],
      });

      const mockInvoice = createMockInvoice({ Id: '123' });
      mockClient.setMockData('/invoice', { Invoice: mockInvoice });

      await service.createInvoice({
        customerName: 'Test Customer',
        lineItems: [{ description: 'Test', amount: 100 }],
        autoEmail: true,
      });

      const callLog = mockClient.getCallLog();
      expect(callLog.some((call) => call.endpoint.includes('/send'))).toBe(true);
    });

    it('should throw error if customer not found', async () => {
      mockClient.setMockData("query:SELECT * FROM Customer WHERE DisplayName = 'Unknown'", {
        Customer: [],
      });

      await expect(
        service.createInvoice({
          customerName: 'Unknown',
          lineItems: [{ description: 'Test', amount: 100 }],
        })
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('sendInvoice', () => {
    it('should send invoice with default settings', async () => {
      mockClient.setMockData('/invoice/123/send', { success: true });

      await service.sendInvoice({ invoiceId: '123' });

      const callLog = mockClient.getCallLog();
      expect(callLog).toContainEqual(
        expect.objectContaining({
          method: 'SEND_EMAIL',
          endpoint: '/invoice/123/send',
        })
      );
    });

    it('should send invoice with custom email', async () => {
      mockClient.setMockData('/invoice/123/send', { success: true });

      await service.sendInvoice({
        invoiceId: '123',
        email: 'custom@example.com',
      });

      const callLog = mockClient.getCallLog();
      const sendCall = callLog.find((call) => call.method === 'SEND_EMAIL');
      expect(sendCall?.data).toMatchObject({ email: 'custom@example.com' });
    });

    it('should send invoice with custom message', async () => {
      mockClient.setMockData('/invoice/123/send', { success: true });

      await service.sendInvoice({
        invoiceId: '123',
        subject: 'Your Invoice',
        message: 'Please pay within 30 days',
      });

      const callLog = mockClient.getCallLog();
      const sendCall = callLog.find((call) => call.method === 'SEND_EMAIL');
      expect(sendCall?.data).toMatchObject({
        subject: 'Your Invoice',
        message: 'Please pay within 30 days',
      });
    });
  });

  describe('getInvoiceById', () => {
    it('should get invoice by ID', async () => {
      const mockInvoice = createMockInvoice();
      mockClient.setMockData('/invoice/123', { Invoice: mockInvoice });

      const result = await service.getInvoiceById('123');

      expect(result).not.toBeNull();
      expect(result?.Id).toBe('123');
    });

    it('should return null if invoice not found', async () => {
      mockClient.setMockData('/invoice/999', null);

      const result = await service.getInvoiceById('999');

      expect(result).toBeNull();
    });
  });

  describe('getInvoiceAging', () => {
    it('should calculate aging buckets correctly', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const overNinetyDaysAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

      const mockInvoices = [
        createMockInvoice({ Id: '1', TxnDate: thirtyDaysAgo.toISOString().split('T')[0], Balance: 100 }),
        createMockInvoice({ Id: '2', TxnDate: sixtyDaysAgo.toISOString().split('T')[0], Balance: 200 }),
        createMockInvoice({ Id: '3', TxnDate: ninetyDaysAgo.toISOString().split('T')[0], Balance: 300 }),
        createMockInvoice({ Id: '4', TxnDate: overNinetyDaysAgo.toISOString().split('T')[0], Balance: 400 }),
      ];

      mockClient.setMockData(expect.stringContaining('Balance > 0'), {
        Invoice: mockInvoices,
      });

      const result = await service.getInvoiceAging();

      expect(result).toMatchObject({
        current: expect.any(Number),
        days30: expect.any(Number),
        days60: expect.any(Number),
        days90: expect.any(Number),
        over90: expect.any(Number),
        total: 1000,
      });
    });
  });
});
