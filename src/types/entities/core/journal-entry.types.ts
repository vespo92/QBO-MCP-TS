/**
 * Journal Entry entity types
 */

import { z } from 'zod';
import type {
  QBOBaseTransaction,
  QBOBaseLine,
  QBOCurrencyRef
} from '../common/base.types.js';
import type {
  QBOAccountRef,
  QBOClassRef,
  QBODepartmentRef,
  QBOCustomerRef,
  QBOVendorRef,
  QBOEmployeeRef
} from '../common/reference.types.js';

/**
 * Journal entry posting type
 */
export type QBOJournalEntryPostingType = 'Debit' | 'Credit';

/**
 * Journal entry line detail
 */
export interface QBOJournalEntryLineDetail {
  PostingType: QBOJournalEntryPostingType;
  AccountRef: QBOAccountRef;
  ClassRef?: QBOClassRef;
  DepartmentRef?: QBODepartmentRef;
  Entity?: {
    EntityRef: QBOCustomerRef | QBOVendorRef | QBOEmployeeRef;
    Type: 'Customer' | 'Vendor' | 'Employee';
  };
  TaxCodeRef?: {
    value: string;
  };
  TaxApplicableOn?: 'Purchase' | 'Sales';
  TaxAmount?: number;
  BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
}

/**
 * Journal entry line item
 */
export interface QBOJournalEntryLine extends QBOBaseLine {
  DetailType: 'JournalEntryLineDetail';
  JournalEntryLineDetail: QBOJournalEntryLineDetail;
}

/**
 * QuickBooks Journal Entry entity
 */
export interface QBOJournalEntry extends QBOBaseTransaction {
  Line: QBOJournalEntryLine[];
  TotalAmt?: number;
  HomeTotalAmt?: number;
  Adjustment?: boolean;
  CurrencyRef?: QBOCurrencyRef;
  ExchangeRate?: number;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: {
    TotalTax?: number;
    TaxLine?: Array<{
      Amount: number;
      DetailType: 'TaxLineDetail';
      TaxLineDetail: {
        TaxRateRef: { value: string };
        PercentBased?: boolean;
        NetAmountTaxable?: number;
        TaxPercent?: number;
      };
    }>;
  };
}

/**
 * Journal entry create/update input
 */
export interface QBOJournalEntryInput {
  TxnDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: 'JournalEntryLineDetail';
    JournalEntryLineDetail: {
      PostingType: QBOJournalEntryPostingType;
      AccountRef: { value: string };
      ClassRef?: { value: string };
      DepartmentRef?: { value: string };
      Entity?: {
        EntityRef: { value: string };
        Type: 'Customer' | 'Vendor' | 'Employee';
      };
    };
  }>;
  CurrencyRef?: { value: string };
  ExchangeRate?: number;
  Adjustment?: boolean;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetJournalEntriesSchema = z.object({
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  accountId: z.string().optional().describe('Filter by account ID'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateJournalEntrySchema = z.object({
  date: z.string().optional().describe('Transaction date (YYYY-MM-DD)'),
  docNumber: z.string().optional().describe('Document/reference number'),
  memo: z.string().optional().describe('Private note/memo'),
  lines: z.array(z.object({
    accountId: z.string().describe('Account ID'),
    accountName: z.string().optional().describe('Account name (for lookup)'),
    description: z.string().optional().describe('Line description'),
    debit: z.number().optional().describe('Debit amount'),
    credit: z.number().optional().describe('Credit amount'),
    customerId: z.string().optional().describe('Associated customer ID'),
    vendorId: z.string().optional().describe('Associated vendor ID'),
    classId: z.string().optional().describe('Class ID'),
    departmentId: z.string().optional().describe('Department ID'),
  })).min(2).describe('At least 2 lines required (debits must equal credits)'),
  adjustment: z.boolean().optional().describe('Is this an adjusting entry'),
});

export const VoidJournalEntrySchema = z.object({
  journalEntryId: z.string().describe('Journal Entry ID to void'),
});

export type GetJournalEntriesParams = z.infer<typeof GetJournalEntriesSchema>;
export type CreateJournalEntryParams = z.infer<typeof CreateJournalEntrySchema>;
export type VoidJournalEntryParams = z.infer<typeof VoidJournalEntrySchema>;
