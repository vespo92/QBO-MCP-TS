/**
 * Common base types for all QB entities
 */

/**
 * Metadata present on all QB entities
 */
export interface QBOMetaData {
  CreateTime: string;
  LastUpdatedTime: string;
}

/**
 * Base entity interface all QB entities extend
 */
export interface QBOBaseEntity {
  Id: string;
  SyncToken?: string;
  MetaData?: QBOMetaData;
  domain?: string;
  sparse?: boolean;
}

/**
 * Transaction base interface
 */
export interface QBOBaseTransaction extends QBOBaseEntity {
  TxnDate: string;
  DocNumber?: string;
  PrivateNote?: string;
  TxnStatus?: string;
  LinkedTxn?: QBOLinkedTransaction[];
  CustomField?: QBOCustomField[];
}

/**
 * Linked transaction reference
 */
export interface QBOLinkedTransaction {
  TxnId: string;
  TxnType: string;
  TxnLineId?: string;
}

/**
 * Custom field definition
 */
export interface QBOCustomField {
  DefinitionId: string;
  Name?: string;
  Type: 'StringType' | 'NumberType' | 'DateType' | 'BooleanType';
  StringValue?: string;
  NumberValue?: number;
  DateValue?: string;
  BooleanValue?: boolean;
}

/**
 * Line item base interface
 */
export interface QBOBaseLine {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount: number;
  DetailType: string;
}

/**
 * Currency reference
 */
export interface QBOCurrencyRef {
  value: string;
  name?: string;
}

/**
 * Email address
 */
export interface QBOEmailAddress {
  Address: string;
}

/**
 * Phone number
 */
export interface QBOPhoneNumber {
  FreeFormNumber: string;
}

/**
 * Web address
 */
export interface QBOWebAddress {
  URI: string;
}

/**
 * Query response wrapper
 */
export interface QBOQueryResponse<T> {
  QueryResponse: {
    [key: string]: T[];
    startPosition?: number;
    maxResults?: number;
    totalCount?: number;
  };
  time: string;
}

/**
 * Single entity response wrapper
 */
export interface QBOEntityResponse<T> {
  [key: string]: T;
  time: string;
}

/**
 * Delete response
 */
export interface QBODeleteResponse {
  [key: string]: {
    Id: string;
    status: string;
    domain?: string;
  };
  time: string;
}

/**
 * Batch request item
 */
export interface QBOBatchItemRequest {
  bId: string;
  operation: 'create' | 'update' | 'delete' | 'query';
  [key: string]: unknown;
}

/**
 * Batch response item
 */
export interface QBOBatchItemResponse {
  bId: string;
  [key: string]: unknown;
  Fault?: {
    Error: Array<{
      Message: string;
      Detail: string;
      code: string;
      element?: string;
    }>;
    type: string;
  };
}
