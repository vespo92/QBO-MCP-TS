/**
 * Purchase (Expense) entity types - Extended
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOBaseLine, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillLine } from './bill.types.js';
import type {
  QBOVendorRef,
  QBOAccountRef,
  QBODepartmentRef,
  QBOEntityRef
} from '../common/reference.types.js';

/**
 * Payment types for purchases
 */
export type QBOPurchasePaymentType = 'Cash' | 'Check' | 'CreditCard';

/**
 * QuickBooks Purchase (Expense) entity
 */
export interface QBOPurchase extends QBOBaseTransaction {
  PaymentType: QBOPurchasePaymentType;
  AccountRef: QBOAccountRef;
  EntityRef?: QBOEntityRef;
  Line: QBOBillLine[];
  TotalAmt: number;
  DepartmentRef?: QBODepartmentRef;
  RemitToAddr?: {
    Id?: string;
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
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
  Credit?: boolean;
  PrintStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
  PurchaseEx?: any;
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
}

// Re-export existing schemas from main types
export { GetExpensesSchema, CreateExpenseSchema } from '../../index.js';

// Additional purchase schemas
export const UpdateExpenseSchema = z.object({
  expenseId: z.string().describe('Expense/Purchase ID'),
  vendorName: z.string().optional().describe('Vendor name'),
  accountName: z.string().optional().describe('Payment account'),
  lines: z.array(z.object({
    accountName: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().positive(),
  })).optional().describe('Expense lines'),
  memo: z.string().optional().describe('Memo'),
});

export const VoidExpenseSchema = z.object({
  expenseId: z.string().describe('Expense ID to void'),
});

export const DeleteExpenseSchema = z.object({
  expenseId: z.string().describe('Expense ID to delete'),
});

export type UpdateExpenseParams = z.infer<typeof UpdateExpenseSchema>;
export type VoidExpenseParams = z.infer<typeof VoidExpenseSchema>;
export type DeleteExpenseParams = z.infer<typeof DeleteExpenseSchema>;
