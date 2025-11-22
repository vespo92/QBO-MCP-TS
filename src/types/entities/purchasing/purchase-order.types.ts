/**
 * Purchase Order entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOBillLine } from './bill.types.js';
import type { QBOShipAddr } from '../common/address.types.js';
import type {
  QBOVendorRef,
  QBOAPAccountRef,
  QBOClassRef,
  QBODepartmentRef,
  QBOTermRef
} from '../common/reference.types.js';

/**
 * Purchase order status
 */
export type QBOPurchaseOrderStatus = 'Open' | 'Closed';

/**
 * QuickBooks Purchase Order entity
 */
export interface QBOPurchaseOrder extends QBOBaseTransaction {
  VendorRef: QBOVendorRef;
  Line: QBOBillLine[];
  TotalAmt: number;
  POStatus?: QBOPurchaseOrderStatus;
  APAccountRef?: QBOAPAccountRef;
  DueDate?: string;
  ExpectedDate?: string;
  ShipAddr?: QBOShipAddr;
  ShipMethodRef?: {
    value: string;
    name?: string;
  };
  FOB?: string;
  Memo?: string;
  VendorAddr?: {
    Id?: string;
    Line1?: string;
    Line2?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
    Country?: string;
  };
  SalesTermRef?: QBOTermRef;
  ClassRef?: QBOClassRef;
  DepartmentRef?: QBODepartmentRef;
  GlobalTaxCalculation?: 'TaxExcluded' | 'TaxInclusive' | 'NotApplicable';
  TxnTaxDetail?: {
    TotalTax?: number;
  };
  ExchangeRate?: number;
  CurrencyRef?: QBOCurrencyRef;
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  POEmail?: {
    Address: string;
  };
}

/**
 * Purchase order input for create/update
 */
export interface QBOPurchaseOrderInput {
  VendorRef: { value: string };
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: 'ItemBasedExpenseLineDetail';
    ItemBasedExpenseLineDetail: {
      ItemRef: { value: string };
      UnitPrice?: number;
      Qty?: number;
      ClassRef?: { value: string };
      CustomerRef?: { value: string };
    };
  }>;
  TxnDate?: string;
  DueDate?: string;
  ExpectedDate?: string;
  DocNumber?: string;
  PrivateNote?: string;
  Memo?: string;
  ShipAddr?: QBOShipAddr;
  VendorAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  SalesTermRef?: { value: string };
  ShipMethodRef?: { value: string };
  POEmail?: { Address: string };
  ClassRef?: { value: string };
  DepartmentRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetPurchaseOrdersSchema = z.object({
  vendorName: z.string().optional().describe('Filter by vendor'),
  status: z.enum(['Open', 'Closed', 'all']).optional().describe('PO status'),
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreatePurchaseOrderSchema = z.object({
  vendorName: z.string().describe('Vendor name'),
  items: z.array(z.object({
    itemName: z.string().describe('Item/product name'),
    description: z.string().optional().describe('Description'),
    quantity: z.number().positive().describe('Quantity'),
    unitPrice: z.number().positive().describe('Unit price'),
    customerName: z.string().optional().describe('Customer (for drop ship)'),
    classId: z.string().optional().describe('Class ID'),
  })).min(1).describe('Line items'),
  date: z.string().optional().describe('PO date'),
  dueDate: z.string().optional().describe('Due date'),
  expectedDate: z.string().optional().describe('Expected delivery date'),
  poNumber: z.string().optional().describe('PO number'),
  vendorMessage: z.string().optional().describe('Vendor memo'),
  privateNote: z.string().optional().describe('Internal note'),
  shippingAddress: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional().describe('Ship to address'),
  terms: z.string().optional().describe('Payment terms'),
  emailToPO: z.boolean().optional().describe('Email PO to vendor'),
});

export const UpdatePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().describe('PO ID'),
  vendorName: z.string().optional().describe('Vendor'),
  status: z.enum(['Open', 'Closed']).optional().describe('PO status'),
  dueDate: z.string().optional().describe('Due date'),
  expectedDate: z.string().optional().describe('Expected date'),
  memo: z.string().optional().describe('Memo'),
});

export const ClosePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().describe('PO ID to close'),
});

export const ConvertPOToBillSchema = z.object({
  purchaseOrderId: z.string().describe('PO ID to convert'),
  billDate: z.string().optional().describe('Bill date'),
  billNumber: z.string().optional().describe('Bill number'),
});

export const SendPurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().describe('PO ID'),
  email: z.string().email().optional().describe('Override email'),
});

export type GetPurchaseOrdersParams = z.infer<typeof GetPurchaseOrdersSchema>;
export type CreatePurchaseOrderParams = z.infer<typeof CreatePurchaseOrderSchema>;
export type UpdatePurchaseOrderParams = z.infer<typeof UpdatePurchaseOrderSchema>;
export type ClosePurchaseOrderParams = z.infer<typeof ClosePurchaseOrderSchema>;
export type ConvertPOToBillParams = z.infer<typeof ConvertPOToBillSchema>;
export type SendPurchaseOrderParams = z.infer<typeof SendPurchaseOrderSchema>;
