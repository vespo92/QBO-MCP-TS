/**
 * Vendor entity types
 */

import { z } from 'zod';
import type { QBOBaseEntity, QBOCurrencyRef, QBOEmailAddress, QBOPhoneNumber, QBOWebAddress } from '../common/base.types.js';
import type { QBOBillAddr } from '../common/address.types.js';
import type { QBOTermRef, QBOAccountRef } from '../common/reference.types.js';

/**
 * QuickBooks Vendor entity
 */
export interface QBOVendor extends QBOBaseEntity {
  DisplayName: string;
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  FullyQualifiedName?: string;
  CompanyName?: string;
  PrintOnCheckName?: string;
  Active?: boolean;
  PrimaryPhone?: QBOPhoneNumber;
  AlternatePhone?: QBOPhoneNumber;
  Mobile?: QBOPhoneNumber;
  Fax?: QBOPhoneNumber;
  PrimaryEmailAddr?: QBOEmailAddress;
  WebAddr?: QBOWebAddress;
  BillAddr?: QBOBillAddr;
  OtherContactInfo?: {
    Type: string;
    Telephone?: QBOPhoneNumber;
  };
  TaxIdentifier?: string;
  AcctNum?: string;
  Term1099?: boolean;
  Vendor1099?: boolean;
  APAccountRef?: QBOAccountRef;
  Balance?: number;
  BillRate?: number;
  TermRef?: QBOTermRef;
  CurrencyRef?: QBOCurrencyRef;
  TaxReportingBasis?: 'Cash' | 'Accrual';
}

/**
 * Vendor input for create/update
 */
export interface QBOVendorInput {
  DisplayName: string;
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  CompanyName?: string;
  PrintOnCheckName?: string;
  PrimaryPhone?: QBOPhoneNumber;
  AlternatePhone?: QBOPhoneNumber;
  Mobile?: QBOPhoneNumber;
  Fax?: QBOPhoneNumber;
  PrimaryEmailAddr?: QBOEmailAddress;
  WebAddr?: QBOWebAddress;
  BillAddr?: QBOBillAddr;
  TaxIdentifier?: string;
  AcctNum?: string;
  Vendor1099?: boolean;
  TermRef?: { value: string };
  CurrencyRef?: { value: string };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetVendorsSchema = z.object({
  active: z.boolean().optional().describe('Filter by active status'),
  withBalance: z.boolean().optional().describe('Filter vendors with balance'),
  nameContains: z.string().optional().describe('Filter by name'),
  is1099: z.boolean().optional().describe('Filter 1099 vendors'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateVendorSchema = z.object({
  displayName: z.string().describe('Vendor display name'),
  companyName: z.string().optional().describe('Company name'),
  givenName: z.string().optional().describe('First name'),
  familyName: z.string().optional().describe('Last name'),
  email: z.string().email().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile number'),
  fax: z.string().optional().describe('Fax number'),
  website: z.string().optional().describe('Website URL'),
  billingAddress: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().describe('Billing address'),
  accountNumber: z.string().optional().describe('Account number'),
  taxId: z.string().optional().describe('Tax identifier'),
  is1099: z.boolean().optional().describe('Is 1099 vendor'),
  paymentTerms: z.string().optional().describe('Payment terms'),
});

export const UpdateVendorSchema = z.object({
  vendorId: z.string().describe('Vendor ID to update'),
  displayName: z.string().optional().describe('Display name'),
  companyName: z.string().optional().describe('Company name'),
  email: z.string().email().optional().describe('Email'),
  phone: z.string().optional().describe('Phone'),
  active: z.boolean().optional().describe('Active status'),
  is1099: z.boolean().optional().describe('1099 status'),
});

export const GetVendorBalanceSchema = z.object({
  vendorName: z.string().describe('Vendor name'),
  includeDetails: z.boolean().optional().describe('Include bill details'),
});

export type GetVendorsParams = z.infer<typeof GetVendorsSchema>;
export type CreateVendorParams = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorParams = z.infer<typeof UpdateVendorSchema>;
export type GetVendorBalanceParams = z.infer<typeof GetVendorBalanceSchema>;
