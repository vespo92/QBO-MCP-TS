/**
 * Get Bills Tool - Query vendor bills
 */

import { z } from 'zod';
import { BaseTool, type ToolMetadata, type ToolContext } from '../base-tool.js';
import { BillService } from '../../services/bill.service.js';
import type { QBOClient } from '../../api/client.js';
import { GetBillsSchema, type GetBillsParams } from '../../types/entities/purchasing/bill.types.js';

/**
 * Response structure for bill listing
 */
interface GetBillsResponse {
  summary: string;
  count: number;
  totalAmount: string;
  totalBalance: string;
  bills: Array<{
    id: string;
    billNumber?: string;
    vendor: string;
    date: string;
    dueDate?: string;
    total: string;
    balance: string;
    status: 'Paid' | 'Unpaid' | 'Overdue';
  }>;
}

/**
 * Tool for querying bills
 */
export class GetBillsTool extends BaseTool<GetBillsParams, GetBillsResponse> {
  metadata: ToolMetadata = {
    name: 'bill_get_bills',
    description: 'Query vendor bills. Filter by vendor, status, date range, or amount. Returns bill details with payment status.',
    category: 'bill',
    tags: ['bills', 'ap', 'vendor', 'payables', 'read'],
    examples: [
      {
        description: 'Get unpaid bills',
        params: { status: 'unpaid' },
      },
      {
        description: 'Get overdue bills',
        params: { status: 'overdue' },
      },
      {
        description: 'Get bills from a vendor',
        params: { vendorName: 'Office Supplies Co' },
      },
      {
        description: 'Get bills in date range',
        params: { dateFrom: '2024-01-01', dateTo: '2024-01-31' },
      },
    ],
  };

  schema = GetBillsSchema;

  private billService: BillService;

  constructor(client: QBOClient) {
    super();
    this.billService = new BillService(client);
  }

  protected async executeImpl(
    params: GetBillsParams,
    context: ToolContext
  ): Promise<GetBillsResponse> {
    const bills = await this.billService.getBills(params);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalAmount = 0;
    let totalBalance = 0;

    const formattedBills = bills.map(bill => {
      const balance = bill.Balance || 0;
      const total = bill.TotalAmt || 0;
      totalAmount += total;
      totalBalance += balance;

      const dueDate = bill.DueDate ? new Date(bill.DueDate) : null;
      const isOverdue = dueDate && dueDate < today && balance > 0;

      let status: 'Paid' | 'Unpaid' | 'Overdue';
      if (balance === 0) {
        status = 'Paid';
      } else if (isOverdue) {
        status = 'Overdue';
      } else {
        status = 'Unpaid';
      }

      return {
        id: bill.Id,
        billNumber: bill.DocNumber,
        vendor: bill.VendorRef?.name || 'Unknown',
        date: bill.TxnDate,
        dueDate: bill.DueDate,
        total: this.formatCurrency(total),
        balance: this.formatCurrency(balance),
        status,
      };
    });

    let summary = `Found ${bills.length} bill(s)`;
    if (params.vendorName) {
      summary += ` from "${params.vendorName}"`;
    }
    if (params.status && params.status !== 'all') {
      summary += ` with status "${params.status}"`;
    }
    summary += `. Total: ${this.formatCurrency(totalAmount)}, Outstanding: ${this.formatCurrency(totalBalance)}`;

    return {
      summary,
      count: bills.length,
      totalAmount: this.formatCurrency(totalAmount),
      totalBalance: this.formatCurrency(totalBalance),
      bills: formattedBills,
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}
