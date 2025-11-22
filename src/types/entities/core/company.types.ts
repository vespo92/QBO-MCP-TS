/**
 * Company Info and Preferences entity types
 */

import { z } from 'zod';
import type { QBOBaseEntity } from '../common/base.types.js';
import type { QBOPhysicalAddress, QBOBillAddr, QBOShipAddr, QBOCompanyAddr, QBOLegalAddr } from '../common/address.types.js';
import type { QBOEmailAddress, QBOPhoneNumber, QBOWebAddress } from '../common/base.types.js';

/**
 * Name-value pair
 */
export interface QBONameValue {
  Name: string;
  Value: string;
}

/**
 * QuickBooks Company Info entity
 */
export interface QBOCompanyInfo extends QBOBaseEntity {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: QBOCompanyAddr;
  CustomerCommunicationAddr?: QBOPhysicalAddress;
  LegalAddr?: QBOLegalAddr;
  CustomerCommunicationEmailAddr?: QBOEmailAddress;
  PrimaryPhone?: QBOPhoneNumber;
  CompanyStartDate?: string;
  FiscalYearStartMonth?: string;
  Country?: string;
  Email?: QBOEmailAddress;
  WebAddr?: QBOWebAddress;
  SupportedLanguages?: string;
  NameValue?: QBONameValue[];
  // Subscription info
  SubscriptionStatus?: string;
  // QBO features
  QBVersion?: string;
}

/**
 * Sales form preferences
 */
export interface QBOSalesFormsPrefs {
  CustomTxnNumbers?: boolean;
  AllowDeposit?: boolean;
  AllowDiscount?: boolean;
  DefaultDiscountAccount?: string;
  AllowEstimates?: boolean;
  ETransactionEnabledStatus?: 'Enabled' | 'NotApplicable';
  ETransactionPaymentEnabled?: boolean;
  ETransactionAttachPDF?: boolean;
  IPNSupportEnabled?: boolean;
  AllowServiceDate?: boolean;
  AllowShipping?: boolean;
  DefaultShippingAccount?: string;
  DefaultTerms?: {
    value: string;
  };
  DefaultCustomerMessage?: string;
  UsingProgressInvoicing?: boolean;
  UsingPriceLevels?: boolean;
  CustomField?: Array<{
    CustomField: {
      Name: string;
      Active: boolean;
      Type: string;
    };
  }>;
}

/**
 * Vendor and purchase preferences
 */
export interface QBOVendorAndPurchasesPrefs {
  TrackingByCustomer?: boolean;
  BillableExpenseTracking?: boolean;
  POCustomField?: Array<{
    CustomField: {
      Name: string;
      Active: boolean;
      Type: string;
    };
  }>;
  DefaultTerms?: {
    value: string;
  };
  DefaultMarkupAccount?: {
    value: string;
  };
  DefaultMarkup?: number;
}

/**
 * Time tracking preferences
 */
export interface QBOTimeTrackingPrefs {
  UseServices?: boolean;
  BillCustomers?: boolean;
  ShowBillRateToAll?: boolean;
  WorkWeekStartDate?: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  MarkTimeEntriesBillable?: boolean;
}

/**
 * Tax preferences
 */
export interface QBOTaxPrefs {
  UsingSalesTax?: boolean;
  TaxGroupCodeRef?: {
    value: string;
  };
  PartnerTaxEnabled?: boolean;
}

/**
 * Currency preferences
 */
export interface QBOCurrencyPrefs {
  MultiCurrencyEnabled?: boolean;
  HomeCurrency?: {
    value: string;
  };
}

/**
 * Accounting info preferences
 */
export interface QBOAccountingInfoPrefs {
  FirstMonthOfFiscalYear?: string;
  TaxYearMonth?: string;
  UseAccountNumbers?: boolean;
  TaxForm?: string;
  BookCloseDate?: string;
  DepartmentTerminology?: 'Business' | 'Department' | 'Division' | 'Location' | 'Property' | 'Store' | 'Territory';
  ClassTrackingPerTxnLine?: boolean;
  ClassTrackingPerTxn?: boolean;
  TrackDepartments?: boolean;
  CustomerTerminology?: 'Clients' | 'Customers' | 'Donors' | 'Guests' | 'Members' | 'Patients' | 'Tenants';
}

/**
 * Email messages preferences
 */
export interface QBOEmailMessagesPrefs {
  InvoiceMessage?: {
    Subject?: string;
    Message?: string;
  };
  EstimateMessage?: {
    Subject?: string;
    Message?: string;
  };
  SalesReceiptMessage?: {
    Subject?: string;
    Message?: string;
  };
  StatementMessage?: {
    Subject?: string;
    Message?: string;
  };
}

/**
 * QuickBooks Preferences entity
 */
export interface QBOPreferences extends QBOBaseEntity {
  AccountingInfoPrefs?: QBOAccountingInfoPrefs;
  ProductAndServicesPrefs?: {
    ForSales?: boolean;
    ForPurchase?: boolean;
    QuantityWithPriceAndRate?: boolean;
    QuantityOnHand?: boolean;
  };
  SalesFormsPrefs?: QBOSalesFormsPrefs;
  EmailMessagesPrefs?: QBOEmailMessagesPrefs;
  VendorAndPurchasesPrefs?: QBOVendorAndPurchasesPrefs;
  TimeTrackingPrefs?: QBOTimeTrackingPrefs;
  TaxPrefs?: QBOTaxPrefs;
  CurrencyPrefs?: QBOCurrencyPrefs;
  ReportPrefs?: {
    ReportBasis?: 'Accrual' | 'Cash';
    CalcAgingReportFromTxnDate?: boolean;
  };
  OtherPrefs?: {
    NameValue?: QBONameValue[];
  };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetCompanyInfoSchema = z.object({
  // No params needed - reads current company
});

export const GetPreferencesSchema = z.object({
  // No params needed - reads current preferences
});

export const UpdatePreferencesSchema = z.object({
  salesTaxEnabled: z.boolean().optional().describe('Enable/disable sales tax'),
  trackingByCustomer: z.boolean().optional().describe('Track expenses by customer'),
  billableExpenseTracking: z.boolean().optional().describe('Enable billable expenses'),
  classTracking: z.boolean().optional().describe('Enable class tracking'),
  departmentTracking: z.boolean().optional().describe('Enable department tracking'),
  multiCurrency: z.boolean().optional().describe('Enable multi-currency'),
  useAccountNumbers: z.boolean().optional().describe('Use account numbers'),
});

export type GetCompanyInfoParams = z.infer<typeof GetCompanyInfoSchema>;
export type GetPreferencesParams = z.infer<typeof GetPreferencesSchema>;
export type UpdatePreferencesParams = z.infer<typeof UpdatePreferencesSchema>;
