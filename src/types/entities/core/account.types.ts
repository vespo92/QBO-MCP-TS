/**
 * Account (Chart of Accounts) entity types
 */

import { z } from 'zod';
import type { QBOBaseEntity, QBOCurrencyRef } from '../common/base.types.js';

/**
 * Account classification types
 */
export type QBOAccountClassification =
  | 'Asset'
  | 'Liability'
  | 'Equity'
  | 'Revenue'
  | 'Expense';

/**
 * Account types
 */
export type QBOAccountType =
  // Asset types
  | 'Bank'
  | 'Other Current Asset'
  | 'Fixed Asset'
  | 'Other Asset'
  | 'Accounts Receivable'
  // Liability types
  | 'Accounts Payable'
  | 'Credit Card'
  | 'Other Current Liability'
  | 'Long Term Liability'
  // Equity types
  | 'Equity'
  // Revenue types
  | 'Income'
  | 'Other Income'
  // Expense types
  | 'Expense'
  | 'Other Expense'
  | 'Cost of Goods Sold';

/**
 * Account subtypes (comprehensive list)
 */
export type QBOAccountSubType =
  // Bank subtypes
  | 'CashOnHand'
  | 'Checking'
  | 'MoneyMarket'
  | 'RentsHeldInTrust'
  | 'Savings'
  | 'TrustAccounts'
  // Other Current Asset subtypes
  | 'AllowanceForBadDebts'
  | 'DevelopmentCosts'
  | 'EmployeeCashAdvances'
  | 'Inventory'
  | 'Investment_MortgageRealEstateLoans'
  | 'Investment_Other'
  | 'Investment_TaxExemptSecurities'
  | 'Investment_USGovernmentObligations'
  | 'LoansToOfficers'
  | 'LoansToOthers'
  | 'LoansToStockholders'
  | 'PrepaidExpenses'
  | 'Retainage'
  | 'UndepositedFunds'
  // Fixed Asset subtypes
  | 'AccumulatedDepletion'
  | 'AccumulatedDepreciation'
  | 'DepletableAssets'
  | 'FurnitureAndFixtures'
  | 'Land'
  | 'LeaseholdImprovements'
  | 'MachineryAndEquipment'
  | 'OtherFixedAssets'
  | 'Vehicles'
  | 'Buildings'
  // Accounts Receivable
  | 'AccountsReceivable'
  // Accounts Payable
  | 'AccountsPayable'
  // Credit Card
  | 'CreditCard'
  // Other Current Liability
  | 'DirectDepositPayable'
  | 'LineOfCredit'
  | 'LoanPayable'
  | 'GlobalTaxPayable'
  | 'GlobalTaxSuspense'
  | 'OtherCurrentLiabilities'
  | 'PayrollClearing'
  | 'PayrollTaxPayable'
  | 'PrepaidExpensesPayable'
  | 'RentsInTrustLiability'
  | 'TrustAccountsLiabilities'
  // Long Term Liability
  | 'NotesPayable'
  | 'OtherLongTermLiabilities'
  | 'ShareholderNotesPayable'
  // Equity
  | 'AccumulatedAdjustment'
  | 'CommonStock'
  | 'OpeningBalanceEquity'
  | 'PaidInCapitalOrSurplus'
  | 'PartnerContributions'
  | 'PartnerDistributions'
  | 'PartnerEquity'
  | 'PreferredStock'
  | 'RetainedEarnings'
  | 'TreasuryStock'
  // Income
  | 'DiscountsRefundsGiven'
  | 'NonProfitIncome'
  | 'OtherPrimaryIncome'
  | 'SalesOfProductIncome'
  | 'ServiceFeeIncome'
  | 'UnappliedCashPaymentIncome'
  // Other Income
  | 'DividendIncome'
  | 'InterestEarned'
  | 'OtherInvestmentIncome'
  | 'OtherMiscellaneousIncome'
  | 'TaxExemptInterest'
  // Expense
  | 'AdvertisingPromotional'
  | 'BadDebts'
  | 'BankCharges'
  | 'CharitableContributions'
  | 'CommissionsAndFees'
  | 'EntertainmentMeals'
  | 'Insurance'
  | 'InterestPaid'
  | 'LegalProfessionalFees'
  | 'OfficeGeneralAdministrativeExpenses'
  | 'OtherBusinessExpenses'
  | 'OtherMiscellaneousServiceCost'
  | 'PromotionalMeals'
  | 'RentOrLeaseOfBuildings'
  | 'RepairMaintenance'
  | 'ShippingFreightDelivery'
  | 'Supplies'
  | 'TaxesPaid'
  | 'Travel'
  | 'TravelMeals'
  | 'Utilities'
  // Other Expense
  | 'Depreciation'
  | 'ExchangeGainOrLoss'
  | 'OtherMiscellaneousExpense'
  | 'PenaltiesSettlements'
  // Cost of Goods Sold
  | 'CostOfLaborCos'
  | 'EquipmentRentalCos'
  | 'FreightAndDeliveryCost'
  | 'OtherCostsOfServiceCos'
  | 'SuppliesMaterialsCogs';

/**
 * QuickBooks Account entity
 */
export interface QBOAccount extends QBOBaseEntity {
  Name: string;
  SubAccount?: boolean;
  ParentRef?: {
    value: string;
    name?: string;
  };
  Description?: string;
  FullyQualifiedName?: string;
  Active?: boolean;
  Classification?: QBOAccountClassification;
  AccountType: QBOAccountType;
  AccountSubType?: QBOAccountSubType;
  AcctNum?: string;
  CurrentBalance?: number;
  CurrentBalanceWithSubAccounts?: number;
  CurrencyRef?: QBOCurrencyRef;
  TaxCodeRef?: {
    value: string;
    name?: string;
  };
}

/**
 * Account create/update input
 */
export interface QBOAccountInput {
  Name: string;
  AccountType: QBOAccountType;
  AccountSubType?: QBOAccountSubType;
  AcctNum?: string;
  Description?: string;
  ParentRef?: {
    value: string;
  };
  Active?: boolean;
  TaxCodeRef?: {
    value: string;
  };
  CurrencyRef?: QBOCurrencyRef;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetAccountsSchema = z.object({
  accountType: z.enum([
    'Bank', 'Other Current Asset', 'Fixed Asset', 'Other Asset', 'Accounts Receivable',
    'Accounts Payable', 'Credit Card', 'Other Current Liability', 'Long Term Liability',
    'Equity', 'Income', 'Other Income', 'Expense', 'Other Expense', 'Cost of Goods Sold'
  ]).optional().describe('Filter by account type'),
  classification: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'])
    .optional().describe('Filter by classification'),
  active: z.boolean().optional().describe('Filter by active status'),
  nameContains: z.string().optional().describe('Filter by name containing text'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateAccountSchema = z.object({
  name: z.string().describe('Account name'),
  accountType: z.enum([
    'Bank', 'Other Current Asset', 'Fixed Asset', 'Other Asset', 'Accounts Receivable',
    'Accounts Payable', 'Credit Card', 'Other Current Liability', 'Long Term Liability',
    'Equity', 'Income', 'Other Income', 'Expense', 'Other Expense', 'Cost of Goods Sold'
  ]).describe('Account type'),
  accountSubType: z.string().optional().describe('Account subtype'),
  accountNumber: z.string().optional().describe('Account number'),
  description: z.string().optional().describe('Account description'),
  parentAccountId: z.string().optional().describe('Parent account ID for sub-accounts'),
});

export const UpdateAccountSchema = z.object({
  accountId: z.string().describe('Account ID to update'),
  name: z.string().optional().describe('New account name'),
  description: z.string().optional().describe('New description'),
  accountNumber: z.string().optional().describe('New account number'),
  active: z.boolean().optional().describe('Active status'),
});

export type GetAccountsParams = z.infer<typeof GetAccountsSchema>;
export type CreateAccountParams = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountParams = z.infer<typeof UpdateAccountSchema>;
