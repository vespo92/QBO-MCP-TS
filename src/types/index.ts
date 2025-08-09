/**
 * Core TypeScript type definitions for QBOMCP-TS
 */

import { z } from 'zod';

// ============================================================================
// QuickBooks API Types
// ============================================================================

export interface QBOConfig {
  clientId: string;
  clientSecret: string;
  companyId: string;
  refreshToken: string;
  environment: 'sandbox' | 'production';
  redirectUri?: string;
}

export interface QBOTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface QBOCustomer {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  Balance?: number;
  Active?: boolean;
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QBOInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  CustomerRef: {
    value: string;
    name?: string;
  };
  Line: QBOLineItem[];
  TotalAmt: number;
  Balance?: number;
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QBOLineItem {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount: number;
  DetailType: 'SalesItemLineDetail' | 'DiscountLineDetail' | 'SubTotalLineDetail';
  SalesItemLineDetail?: {
    ItemRef?: {
      value: string;
      name?: string;
    };
    UnitPrice?: number;
    Qty?: number;
    TaxCodeRef?: {
      value: string;
    };
  };
}

export interface QBOExpense {
  Id: string;
  PaymentType?: 'Cash' | 'Check' | 'CreditCard' | 'Bank';
  EntityRef?: {
    value: string;
    name?: string;
    type: 'Vendor' | 'Customer' | 'Employee';
  };
  AccountRef: {
    value: string;
    name?: string;
  };
  TxnDate: string;
  TotalAmt: number;
  Line: QBOExpenseLine[];
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QBOExpenseLine {
  Id?: string;
  Amount: number;
  DetailType: 'AccountBasedExpenseLineDetail' | 'ItemBasedExpenseLineDetail';
  AccountBasedExpenseLineDetail?: {
    AccountRef: {
      value: string;
      name?: string;
    };
  };
  Description?: string;
}

export interface QBOAccount {
  Id: string;
  Name: string;
  AcctNum?: string;
  AccountType: string;
  AccountSubType?: string;
  CurrentBalance?: number;
  Active?: boolean;
  SubAccount?: boolean;
  ParentRef?: {
    value: string;
    name?: string;
  };
}

export interface QBOReport {
  Header: {
    Time: string;
    ReportName: string;
    ReportBasis?: 'Cash' | 'Accrual';
    StartPeriod?: string;
    EndPeriod?: string;
    SummarizeColumnsBy?: string;
    Currency?: string;
  };
  Columns?: {
    Column: Array<{
      ColTitle?: string;
      ColType?: string;
      MetaData?: any;
    }>;
  };
  Rows?: {
    Row?: Array<QBOReportRow>;
  };
}

export interface QBOReportRow {
  type?: string;
  group?: string;
  ColData?: Array<{
    value?: string;
    id?: string;
  }>;
  Rows?: {
    Row?: Array<QBOReportRow>;
  };
  Summary?: {
    ColData?: Array<{
      value?: string;
    }>;
  };
}

// ============================================================================
// MCP Tool Input Schemas (using Zod for validation)
// ============================================================================

export const GetInvoicesSchema = z.object({
  status: z.enum(['unpaid', 'paid', 'overdue', 'all']).optional(),
  customerName: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  limit: z.number().max(100).optional(),
});

export const CreateInvoiceSchema = z.object({
  customerName: z.string(),
  items: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().positive(),
        quantity: z.number().positive().optional(),
        unitPrice: z.number().positive().optional(),
      }),
    )
    .min(1),
  dueDate: z.string().optional(),
  memo: z.string().optional(),
  emailToCustomer: z.boolean().optional(),
});

export const SendInvoiceSchema = z.object({
  invoiceId: z.string(),
  email: z.string().email().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

export const CreateExpenseSchema = z.object({
  vendorName: z.string(),
  amount: z.number().positive(),
  accountName: z.string(),
  paymentMethod: z.enum(['Cash', 'Check', 'Credit Card', 'Bank']).optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  referenceNumber: z.string().optional(),
});

export const GetExpensesSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  vendorName: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  accountName: z.string().optional(),
  limit: z.number().max(100).optional(),
});

export const ProfitAndLossSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summarizeBy: z.enum(['Total', 'Month', 'Quarter', 'Year']).optional(),
  accountingMethod: z.enum(['Cash', 'Accrual']).optional(),
});

export const BalanceSheetSchema = z.object({
  asOfDate: z.string().optional(),
  summarizeBy: z.enum(['Total', 'Month', 'Quarter']).optional(),
  accountingMethod: z.enum(['Cash', 'Accrual']).optional(),
});

export const CashFlowSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AgingReportSchema = z.object({
  reportType: z.enum(['receivables', 'payables']),
  asOfDate: z.string().optional(),
  agingPeriod: z.number().default(30),
});

export const GetCustomersSchema = z.object({
  active: z.boolean().optional(),
  withBalance: z.boolean().optional(),
  nameContains: z.string().optional(),
  limit: z.number().max(100).optional(),
});

export const CreateCustomerSchema = z.object({
  displayName: z.string(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingAddress: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      countrySubDivisionCode: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
});

export const CustomerBalanceSchema = z.object({
  customerName: z.string(),
});

export const ChartOfAccountsSchema = z.object({
  accountType: z.enum(['Asset', 'Liability', 'Equity', 'Income', 'Expense']).optional(),
  active: z.boolean().optional(),
});

export const JournalEntrySchema = z.object({
  date: z.string(),
  entries: z
    .array(
      z.object({
        accountName: z.string(),
        debit: z.number().optional(),
        credit: z.number().optional(),
        description: z.string().optional(),
      }),
    )
    .min(2),
  memo: z.string().optional(),
});

// ============================================================================
// MCP Response Types
// ============================================================================

export interface MCPToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  suggestion?: string;
  metadata?: {
    timestamp: string;
    requestId: string;
    apiCalls?: number;
    cached?: boolean;
  };
}

export interface InvoiceListResponse {
  summary: string;
  count: number;
  totalAmount: number;
  invoices: Array<{
    invoiceNumber: string;
    customer: string;
    date: string;
    dueDate: string;
    total: string;
    balance: string;
    status: 'Paid' | 'Unpaid' | 'Overdue';
    id: string;
  }>;
}

export interface ExpenseListResponse {
  summary: string;
  count: number;
  total: string;
  expenses: Array<{
    date: string;
    vendor: string;
    amount: string;
    paymentMethod: string;
    account: string;
    description?: string;
    id: string;
  }>;
}

export interface CustomerListResponse {
  summary: string;
  count: number;
  customers: Array<{
    name: string;
    balance: string;
    email: string;
    phone: string;
    active: boolean;
    id: string;
  }>;
}

export interface ReportResponse {
  report: string;
  generated: string;
  period?: string;
  data: any; // Complex nested structure varies by report
  summary?: {
    totalIncome?: number;
    totalExpenses?: number;
    netIncome?: number;
    totalAssets?: number;
    totalLiabilities?: number;
    totalEquity?: number;
  };
  nextSteps?: string[];
}

// ============================================================================
// Service Layer Types
// ============================================================================

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IQueueService {
  add<T>(task: () => Promise<T>, priority?: number): Promise<T>;
  pause(): void;
  resume(): void;
  clear(): void;
  size(): number;
  pending(): number;
}

export interface ILoggerService {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  debug(message: string, meta?: any): void;
  http(message: string, meta?: any): void;
}

// ============================================================================
// Transport Types
// ============================================================================

export type TransportType = 'stdio' | 'sse';

export interface TransportConfig {
  type: TransportType;
  port?: number;
  host?: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  healthCheckPath?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class QBOError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'QBOError';
  }
}

export class AuthenticationError extends QBOError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends QBOError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends QBOError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends QBOError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type Awaitable<T> = T | Promise<T>;

export type ValueOf<T> = T[keyof T];
