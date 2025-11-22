/**
 * Inventory Item types - Re-exports from sales/item.types.ts with inventory-specific additions
 */

// Re-export the main item types
export {
  QBOItem,
  QBOItemType,
  QBOItemInput,
  GetItemsSchema,
  CreateItemSchema,
  UpdateItemSchema,
  AdjustItemQuantitySchema,
  type GetItemsParams,
  type CreateItemParams,
  type UpdateItemParams,
  type AdjustItemQuantityParams,
} from '../sales/item.types.js';
