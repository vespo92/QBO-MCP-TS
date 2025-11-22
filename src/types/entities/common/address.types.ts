/**
 * Address types for QB entities
 */

/**
 * Physical address
 */
export interface QBOPhysicalAddress {
  Id?: string;
  Line1?: string;
  Line2?: string;
  Line3?: string;
  Line4?: string;
  Line5?: string;
  City?: string;
  Country?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Lat?: string;
  Long?: string;
}

/**
 * Billing address
 */
export interface QBOBillAddr extends QBOPhysicalAddress {}

/**
 * Shipping address
 */
export interface QBOShipAddr extends QBOPhysicalAddress {}

/**
 * Company address
 */
export interface QBOCompanyAddr extends QBOPhysicalAddress {}

/**
 * Legal address
 */
export interface QBOLegalAddr extends QBOPhysicalAddress {}

/**
 * Delivery info
 */
export interface QBODeliveryInfo {
  DeliveryType: 'Email' | 'Fax';
  DeliveryTime?: string;
  DeliveryErrorType?: string;
}
