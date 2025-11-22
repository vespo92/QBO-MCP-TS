/**
 * Reference types used throughout QB API
 */

/**
 * Generic reference to another entity
 */
export interface QBORef {
  value: string;
  name?: string;
}

/**
 * Customer reference
 */
export interface QBOCustomerRef extends QBORef {
  type?: 'Customer';
}

/**
 * Vendor reference
 */
export interface QBOVendorRef extends QBORef {
  type?: 'Vendor';
}

/**
 * Employee reference
 */
export interface QBOEmployeeRef extends QBORef {
  type?: 'Employee';
}

/**
 * Account reference
 */
export interface QBOAccountRef extends QBORef {}

/**
 * Item reference
 */
export interface QBOItemRef extends QBORef {}

/**
 * Class reference (for classification)
 */
export interface QBOClassRef extends QBORef {}

/**
 * Department reference
 */
export interface QBODepartmentRef extends QBORef {}

/**
 * Tax code reference
 */
export interface QBOTaxCodeRef extends QBORef {}

/**
 * Payment method reference
 */
export interface QBOPaymentMethodRef extends QBORef {}

/**
 * Term reference (payment terms)
 */
export interface QBOTermRef extends QBORef {}

/**
 * Entity reference (can be Customer, Vendor, or Employee)
 */
export interface QBOEntityRef extends QBORef {
  type: 'Customer' | 'Vendor' | 'Employee';
}

/**
 * Project reference
 */
export interface QBOProjectRef extends QBORef {}

/**
 * Deposit account reference
 */
export interface QBODepositToAccountRef extends QBORef {}

/**
 * Bank account reference
 */
export interface QBOBankAccountRef extends QBORef {}

/**
 * AP account reference
 */
export interface QBOAPAccountRef extends QBORef {}

/**
 * AR account reference
 */
export interface QBOARAccountRef extends QBORef {}
