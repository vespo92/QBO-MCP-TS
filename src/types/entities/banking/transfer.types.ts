/**
 * Transfer entity types
 */

import { z } from 'zod';
import type { QBOBaseTransaction, QBOCurrencyRef } from '../common/base.types.js';
import type { QBOAccountRef } from '../common/reference.types.js';

/**
 * QuickBooks Transfer entity
 */
export interface QBOTransfer extends QBOBaseTransaction {
  FromAccountRef: QBOAccountRef;
  ToAccountRef: QBOAccountRef;
  Amount: number;
  CurrencyRef?: QBOCurrencyRef;
  ExchangeRate?: number;
}

/**
 * Transfer input for create/update
 */
export interface QBOTransferInput {
  FromAccountRef: { value: string };
  ToAccountRef: { value: string };
  Amount: number;
  TxnDate?: string;
  PrivateNote?: string;
  CurrencyRef?: { value: string };
  ExchangeRate?: number;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetTransfersSchema = z.object({
  fromAccount: z.string().optional().describe('Filter by source account'),
  toAccount: z.string().optional().describe('Filter by destination account'),
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
  minAmount: z.number().optional().describe('Minimum amount'),
  maxAmount: z.number().optional().describe('Maximum amount'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateTransferSchema = z.object({
  fromAccount: z.string().describe('Transfer from account (name or ID)'),
  toAccount: z.string().describe('Transfer to account (name or ID)'),
  amount: z.number().positive().describe('Transfer amount'),
  date: z.string().optional().describe('Transfer date'),
  memo: z.string().optional().describe('Private note'),
});

export const VoidTransferSchema = z.object({
  transferId: z.string().describe('Transfer ID to void'),
});

export type GetTransfersParams = z.infer<typeof GetTransfersSchema>;
export type CreateTransferParams = z.infer<typeof CreateTransferSchema>;
export type VoidTransferParams = z.infer<typeof VoidTransferSchema>;
