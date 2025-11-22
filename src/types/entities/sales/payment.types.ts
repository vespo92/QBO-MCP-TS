/**
 * Payment entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef, QBOLinkedTransaction } from '../common/base.types.js';
import type { QBOCustomerRef, QBOAccountRef, QBOPaymentMethodRef } from '../common/reference.types.js';

/**
 * Payment line linked transaction
 */
export interface QBOPaymentLinkedTxn {
  TxnId: string;
  TxnType: 'Invoice' | 'CreditMemo' | 'JournalEntry' | 'StatementCharge';
  TxnLineId?: string;
}

/**
 * Payment line item
 */
export interface QBOPaymentLine {
  Amount: number;
  LinkedTxn: QBOPaymentLinkedTxn[];
}

/**
 * Credit card payment details
 */
export interface QBOCreditCardPayment {
  CreditChargeInfo?: {
    Type?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER';
    NameOnAcct?: string;
    CcExpiryMonth?: number;
    CcExpiryYear?: number;
    BillAddrStreet?: string;
    PostalCode?: string;
    Amount?: number;
    ProcessPayment?: boolean;
  };
  CreditChargeResponse?: {
    Status?: 'Completed' | 'Unknown';
    AuthCode?: string;
    CCTransId?: string;
    TxnAuthorizationTime?: string;
    ReconBatchId?: string;
    PaymentGroupingCode?: string;
    MerchantAcctNum?: string;
    ResultType?: string;
    ResultCode?: string;
    ResultMsg?: string;
  };
}

/**
 * Check payment details
 */
export interface QBOCheckPayment {
  CheckNum?: string;
  Status?: string;
  NameOnAcct?: string;
  AcctNum?: string;
  BankName?: string;
}

/**
 * QuickBooks Payment entity
 */
export interface QBOPayment extends QBOBaseTransaction {
  CustomerRef: QBOCustomerRef;
  TotalAmt: number;
  UnappliedAmt?: number;
  Line?: QBOPaymentLine[];
  PaymentMethodRef?: QBOPaymentMethodRef;
  PaymentRefNum?: string;
  DepositToAccountRef?: QBOAccountRef;
  ARAccountRef?: QBOAccountRef;
  CreditCardPayment?: QBOCreditCardPayment;
  CheckPayment?: QBOCheckPayment;
  ProcessPayment?: boolean;
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
  TxnSource?: string;
}

/**
 * Payment input for create/update
 */
export interface QBOPaymentInput {
  CustomerRef: { value: string };
  TotalAmt: number;
  TxnDate?: string;
  PrivateNote?: string;
  PaymentMethodRef?: { value: string };
  PaymentRefNum?: string;
  DepositToAccountRef?: { value: string };
  Line?: Array<{
    Amount: number;
    LinkedTxn: Array<{
      TxnId: string;
      TxnType: string;
    }>;
  }>;
  CurrencyRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetPaymentsSchema = z.object({
  customerName: z.string().optional().describe('Filter by customer name'),
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  hasUnapplied: z.boolean().optional().describe('Filter by unapplied balance'),
  paymentMethod: z.string().optional().describe('Filter by payment method'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreatePaymentSchema = z.object({
  customerName: z.string().describe('Customer name'),
  amount: z.number().positive().describe('Payment amount'),
  paymentMethod: z.string().optional().describe('Payment method'),
  referenceNumber: z.string().optional().describe('Check/reference number'),
  depositTo: z.string().optional().describe('Deposit to account'),
  date: z.string().optional().describe('Payment date'),
  memo: z.string().optional().describe('Private note'),
  invoiceIds: z.array(z.string()).optional().describe('Invoice IDs to apply payment to'),
});

export const ApplyPaymentToInvoicesSchema = z.object({
  paymentId: z.string().describe('Payment ID'),
  applications: z.array(z.object({
    invoiceId: z.string().describe('Invoice ID'),
    amount: z.number().positive().describe('Amount to apply'),
  })).min(1).describe('Invoice applications'),
});

export const VoidPaymentSchema = z.object({
  paymentId: z.string().describe('Payment ID to void'),
});

export type GetPaymentsParams = z.infer<typeof GetPaymentsSchema>;
export type CreatePaymentParams = z.infer<typeof CreatePaymentSchema>;
export type ApplyPaymentToInvoicesParams = z.infer<typeof ApplyPaymentToInvoicesSchema>;
export type VoidPaymentParams = z.infer<typeof VoidPaymentSchema>;
