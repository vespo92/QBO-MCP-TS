/**
 * Deposit entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOBaseLine, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOAccountRef, QBOClassRef, QBODepartmentRef, QBOEntityRef, QBOPaymentMethodRef } from '../common/reference.types.js';

/**
 * Deposit line detail
 */
export interface QBODepositLineDetail {
  Entity?: QBOEntityRef;
  ClassRef?: QBOClassRef;
  AccountRef?: QBOAccountRef;
  PaymentMethodRef?: QBOPaymentMethodRef;
  CheckNum?: string;
  TxnType?: string;
}

/**
 * Deposit line item
 */
export interface QBODepositLine extends QBOBaseLine {
  DetailType: 'DepositLineDetail';
  DepositLineDetail: QBODepositLineDetail;
  LinkedTxn?: Array<{
    TxnId: string;
    TxnType: string;
    TxnLineId?: string;
  }>;
}

/**
 * Cash back info
 */
export interface QBOCashBackInfo {
  AccountRef: QBOAccountRef;
  Amount: number;
  Memo?: string;
}

/**
 * QuickBooks Deposit entity
 */
export interface QBODeposit extends QBOBaseTransaction {
  DepositToAccountRef: QBOAccountRef;
  Line: QBODepositLine[];
  TotalAmt: number;
  HomeTotalAmt?: number;
  CashBack?: QBOCashBackInfo;
  DepartmentRef?: QBODepartmentRef;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: {
    TotalTax?: number;
  };
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
}

/**
 * Deposit input for create/update
 */
export interface QBODepositInput {
  DepositToAccountRef: { value: string };
  Line: Array<{
    Amount: number;
    DetailType: 'DepositLineDetail';
    DepositLineDetail: {
      Entity?: {
        EntityRef: { value: string };
        Type: 'Customer' | 'Vendor' | 'Employee';
      };
      AccountRef?: { value: string };
      PaymentMethodRef?: { value: string };
      CheckNum?: string;
    };
    LinkedTxn?: Array<{
      TxnId: string;
      TxnType: string;
    }>;
  }>;
  TxnDate?: string;
  PrivateNote?: string;
  CashBack?: {
    AccountRef: { value: string };
    Amount: number;
    Memo?: string;
  };
  DepartmentRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetDepositsSchema = z.object({
  accountName: z.string().optional().describe('Filter by deposit account'),
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateDepositSchema = z.object({
  depositToAccount: z.string().describe('Bank account to deposit to'),
  lines: z.array(z.object({
    amount: z.number().positive().describe('Line amount'),
    fromAccount: z.string().optional().describe('Source account'),
    receivedFrom: z.string().optional().describe('Entity name (customer/vendor)'),
    entityType: z.enum(['Customer', 'Vendor', 'Employee']).optional().describe('Entity type'),
    paymentMethod: z.string().optional().describe('Payment method'),
    checkNumber: z.string().optional().describe('Check number'),
    description: z.string().optional().describe('Description'),
    paymentId: z.string().optional().describe('Link to existing payment'),
  })).min(1).describe('Deposit lines'),
  date: z.string().optional().describe('Deposit date'),
  memo: z.string().optional().describe('Private note'),
  cashBack: z.object({
    accountName: z.string().describe('Cash back account'),
    amount: z.number().positive().describe('Cash back amount'),
    memo: z.string().optional().describe('Cash back memo'),
  }).optional().describe('Cash back info'),
});

export const DepositUndepositedFundsSchema = z.object({
  depositToAccount: z.string().describe('Bank account'),
  paymentIds: z.array(z.string()).optional().describe('Specific payment IDs to deposit'),
  depositAll: z.boolean().optional().describe('Deposit all undeposited funds'),
  date: z.string().optional().describe('Deposit date'),
});

export const VoidDepositSchema = z.object({
  depositId: z.string().describe('Deposit ID to void'),
});

export type GetDepositsParams = z.infer<typeof GetDepositsSchema>;
export type CreateDepositParams = z.infer<typeof CreateDepositSchema>;
export type DepositUndepositedFundsParams = z.infer<typeof DepositUndepositedFundsSchema>;
export type VoidDepositParams = z.infer<typeof VoidDepositSchema>;
