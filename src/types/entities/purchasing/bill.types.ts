/**
 * Bill entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOBaseLine, QBOCurrencyRef } from '../common/base.types.js';
import type {
  QBOVendorRef,
  QBOAccountRef,
  QBOItemRef,
  QBOClassRef,
  QBODepartmentRef,
  QBOTaxCodeRef,
  QBOCustomerRef,
  QBOTermRef,
  QBOAPAccountRef
} from '../common/reference.types.js';

/**
 * Account-based expense line detail
 */
export interface QBOAccountBasedExpenseLineDetail {
  AccountRef: QBOAccountRef;
  ClassRef?: QBOClassRef;
  TaxCodeRef?: QBOTaxCodeRef;
  TaxAmount?: number;
  BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
  CustomerRef?: QBOCustomerRef;
  MarkupInfo?: {
    PercentBased?: boolean;
    Percent?: number;
    Value?: number;
    PriceLevelRef?: { value: string };
    MarkUpIncomeAccountRef?: QBOAccountRef;
  };
}

/**
 * Item-based expense line detail
 */
export interface QBOItemBasedExpenseLineDetail {
  ItemRef: QBOItemRef;
  ClassRef?: QBOClassRef;
  UnitPrice?: number;
  Qty?: number;
  TaxCodeRef?: QBOTaxCodeRef;
  TaxAmount?: number;
  BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
  CustomerRef?: QBOCustomerRef;
  MarkupInfo?: {
    PercentBased?: boolean;
    Percent?: number;
    Value?: number;
    MarkUpIncomeAccountRef?: QBOAccountRef;
  };
}

/**
 * Bill line item
 */
export interface QBOBillLine extends QBOBaseLine {
  DetailType: 'AccountBasedExpenseLineDetail' | 'ItemBasedExpenseLineDetail';
  AccountBasedExpenseLineDetail?: QBOAccountBasedExpenseLineDetail;
  ItemBasedExpenseLineDetail?: QBOItemBasedExpenseLineDetail;
}

/**
 * QuickBooks Bill entity
 */
export interface QBOBill extends QBOBaseTransaction {
  VendorRef: QBOVendorRef;
  Line: QBOBillLine[];
  TotalAmt: number;
  Balance?: number;
  HomeBalance?: number;
  DueDate?: string;
  APAccountRef?: QBOAPAccountRef;
  SalesTermRef?: QBOTermRef;
  DepartmentRef?: QBODepartmentRef;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: {
    TxnTaxCodeRef?: { value: string };
    TotalTax?: number;
    TaxLine?: Array<{
      Amount: number;
      DetailType: 'TaxLineDetail';
      TaxLineDetail: {
        TaxRateRef: { value: string };
        PercentBased?: boolean;
        TaxPercent?: number;
        NetAmountTaxable?: number;
      };
    }>;
  };
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
}

/**
 * Bill input for create/update
 */
export interface QBOBillInput {
  VendorRef: { value: string };
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: 'AccountBasedExpenseLineDetail' | 'ItemBasedExpenseLineDetail';
    AccountBasedExpenseLineDetail?: {
      AccountRef: { value: string };
      ClassRef?: { value: string };
      TaxCodeRef?: { value: string };
      CustomerRef?: { value: string };
      BillableStatus?: 'Billable' | 'NotBillable';
    };
    ItemBasedExpenseLineDetail?: {
      ItemRef: { value: string };
      UnitPrice?: number;
      Qty?: number;
      ClassRef?: { value: string };
      TaxCodeRef?: { value: string };
      CustomerRef?: { value: string };
      BillableStatus?: 'Billable' | 'NotBillable';
    };
  }>;
  TxnDate?: string;
  DueDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  SalesTermRef?: { value: string };
  DepartmentRef?: { value: string };
  APAccountRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetBillsSchema = z.object({
  vendorName: z.string().optional().describe('Filter by vendor name'),
  status: z.enum(['unpaid', 'paid', 'overdue', 'all']).optional().describe('Filter by status'),
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  dueDateFrom: z.string().optional().describe('Due date start'),
  dueDateTo: z.string().optional().describe('Due date end'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateBillSchema = z.object({
  vendorName: z.string().describe('Vendor name'),
  lines: z.array(z.object({
    accountName: z.string().optional().describe('Expense account'),
    itemName: z.string().optional().describe('Item name (for item-based)'),
    description: z.string().optional().describe('Description'),
    amount: z.number().positive().describe('Line amount'),
    quantity: z.number().positive().optional().describe('Quantity'),
    unitPrice: z.number().positive().optional().describe('Unit price'),
    customerName: z.string().optional().describe('Customer for billable'),
    billable: z.boolean().optional().describe('Is billable'),
    classId: z.string().optional().describe('Class ID'),
  })).min(1).describe('Line items'),
  date: z.string().optional().describe('Bill date'),
  dueDate: z.string().optional().describe('Due date'),
  referenceNumber: z.string().optional().describe('Bill/reference number'),
  memo: z.string().optional().describe('Private note'),
  terms: z.string().optional().describe('Payment terms'),
  departmentId: z.string().optional().describe('Department ID'),
});

export const UpdateBillSchema = z.object({
  billId: z.string().describe('Bill ID'),
  vendorName: z.string().optional().describe('Vendor'),
  dueDate: z.string().optional().describe('Due date'),
  lines: z.array(z.object({
    accountName: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().positive(),
  })).optional().describe('Line items'),
  memo: z.string().optional().describe('Memo'),
});

export const VoidBillSchema = z.object({
  billId: z.string().describe('Bill ID to void'),
});

export const DeleteBillSchema = z.object({
  billId: z.string().describe('Bill ID to delete'),
});

export type GetBillsParams = z.infer<typeof GetBillsSchema>;
export type CreateBillParams = z.infer<typeof CreateBillSchema>;
export type UpdateBillParams = z.infer<typeof UpdateBillSchema>;
export type VoidBillParams = z.infer<typeof VoidBillSchema>;
export type DeleteBillParams = z.infer<typeof DeleteBillSchema>;
