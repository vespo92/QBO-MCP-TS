/**
 * Customer entity types - Extended
 */

import { z } from 'zod';
import type { QBOBaseEntity, QBOCurrencyRef, QBOEmailAddress, QBOPhoneNumber, QBOWebAddress } from '../common/base.types.js';
import type { QBOBillAddr, QBOShipAddr } from '../common/address.types.js';
import type { QBOPaymentMethodRef, QBOTermRef } from '../common/reference.types.js';

/**
 * QuickBooks Customer entity (Extended)
 */
export interface QBOCustomer extends QBOBaseEntity {
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
  DefaultTaxCodeRef?: {
    value: string;
    name?: string;
  };
  Taxable?: boolean;
  TaxExemptionReasonId?: string;
  BillAddr?: QBOBillAddr;
  ShipAddr?: QBOShipAddr;
  Notes?: string;
  Job?: boolean;
  BillWithParent?: boolean;
  ParentRef?: {
    value: string;
    name?: string;
  };
  Level?: number;
  SalesTermRef?: QBOTermRef;
  PaymentMethodRef?: QBOPaymentMethodRef;
  Balance?: number;
  OpenBalanceDate?: string;
  BalanceWithJobs?: number;
  CurrencyRef?: QBOCurrencyRef;
  PreferredDeliveryMethod?: 'Print' | 'Email' | 'None';
  IsProject?: boolean;
  Source?: string;
  PrimaryTaxIdentifier?: string;
  GSTRegistrationType?: 'GST_REG_REG' | 'GST_REG_COMP' | 'GST_UNREG' | 'CONSUMER' | 'OVERSEAS' | 'SEZ' | 'DEEMED';
  BusinessNumber?: string;
  ARAccountRef?: {
    value: string;
    name?: string;
  };
}

/**
 * Customer input for create/update
 */
export interface QBOCustomerInput {
  DisplayName: string;
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  CompanyName?: string;
  PrimaryPhone?: QBOPhoneNumber;
  AlternatePhone?: QBOPhoneNumber;
  Mobile?: QBOPhoneNumber;
  Fax?: QBOPhoneNumber;
  PrimaryEmailAddr?: QBOEmailAddress;
  WebAddr?: QBOWebAddress;
  BillAddr?: QBOBillAddr;
  ShipAddr?: QBOShipAddr;
  Notes?: string;
  Job?: boolean;
  ParentRef?: { value: string };
  Taxable?: boolean;
  DefaultTaxCodeRef?: { value: string };
  SalesTermRef?: { value: string };
  PaymentMethodRef?: { value: string };
  PreferredDeliveryMethod?: 'Print' | 'Email' | 'None';
  CurrencyRef?: { value: string };
}

// Re-export existing schemas from main types
export { GetCustomersSchema, CreateCustomerSchema, CustomerBalanceSchema } from '../../index.js';
