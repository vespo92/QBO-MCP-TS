/**
 * Vendor Credit entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillLine } from './bill.types.js';
import type {
  QBOVendorRef,
  QBOAPAccountRef,
  QBODepartmentRef
} from '../common/reference.types.js';

/**
 * QuickBooks Vendor Credit entity
 */
export interface QBOVendorCredit extends QBOBaseTransaction {
  VendorRef: QBOVendorRef;
  Line: QBOBillLine[];
  TotalAmt: number;
  Balance?: number;
  APAccountRef?: QBOAPAccountRef;
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
 * Vendor credit input for create/update
 */
export interface QBOVendorCreditInput {
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
    };
    ItemBasedExpenseLineDetail?: {
      ItemRef: { value: string };
      UnitPrice?: number;
      Qty?: number;
      ClassRef?: { value: string };
      TaxCodeRef?: { value: string };
      CustomerRef?: { value: string };
    };
  }>;
  TxnDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  APAccountRef?: { value: string };
  DepartmentRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetVendorCreditsSchema = z.object({
  vendorName: z.string().optional().describe('Filter by vendor'),
  hasBalance: z.boolean().optional().describe('Filter by remaining balance'),
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateVendorCreditSchema = z.object({
  vendorName: z.string().describe('Vendor name'),
  lines: z.array(z.object({
    accountName: z.string().optional().describe('Expense account'),
    itemName: z.string().optional().describe('Item name'),
    description: z.string().optional().describe('Description'),
    amount: z.number().positive().describe('Amount'),
    quantity: z.number().positive().optional().describe('Quantity'),
    unitPrice: z.number().positive().optional().describe('Unit price'),
    customerName: z.string().optional().describe('Customer'),
    classId: z.string().optional().describe('Class ID'),
  })).min(1).describe('Credit line items'),
  date: z.string().optional().describe('Credit date'),
  referenceNumber: z.string().optional().describe('Reference number'),
  memo: z.string().optional().describe('Private note'),
});

export const ApplyVendorCreditSchema = z.object({
  vendorCreditId: z.string().describe('Vendor Credit ID'),
  billId: z.string().describe('Bill ID to apply credit to'),
  amount: z.number().positive().optional().describe('Amount to apply'),
});

export const VoidVendorCreditSchema = z.object({
  vendorCreditId: z.string().describe('Vendor Credit ID to void'),
});

export type GetVendorCreditsParams = z.infer<typeof GetVendorCreditsSchema>;
export type CreateVendorCreditParams = z.infer<typeof CreateVendorCreditSchema>;
export type ApplyVendorCreditParams = z.infer<typeof ApplyVendorCreditSchema>;
export type VoidVendorCreditParams = z.infer<typeof VoidVendorCreditSchema>;
