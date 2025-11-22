/**
 * Item (Product/Service) entity types
 */

import { z } from 'zod';
import type { QBOBaseEntity } from '../common/base.types.js';
import type { QBOAccountRef, QBOTaxCodeRef, QBOClassRef } from '../common/reference.types.js';

/**
 * Item types
 */
export type QBOItemType =
  | 'Inventory'
  | 'NonInventory'
  | 'Service'
  | 'Bundle'
  | 'Group'
  | 'Category'
  | 'FixedAsset';

/**
 * QuickBooks Item entity
 */
export interface QBOItem extends QBOBaseEntity {
  Name: string;
  Sku?: string;
  Description?: string;
  Active?: boolean;
  SubItem?: boolean;
  ParentRef?: {
    value: string;
    name?: string;
  };
  Level?: number;
  FullyQualifiedName?: string;
  Taxable?: boolean;
  SalesTaxIncluded?: boolean;
  UnitPrice?: number;
  Type?: QBOItemType;
  IncomeAccountRef?: QBOAccountRef;
  ExpenseAccountRef?: QBOAccountRef;
  AssetAccountRef?: QBOAccountRef;
  PurchaseDesc?: string;
  PurchaseTaxIncluded?: boolean;
  PurchaseCost?: number;
  TrackQtyOnHand?: boolean;
  QtyOnHand?: number;
  ReorderPoint?: number;
  InvStartDate?: string;
  AbatementRate?: number;
  ReverseChargeRate?: number;
  ServiceType?: 'ADVT' | 'AIRPORTSERVICES' | 'AIRTRANSPORT' | 'AIRTRVLAGNT' | 'ARCHITECT' | 'AABORGINSERVICE';
  SalesTaxCodeRef?: QBOTaxCodeRef;
  PurchaseTaxCodeRef?: QBOTaxCodeRef;
  ClassRef?: QBOClassRef;
  PrintGroupedItems?: boolean;
  SpecialItem?: boolean;
  SpecialItemType?: 'FinanceCharge' | 'ReimbursableExpenseGroup' | 'ReimbursableExpenseSubtotal';
  ItemCategoryType?: 'Product' | 'Service';
  Source?: string;
}

/**
 * Item input for create/update
 */
export interface QBOItemInput {
  Name: string;
  Type?: QBOItemType;
  Sku?: string;
  Description?: string;
  Active?: boolean;
  SubItem?: boolean;
  ParentRef?: { value: string };
  Taxable?: boolean;
  UnitPrice?: number;
  IncomeAccountRef?: { value: string };
  ExpenseAccountRef?: { value: string };
  AssetAccountRef?: { value: string };
  PurchaseDesc?: string;
  PurchaseCost?: number;
  TrackQtyOnHand?: boolean;
  QtyOnHand?: number;
  ReorderPoint?: number;
  InvStartDate?: string;
  SalesTaxCodeRef?: { value: string };
  PurchaseTaxCodeRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetItemsSchema = z.object({
  type: z.enum(['Inventory', 'NonInventory', 'Service', 'Bundle', 'Group', 'Category', 'all'])
    .optional().describe('Filter by item type'),
  active: z.boolean().optional().describe('Filter by active status'),
  nameContains: z.string().optional().describe('Filter by name containing text'),
  sku: z.string().optional().describe('Filter by SKU'),
  minPrice: z.number().optional().describe('Minimum unit price'),
  maxPrice: z.number().optional().describe('Maximum unit price'),
  lowStock: z.boolean().optional().describe('Show items below reorder point'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateItemSchema = z.object({
  name: z.string().describe('Item name'),
  type: z.enum(['Inventory', 'NonInventory', 'Service']).describe('Item type'),
  sku: z.string().optional().describe('SKU/Item code'),
  description: z.string().optional().describe('Sales description'),
  unitPrice: z.number().positive().optional().describe('Sales price'),
  purchaseDescription: z.string().optional().describe('Purchase description'),
  purchaseCost: z.number().positive().optional().describe('Cost'),
  incomeAccountName: z.string().optional().describe('Income account'),
  expenseAccountName: z.string().optional().describe('Expense/COGS account'),
  assetAccountName: z.string().optional().describe('Asset account (for inventory)'),
  taxable: z.boolean().optional().describe('Is taxable'),
  trackQuantity: z.boolean().optional().describe('Track quantity on hand'),
  quantityOnHand: z.number().optional().describe('Starting quantity'),
  reorderPoint: z.number().optional().describe('Reorder point'),
  parentItemId: z.string().optional().describe('Parent item ID for sub-items'),
});

export const UpdateItemSchema = z.object({
  itemId: z.string().describe('Item ID to update'),
  name: z.string().optional().describe('Item name'),
  sku: z.string().optional().describe('SKU'),
  description: z.string().optional().describe('Description'),
  unitPrice: z.number().positive().optional().describe('Unit price'),
  purchaseCost: z.number().positive().optional().describe('Cost'),
  active: z.boolean().optional().describe('Active status'),
  quantityOnHand: z.number().optional().describe('Quantity'),
  reorderPoint: z.number().optional().describe('Reorder point'),
});

export const AdjustItemQuantitySchema = z.object({
  itemId: z.string().describe('Item ID'),
  adjustmentQuantity: z.number().describe('Quantity adjustment (+/-)'),
  adjustmentAccountName: z.string().optional().describe('Adjustment account'),
  memo: z.string().optional().describe('Adjustment memo'),
});

export type GetItemsParams = z.infer<typeof GetItemsSchema>;
export type CreateItemParams = z.infer<typeof CreateItemSchema>;
export type UpdateItemParams = z.infer<typeof UpdateItemSchema>;
export type AdjustItemQuantityParams = z.infer<typeof AdjustItemQuantitySchema>;
