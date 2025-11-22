/**
 * Inventory Adjustment entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOBaseLine } from '../common/base.types.js';
import type { QBOAccountRef, QBOItemRef, QBOClassRef, QBODepartmentRef } from '../common/reference.types.js';

/**
 * Inventory adjustment line detail
 */
export interface QBOInventoryAdjustmentLineDetail {
  ItemRef: QBOItemRef;
  QtyDiff?: number;
  ValueDiff?: number;
  ClassRef?: QBOClassRef;
}

/**
 * Inventory adjustment line item
 */
export interface QBOInventoryAdjustmentLine extends QBOBaseLine {
  DetailType: 'ItemAdjustmentLineDetail';
  ItemAdjustmentLineDetail: QBOInventoryAdjustmentLineDetail;
}

/**
 * QuickBooks Inventory Adjustment entity
 * Note: This is a CorePlus API endpoint
 */
export interface QBOInventoryAdjustment extends QBOBaseTransaction {
  Line: QBOInventoryAdjustmentLine[];
  AdjustmentAccountRef: QBOAccountRef;
  DepartmentRef?: QBODepartmentRef;
  CustomerRef?: {
    value: string;
    name?: string;
  };
}

/**
 * Inventory adjustment input for create
 */
export interface QBOInventoryAdjustmentInput {
  AdjustmentAccountRef: { value: string };
  Line: Array<{
    DetailType: 'ItemAdjustmentLineDetail';
    ItemAdjustmentLineDetail: {
      ItemRef: { value: string };
      QtyDiff?: number;
      ValueDiff?: number;
      ClassRef?: { value: string };
    };
  }>;
  TxnDate?: string;
  PrivateNote?: string;
  DepartmentRef?: { value: string };
  CustomerRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetInventoryAdjustmentsSchema = z.object({
  itemName: z.string().optional().describe('Filter by item'),
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateInventoryAdjustmentSchema = z.object({
  adjustmentAccount: z.string().describe('Adjustment account (e.g., "Inventory Shrinkage")'),
  adjustments: z.array(z.object({
    itemName: z.string().describe('Item name'),
    itemId: z.string().optional().describe('Item ID'),
    quantityChange: z.number().optional().describe('Quantity adjustment (+/-)'),
    valueChange: z.number().optional().describe('Value adjustment (+/-)'),
    classId: z.string().optional().describe('Class ID'),
  })).min(1).describe('Item adjustments'),
  date: z.string().optional().describe('Adjustment date'),
  memo: z.string().optional().describe('Reason/note'),
  departmentId: z.string().optional().describe('Department ID'),
});

export const GetLowStockItemsSchema = z.object({
  threshold: z.number().optional().describe('Custom threshold (default: reorder point)'),
  includeOutOfStock: z.boolean().optional().describe('Include zero quantity items'),
});

export type GetInventoryAdjustmentsParams = z.infer<typeof GetInventoryAdjustmentsSchema>;
export type CreateInventoryAdjustmentParams = z.infer<typeof CreateInventoryAdjustmentSchema>;
export type GetLowStockItemsParams = z.infer<typeof GetLowStockItemsSchema>;
