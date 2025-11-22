/**
 * Estimate (Quote) entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillAddr, QBOShipAddr } from '../common/address.types.js';
import type { QBOInvoiceLine, QBOTxnTaxDetail } from './invoice.types.js';
import type {
  QBOCustomerRef,
  QBODepartmentRef,
  QBOTermRef,
  QBOClassRef
} from '../common/reference.types.js';

/**
 * Estimate status
 */
export type QBOEstimateStatus = 'Pending' | 'Accepted' | 'Closed' | 'Rejected' | 'Converted';

/**
 * QuickBooks Estimate entity
 */
export interface QBOEstimate extends QBOBaseTransaction {
  CustomerRef: QBOCustomerRef;
  Line: QBOInvoiceLine[];
  TotalAmt: number;
  HomeTotalAmt?: number;
  TxnStatus?: QBOEstimateStatus;
  AcceptedBy?: string;
  AcceptedDate?: string;
  ExpirationDate?: string;
  BillAddr?: QBOBillAddr;
  ShipAddr?: QBOShipAddr;
  ShipMethodRef?: {
    value: string;
    name?: string;
  };
  ShipDate?: string;
  CustomerMemo?: {
    value: string;
  };
  BillEmail?: {
    Address: string;
  };
  SalesTermRef?: QBOTermRef;
  DepartmentRef?: QBODepartmentRef;
  ClassRef?: QBOClassRef;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: QBOTxnTaxDetail;
  PrintStatus?: 'NotSet' | 'NeedToPrint' | 'PrintComplete';
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  ApplyTaxAfterDiscount?: boolean;
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
  FreeFormAddress?: boolean;
}

/**
 * Estimate input for create/update
 */
export interface QBOEstimateInput {
  CustomerRef: QBOCustomerRef;
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
  ExpirationDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  CustomerMemo?: { value: string };
  BillAddr?: QBOBillAddr;
  ShipAddr?: QBOShipAddr;
  BillEmail?: { Address: string };
  SalesTermRef?: { value: string };
  DepartmentRef?: { value: string };
  ClassRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetEstimatesSchema = z.object({
  status: z.enum(['Pending', 'Accepted', 'Closed', 'Rejected', 'Converted', 'all'])
    .optional().describe('Filter by estimate status'),
  customerName: z.string().optional().describe('Filter by customer name'),
  dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateEstimateSchema = z.object({
  customerName: z.string().describe('Customer name'),
  items: z.array(z.object({
    description: z.string().describe('Item description'),
    amount: z.number().positive().describe('Line amount'),
    quantity: z.number().positive().optional().describe('Quantity'),
    unitPrice: z.number().positive().optional().describe('Unit price'),
    itemId: z.string().optional().describe('Item/Product ID'),
  })).min(1).describe('Line items'),
  expirationDate: z.string().optional().describe('Quote expiration date'),
  memo: z.string().optional().describe('Customer-facing memo'),
  privateNote: z.string().optional().describe('Internal note'),
  emailToCustomer: z.boolean().optional().describe('Send via email'),
});

export const UpdateEstimateSchema = z.object({
  estimateId: z.string().describe('Estimate ID'),
  customerName: z.string().optional().describe('Customer name'),
  status: z.enum(['Pending', 'Accepted', 'Closed', 'Rejected']).optional().describe('Status'),
  items: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
    quantity: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
  })).optional().describe('Line items'),
  expirationDate: z.string().optional().describe('Expiration date'),
  memo: z.string().optional().describe('Customer memo'),
});

export const ConvertEstimateToInvoiceSchema = z.object({
  estimateId: z.string().describe('Estimate ID to convert'),
});

export const SendEstimateSchema = z.object({
  estimateId: z.string().describe('Estimate ID'),
  email: z.string().email().optional().describe('Override email address'),
  subject: z.string().optional().describe('Email subject'),
  message: z.string().optional().describe('Email message'),
});

export type GetEstimatesParams = z.infer<typeof GetEstimatesSchema>;
export type CreateEstimateParams = z.infer<typeof CreateEstimateSchema>;
export type UpdateEstimateParams = z.infer<typeof UpdateEstimateSchema>;
export type ConvertEstimateToInvoiceParams = z.infer<typeof ConvertEstimateToInvoiceSchema>;
export type SendEstimateParams = z.infer<typeof SendEstimateSchema>;
