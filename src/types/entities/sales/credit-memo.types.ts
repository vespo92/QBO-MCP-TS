/**
 * Credit Memo entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillAddr, QBOShipAddr } from '../common/address.types.js';
import type { QBOInvoiceLine, QBOTxnTaxDetail } from './invoice.types.js';
import type {
  QBOCustomerRef,
  QBODepartmentRef,
  QBOClassRef
} from '../common/reference.types.js';

/**
 * QuickBooks Credit Memo entity
 */
export interface QBOCreditMemo extends QBOBaseTransaction {
  CustomerRef: QBOCustomerRef;
  Line: QBOInvoiceLine[];
  TotalAmt: number;
  HomeTotalAmt?: number;
  Balance?: number;
  HomeBalance?: number;
  RemainingCredit?: number;
  BillAddr?: QBOBillAddr;
  ShipAddr?: QBOShipAddr;
  CustomerMemo?: {
    value: string;
  };
  BillEmail?: {
    Address: string;
  };
  SalesTermRef?: {
    value: string;
    name?: string;
  };
  DepartmentRef?: QBODepartmentRef;
  ClassRef?: QBOClassRef;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: QBOTxnTaxDetail;
  PrintStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  ApplyTaxAfterDiscount?: boolean;
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
  InvoiceRef?: {
    value: string;
    name?: string;
  };
}

/**
 * Credit memo input for create/update
 */
export interface QBOCreditMemoInput {
  CustomerRef: { value: string };
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: 'SalesItemLineDetail';
    SalesItemLineDetail?: {
      ItemRef?: { value: string };
      UnitPrice?: number;
      Qty?: number;
      TaxCodeRef?: { value: string };
    };
  }>;
  TxnDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  CustomerMemo?: { value: string };
  BillAddr?: QBOBillAddr;
  BillEmail?: { Address: string };
  DepartmentRef?: { value: string };
  ClassRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetCreditMemosSchema = z.object({
  customerName: z.string().optional().describe('Filter by customer name'),
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  hasBalance: z.boolean().optional().describe('Filter by remaining balance'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateCreditMemoSchema = z.object({
  customerName: z.string().describe('Customer name'),
  items: z.array(z.object({
    description: z.string().describe('Item description'),
    amount: z.number().positive().describe('Line amount'),
    quantity: z.number().positive().optional().describe('Quantity'),
    unitPrice: z.number().positive().optional().describe('Unit price'),
    itemId: z.string().optional().describe('Item/Product ID'),
  })).min(1).describe('Line items'),
  date: z.string().optional().describe('Transaction date'),
  memo: z.string().optional().describe('Customer-facing memo'),
  privateNote: z.string().optional().describe('Internal note'),
  invoiceId: z.string().optional().describe('Related invoice ID'),
});

export const ApplyCreditMemoSchema = z.object({
  creditMemoId: z.string().describe('Credit Memo ID'),
  invoiceId: z.string().describe('Invoice ID to apply credit to'),
  amount: z.number().positive().optional().describe('Amount to apply (defaults to full credit)'),
});

export const SendCreditMemoSchema = z.object({
  creditMemoId: z.string().describe('Credit Memo ID'),
  email: z.string().email().optional().describe('Override email address'),
});

export const VoidCreditMemoSchema = z.object({
  creditMemoId: z.string().describe('Credit Memo ID to void'),
});

export type GetCreditMemosParams = z.infer<typeof GetCreditMemosSchema>;
export type CreateCreditMemoParams = z.infer<typeof CreateCreditMemoSchema>;
export type ApplyCreditMemoParams = z.infer<typeof ApplyCreditMemoSchema>;
export type SendCreditMemoParams = z.infer<typeof SendCreditMemoSchema>;
export type VoidCreditMemoParams = z.infer<typeof VoidCreditMemoSchema>;
