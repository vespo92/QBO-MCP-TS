/**
 * Sales Receipt entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillAddr, QBOShipAddr, QBODeliveryInfo } from '../common/address.types.js';
import type { QBOInvoiceLine, QBOTxnTaxDetail } from './invoice.types.js';
import type {
  QBOCustomerRef,
  QBODepartmentRef,
  QBOClassRef,
  QBODepositToAccountRef,
  QBOPaymentMethodRef
} from '../common/reference.types.js';

/**
 * QuickBooks Sales Receipt entity
 */
export interface QBOSalesReceipt extends QBOBaseTransaction {
  CustomerRef?: QBOCustomerRef;
  Line: QBOInvoiceLine[];
  TotalAmt: number;
  HomeTotalAmt?: number;
  Balance?: number;
  HomeBalance?: number;
  BillAddr?: QBOBillAddr;
  ShipAddr?: QBOShipAddr;
  ShipMethodRef?: {
    value: string;
    name?: string;
  };
  ShipDate?: string;
  TrackingNum?: string;
  ShipFromAddr?: QBOShipAddr;
  CustomerMemo?: {
    value: string;
  };
  BillEmail?: {
    Address: string;
  };
  DepositToAccountRef?: QBODepositToAccountRef;
  PaymentMethodRef?: QBOPaymentMethodRef;
  PaymentRefNum?: string;
  CreditCardPayment?: {
    CreditChargeInfo?: {
      ProcessPayment?: boolean;
      Amount?: number;
    };
    CreditChargeResponse?: {
      AuthCode?: string;
      CCTransId?: string;
      Status?: string;
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
  FreeFormAddress?: boolean;
}

/**
 * Sales receipt input for create/update
 */
export interface QBOSalesReceiptInput {
  CustomerRef?: { value: string };
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
  ShipAddr?: QBOShipAddr;
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

export const GetSalesReceiptsSchema = z.object({
  customerName: z.string().optional().describe('Filter by customer name'),
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  paymentMethod: z.string().optional().describe('Filter by payment method'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateSalesReceiptSchema = z.object({
  customerName: z.string().optional().describe('Customer name (optional for cash sales)'),
  items: z.array(z.object({
    description: z.string().describe('Item description'),
    amount: z.number().positive().describe('Line amount'),
    quantity: z.number().positive().optional().describe('Quantity'),
    unitPrice: z.number().positive().optional().describe('Unit price'),
    itemId: z.string().optional().describe('Item/Product ID'),
  })).min(1).describe('Line items'),
  paymentMethod: z.string().optional().describe('Payment method name or ID'),
  depositTo: z.string().optional().describe('Deposit to account name or ID'),
  referenceNumber: z.string().optional().describe('Reference/check number'),
  memo: z.string().optional().describe('Customer-facing memo'),
  privateNote: z.string().optional().describe('Internal note'),
  emailToCustomer: z.boolean().optional().describe('Send receipt via email'),
  date: z.string().optional().describe('Transaction date'),
});

export const SendSalesReceiptSchema = z.object({
  salesReceiptId: z.string().describe('Sales Receipt ID'),
  email: z.string().email().optional().describe('Override email address'),
});

export const VoidSalesReceiptSchema = z.object({
  salesReceiptId: z.string().describe('Sales Receipt ID to void'),
});

export type GetSalesReceiptsParams = z.infer<typeof GetSalesReceiptsSchema>;
export type CreateSalesReceiptParams = z.infer<typeof CreateSalesReceiptSchema>;
export type SendSalesReceiptParams = z.infer<typeof SendSalesReceiptSchema>;
export type VoidSalesReceiptParams = z.infer<typeof VoidSalesReceiptSchema>;
