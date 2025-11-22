/**
 * Invoice entity types - Extended
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOBaseLine, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillAddr, QBOShipAddr, QBODeliveryInfo } from '../common/address.types.js';
import type {
  QBOCustomerRef,
  QBOAccountRef,
  QBOItemRef,
  QBOClassRef,
  QBODepartmentRef,
  QBOTaxCodeRef,
  QBOTermRef,
  QBODepositToAccountRef
} from '../common/reference.types.js';

/**
 * Sales item line detail
 */
export interface QBOSalesItemLineDetail {
  ItemRef?: QBOItemRef;
  ClassRef?: QBOClassRef;
  UnitPrice?: number;
  RatePercent?: number;
  Qty?: number;
  TaxCodeRef?: QBOTaxCodeRef;
  ServiceDate?: string;
  ItemAccountRef?: QBOAccountRef;
  TaxInclusiveAmt?: number;
  DiscountRate?: number;
  DiscountAmt?: number;
}

/**
 * Discount line detail
 */
export interface QBODiscountLineDetail {
  DiscountRef?: {
    value: string;
    name?: string;
  };
  PercentBased?: boolean;
  DiscountPercent?: number;
  DiscountAccountRef?: QBOAccountRef;
}

/**
 * Sub-total line detail
 */
export interface QBOSubTotalLineDetail {
  ItemRef?: QBOItemRef;
}

/**
 * Group line detail
 */
export interface QBOGroupLineDetail {
  GroupItemRef: QBOItemRef;
  Quantity: number;
  Line?: QBOInvoiceLine[];
}

/**
 * Invoice line item
 */
export interface QBOInvoiceLine extends QBOBaseLine {
  DetailType: 'SalesItemLineDetail' | 'GroupLineDetail' | 'DescriptionOnly' | 'DiscountLineDetail' | 'SubTotalLineDetail';
  SalesItemLineDetail?: QBOSalesItemLineDetail;
  GroupLineDetail?: QBOGroupLineDetail;
  DiscountLineDetail?: QBODiscountLineDetail;
  SubTotalLineDetail?: QBOSubTotalLineDetail;
}

/**
 * Tax detail
 */
export interface QBOTxnTaxDetail {
  TxnTaxCodeRef?: {
    value: string;
    name?: string;
  };
  TotalTax?: number;
  TaxLine?: Array<{
    Amount: number;
    DetailType: 'TaxLineDetail';
    TaxLineDetail: {
      TaxRateRef: { value: string; name?: string };
      PercentBased?: boolean;
      TaxPercent?: number;
      NetAmountTaxable?: number;
      TaxInclusiveAmount?: number;
      OverrideDeltaAmount?: number;
    };
  }>;
}

/**
 * QuickBooks Invoice entity (Extended)
 */
export interface QBOInvoice extends QBOBaseTransaction {
  CustomerRef: QBOCustomerRef;
  Line: QBOInvoiceLine[];
  TotalAmt: number;
  Balance?: number;
  HomeBalance?: number;
  HomeTotalAmt?: number;
  DueDate?: string;
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
  BillEmailCc?: {
    Address: string;
  };
  BillEmailBcc?: {
    Address: string;
  };
  SalesTermRef?: QBOTermRef;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: QBOTxnTaxDetail;
  DepartmentRef?: QBODepartmentRef;
  Deposit?: number;
  DepositToAccountRef?: QBODepositToAccountRef;
  DeliveryInfo?: QBODeliveryInfo;
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  PrintStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
  ApplyTaxAfterDiscount?: boolean;
  AllowIPNPayment?: boolean;
  AllowOnlinePayment?: boolean;
  AllowOnlineCreditCardPayment?: boolean;
  AllowOnlineACHPayment?: boolean;
  ECloudStatusTimeStamp?: string;
  FreeFormAddress?: boolean;
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
  RecurDataRef?: {
    value: string;
  };
  InvoiceLink?: string;
  TaxExemptionRef?: {
    value: string;
  };
}

// Re-export existing schemas
export { GetInvoicesSchema, CreateInvoiceSchema, SendInvoiceSchema } from '../../index.js';

// Additional invoice schemas
export const UpdateInvoiceSchema = z.object({
  invoiceId: z.string().describe('Invoice ID to update'),
  customerName: z.string().optional().describe('Customer name'),
  dueDate: z.string().optional().describe('Due date'),
  items: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
    quantity: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
  })).optional().describe('Line items'),
  memo: z.string().optional().describe('Customer memo'),
  privateNote: z.string().optional().describe('Private note'),
});

export const VoidInvoiceSchema = z.object({
  invoiceId: z.string().describe('Invoice ID to void'),
});

export const DeleteInvoiceSchema = z.object({
  invoiceId: z.string().describe('Invoice ID to delete'),
});

export type UpdateInvoiceParams = z.infer<typeof UpdateInvoiceSchema>;
export type VoidInvoiceParams = z.infer<typeof VoidInvoiceSchema>;
export type DeleteInvoiceParams = z.infer<typeof DeleteInvoiceSchema>;
