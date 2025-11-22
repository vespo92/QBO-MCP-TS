/**
 * Refund Receipt entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillAddr, QBOShipAddr, QBODeliveryInfo } from '../common/address.types.js';
import type { QBOInvoiceLine, QBOTxnTaxDetail } from './invoice.types.js';
import type {
  QBOCustomerRef,
  QBODepartmentRef,
  QBOClassRef,
  QBOAccountRef,
  QBOPaymentMethodRef
} from '../common/reference.types.js';

/**
 * QuickBooks Refund Receipt entity
 */
export interface QBORefundReceipt extends QBOBaseTransaction {
  CustomerRef?: QBOCustomerRef;
  Line: QBOInvoiceLine[];
  TotalAmt: number;
  HomeTotalAmt?: number;
  Balance?: number;
  BillAddr?: QBOBillAddr;
  ShipAddr?: QBOShipAddr;
  CustomerMemo?: {
    value: string;
  };
  BillEmail?: {
    Address: string;
  };
  DepositToAccountRef?: QBOAccountRef;
  PaymentMethodRef?: QBOPaymentMethodRef;
  CheckPayment?: {
    CheckNum?: string;
    Status?: string;
    NameOnAcct?: string;
    AcctNum?: string;
    BankName?: string;
  };
  CreditCardPayment?: {
    CreditChargeInfo?: {
      ProcessPayment?: boolean;
      Amount?: number;
    };
  };
  DepartmentRef?: QBODepartmentRef;
  ClassRef?: QBOClassRef;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: QBOTxnTaxDetail;
  PrintStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  DeliveryInfo?: QBODeliveryInfo;
  ApplyTaxAfterDiscount?: boolean;
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
  PaymentRefNum?: string;
  TxnSource?: string;
}

/**
 * Refund receipt input for create/update
 */
export interface QBORefundReceiptInput {
  CustomerRef?: { value: string };
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: 'SalesItemLineDetail';
    SalesItemLineDetail?: {
      ItemRef?: { value: string };
      UnitPrice?: number;
      Qty?: number;
    };
  }>;
  TxnDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  CustomerMemo?: { value: string };
  BillAddr?: QBOBillAddr;
  BillEmail?: { Address: string };
  DepositToAccountRef?: { value: string };
  PaymentMethodRef?: { value: string };
  PaymentRefNum?: string;
  DepartmentRef?: { value: string };
  ClassRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetRefundReceiptsSchema = z.object({
  customerName: z.string().optional().describe('Filter by customer name'),
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateRefundReceiptSchema = z.object({
  customerName: z.string().optional().describe('Customer name'),
  items: z.array(z.object({
    description: z.string().describe('Item description'),
    amount: z.number().positive().describe('Line amount'),
    quantity: z.number().positive().optional().describe('Quantity'),
    unitPrice: z.number().positive().optional().describe('Unit price'),
    itemId: z.string().optional().describe('Item/Product ID'),
  })).min(1).describe('Line items'),
  paymentMethod: z.string().optional().describe('Refund payment method'),
  refundFrom: z.string().optional().describe('Account to refund from'),
  referenceNumber: z.string().optional().describe('Reference number'),
  date: z.string().optional().describe('Transaction date'),
  memo: z.string().optional().describe('Customer-facing memo'),
  privateNote: z.string().optional().describe('Internal note'),
});

export const VoidRefundReceiptSchema = z.object({
  refundReceiptId: z.string().describe('Refund Receipt ID to void'),
});

export type GetRefundReceiptsParams = z.infer<typeof GetRefundReceiptsSchema>;
export type CreateRefundReceiptParams = z.infer<typeof CreateRefundReceiptSchema>;
export type VoidRefundReceiptParams = z.infer<typeof VoidRefundReceiptSchema>;
