/**
 * Bill Payment entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOVendorRef, QBOAccountRef, QBOAPAccountRef } from '../common/reference.types.js';

/**
 * Bill payment types
 */
export type QBOBillPaymentType = 'Check' | 'CreditCard';

/**
 * Bill payment line linked transaction
 */
export interface QBOBillPaymentLinkedTxn {
  TxnId: string;
  TxnType: 'Bill' | 'VendorCredit' | 'JournalEntry';
  TxnLineId?: string;
}

/**
 * Bill payment line item
 */
export interface QBOBillPaymentLine {
  Amount: number;
  LinkedTxn: QBOBillPaymentLinkedTxn[];
}

/**
 * Check payment details for bill payment
 */
export interface QBOBillPaymentCheckPayment {
  BankAccountRef: QBOAccountRef;
  PrintStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
}

/**
 * Credit card payment details for bill payment
 */
export interface QBOBillPaymentCreditCardPayment {
  CCAccountRef: QBOAccountRef;
}

/**
 * QuickBooks Bill Payment entity
 */
export interface QBOBillPayment extends QBOBaseTransaction {
  VendorRef: QBOVendorRef;
  PayType: QBOBillPaymentType;
  TotalAmt: number;
  Line?: QBOBillPaymentLine[];
  APAccountRef?: QBOAPAccountRef;
  CheckPayment?: QBOBillPaymentCheckPayment;
  CreditCardPayment?: QBOBillPaymentCreditCardPayment;
  DepartmentRef?: {
    value: string;
    name?: string;
  };
  ProcessBillPayment?: boolean;
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
}

/**
 * Bill payment input for create
 */
export interface QBOBillPaymentInput {
  VendorRef: { value: string };
  PayType: QBOBillPaymentType;
  TotalAmt: number;
  TxnDate?: string;
  PrivateNote?: string;
  DocNumber?: string;
  Line?: Array<{
    Amount: number;
    LinkedTxn: Array<{
      TxnId: string;
      TxnType: 'Bill' | 'VendorCredit';
    }>;
  }>;
  APAccountRef?: { value: string };
  CheckPayment?: {
    BankAccountRef: { value: string };
    PrintStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
  };
  CreditCardPayment?: {
    CCAccountRef: { value: string };
  };
  DepartmentRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetBillPaymentsSchema = z.object({
  vendorName: z.string().optional().describe('Filter by vendor name'),
  paymentType: z.enum(['Check', 'CreditCard', 'all']).optional().describe('Payment type'),
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateBillPaymentSchema = z.object({
  vendorName: z.string().describe('Vendor name'),
  amount: z.number().positive().describe('Payment amount'),
  paymentType: z.enum(['Check', 'CreditCard']).describe('Payment type'),
  payFromAccount: z.string().describe('Bank account or credit card'),
  billIds: z.array(z.string()).optional().describe('Bill IDs to pay'),
  vendorCreditIds: z.array(z.string()).optional().describe('Vendor credits to apply'),
  date: z.string().optional().describe('Payment date'),
  checkNumber: z.string().optional().describe('Check number'),
  memo: z.string().optional().describe('Private note'),
  printCheck: z.boolean().optional().describe('Mark check for printing'),
});

export const PayBillsSchema = z.object({
  payments: z.array(z.object({
    vendorName: z.string().describe('Vendor name'),
    billId: z.string().describe('Bill ID'),
    amount: z.number().positive().describe('Payment amount'),
    paymentType: z.enum(['Check', 'CreditCard']).describe('Payment type'),
    payFromAccount: z.string().describe('Payment account'),
  })).min(1).describe('Bill payments'),
  date: z.string().optional().describe('Payment date'),
});

export const VoidBillPaymentSchema = z.object({
  billPaymentId: z.string().describe('Bill Payment ID to void'),
});

export type GetBillPaymentsParams = z.infer<typeof GetBillPaymentsSchema>;
export type CreateBillPaymentParams = z.infer<typeof CreateBillPaymentSchema>;
export type PayBillsParams = z.infer<typeof PayBillsSchema>;
export type VoidBillPaymentParams = z.infer<typeof VoidBillPaymentSchema>;
