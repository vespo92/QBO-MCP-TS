/**
 * Tax Code and Tax Rate entity types
 */

import { z } from 'zod';
import type { QBOBaseEntity } from '../common/base.types.js';
import type { QBOAccountRef } from '../common/reference.types.js';

/**
 * Tax rate detail
 */
export interface QBOTaxRateDetail {
  TaxRateRef: {
    value: string;
    name?: string;
  };
  TaxTypeApplicable: 'TaxOnAmount' | 'TaxOnAmountPlusTax' | 'TaxOnTax';
  TaxOrder: number;
}

/**
 * Sales tax rate list
 */
export interface QBOSalesTaxRateList {
  TaxRateDetail: QBOTaxRateDetail[];
}

/**
 * Purchase tax rate list
 */
export interface QBOPurchaseTaxRateList {
  TaxRateDetail: QBOTaxRateDetail[];
}

/**
 * QuickBooks Tax Code entity
 */
export interface QBOTaxCode extends QBOBaseEntity {
  Name: string;
  Description?: string;
  Active?: boolean;
  Hidden?: boolean;
  Taxable?: boolean;
  TaxGroup?: boolean;
  SalesTaxRateList?: QBOSalesTaxRateList;
  PurchaseTaxRateList?: QBOPurchaseTaxRateList;
}

/**
 * QuickBooks Tax Rate entity
 */
export interface QBOTaxRate extends QBOBaseEntity {
  Name: string;
  Description?: string;
  Active?: boolean;
  RateValue?: number;
  AgencyRef?: {
    value: string;
    name?: string;
  };
  TaxReturnLineRef?: {
    value: string;
    name?: string;
  };
  SpecialTaxType?: 'NONE' | 'ZERO_RATE' | 'FOREIGN_TAX' | 'REVERSE_CHARGE' | 'ADJUSTMENT_RATE';
  DisplayType?: 'ReadOnly' | 'HideInTransactionForms' | 'HideInPrintedForms';
  EffectiveTaxRate?: Array<{
    RateValue: number;
    EffectiveDate?: string;
    EndDate?: string;
  }>;
}

/**
 * Tax Agency entity
 */
export interface QBOTaxAgency extends QBOBaseEntity {
  DisplayName: string;
  TaxRegistrationNumber?: string;
  TaxTrackedOnPurchases?: boolean;
  TaxTrackedOnSales?: boolean;
  TaxOnPurchasesAccountRef?: QBOAccountRef;
  TaxOnSalesAccountRef?: QBOAccountRef;
  LastFileDate?: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetTaxCodesSchema = z.object({
  active: z.boolean().optional().describe('Filter by active status'),
  taxable: z.boolean().optional().describe('Filter by taxable status'),
  nameContains: z.string().optional().describe('Filter by name'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const GetTaxRatesSchema = z.object({
  active: z.boolean().optional().describe('Filter by active status'),
  nameContains: z.string().optional().describe('Filter by name'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateTaxCodeSchema = z.object({
  name: z.string().describe('Tax code name'),
  description: z.string().optional().describe('Tax code description'),
  taxable: z.boolean().optional().describe('Whether taxable'),
  salesTaxRateIds: z.array(z.string()).optional().describe('Sales tax rate IDs'),
  purchaseTaxRateIds: z.array(z.string()).optional().describe('Purchase tax rate IDs'),
});

export type GetTaxCodesParams = z.infer<typeof GetTaxCodesSchema>;
export type GetTaxRatesParams = z.infer<typeof GetTaxRatesSchema>;
export type CreateTaxCodeParams = z.infer<typeof CreateTaxCodeSchema>;
