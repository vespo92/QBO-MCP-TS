/**
 * Third-Party Integration Types
 */

import { z } from 'zod';

/**
 * Integration status
 */
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

/**
 * Integration tier classification
 */
export type IntegrationTier = 'native' | 'partner' | 'generic';

/**
 * Integration category
 */
export type IntegrationCategory =
  | 'payments'       // Payment processing
  | 'time-tracking'  // Time & attendance
  | 'payroll'        // Payroll services
  | 'ecommerce'      // E-commerce platforms
  | 'crm'            // Customer relationship management
  | 'inventory'      // Inventory management
  | 'banking'        // Bank connections
  | 'tax'            // Tax automation
  | 'automation'     // Workflow automation
  | 'document'       // Document management
  | 'analytics';     // Business intelligence

/**
 * Integration metadata
 */
export interface IntegrationMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  tier: IntegrationTier;
  category: IntegrationCategory;
  vendor: string;
  documentationUrl?: string;
  supportUrl?: string;
  requiredScopes?: string[];
  features: string[];
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  environment: 'sandbox' | 'production';
  options?: Record<string, unknown>;
}

/**
 * Integration health check result
 */
export interface IntegrationHealthCheck {
  status: IntegrationStatus;
  lastCheck: Date;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Integration event
 */
export interface IntegrationEvent {
  id: string;
  integrationId: string;
  type: string;
  timestamp: Date;
  data: unknown;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  id: string;
  source: string;
  type: string;
  timestamp: string;
  data: unknown;
  signature?: string;
}

// ============================================================================
// QB Payments Types
// ============================================================================

export interface QBPaymentsConfig extends IntegrationConfig {
  merchantId?: string;
  applicationId?: string;
}

export interface QBPaymentsCharge {
  id: string;
  amount: number;
  currency: string;
  status: 'authorized' | 'captured' | 'declined' | 'refunded';
  card?: {
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
  };
  customerId?: string;
  invoiceId?: string;
  created: Date;
}

export const CreateChargeSchema = z.object({
  amount: z.number().positive().describe('Amount in cents'),
  currency: z.string().default('USD').describe('Currency code'),
  customerId: z.string().optional().describe('QB Customer ID'),
  invoiceId: z.string().optional().describe('QB Invoice ID to apply payment'),
  cardToken: z.string().optional().describe('Payment token from client'),
  description: z.string().optional().describe('Charge description'),
  capture: z.boolean().default(true).describe('Capture immediately'),
});

export const RefundChargeSchema = z.object({
  chargeId: z.string().describe('Charge ID to refund'),
  amount: z.number().positive().optional().describe('Amount to refund (default: full)'),
  reason: z.string().optional().describe('Refund reason'),
});

// ============================================================================
// QB Time (TSheets) Types
// ============================================================================

export interface QBTimeConfig extends IntegrationConfig {
  companyId?: string;
}

export interface QBTimeEntry {
  id: string;
  userId: string;
  jobcodeId?: string;
  date: string;
  start: string;
  end: string;
  duration: number;
  type: 'regular' | 'manual' | 'pto';
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface QBTimeUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeNumber?: string;
  active: boolean;
  hourlyRate?: number;
}

export const GetTimeEntriesSchema = z.object({
  userId: z.string().optional().describe('Filter by user'),
  startDate: z.string().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().describe('End date (YYYY-MM-DD)'),
  jobcodeId: z.string().optional().describe('Filter by job code'),
  approved: z.boolean().optional().describe('Filter by approval status'),
});

export const CreateTimeEntrySchema = z.object({
  userId: z.string().describe('User ID'),
  date: z.string().describe('Date (YYYY-MM-DD)'),
  startTime: z.string().optional().describe('Start time (HH:MM)'),
  endTime: z.string().optional().describe('End time (HH:MM)'),
  duration: z.number().optional().describe('Duration in seconds'),
  jobcodeId: z.string().optional().describe('Job code ID'),
  notes: z.string().optional().describe('Notes'),
});

// ============================================================================
// Plaid Banking Types
// ============================================================================

export interface PlaidConfig extends IntegrationConfig {
  clientId?: string;
  publicKey?: string;
  products?: string[];
}

export interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: 'checking' | 'savings' | 'credit' | 'loan' | 'investment';
  subtype?: string;
  balances: {
    available: number | null;
    current: number;
    limit: number | null;
  };
}

export interface PlaidTransaction {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  category?: string[];
  pending: boolean;
}

export const GetPlaidTransactionsSchema = z.object({
  startDate: z.string().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().describe('End date (YYYY-MM-DD)'),
  accountId: z.string().optional().describe('Filter by account'),
  count: z.number().max(500).optional().describe('Max transactions'),
});

export const LinkPlaidAccountSchema = z.object({
  publicToken: z.string().describe('Public token from Plaid Link'),
  qbAccountId: z.string().optional().describe('QB Account to link to'),
});

// ============================================================================
// Webhook Relay Types
// ============================================================================

export interface WebhookRelayConfig extends IntegrationConfig {
  endpoints: WebhookEndpoint[];
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: unknown;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  response?: {
    status: number;
    body?: string;
  };
  error?: string;
}

export const CreateWebhookEndpointSchema = z.object({
  name: z.string().describe('Endpoint name'),
  url: z.string().url().describe('Webhook URL'),
  events: z.array(z.string()).min(1).describe('Events to subscribe to'),
  secret: z.string().optional().describe('Signing secret'),
  headers: z.record(z.string()).optional().describe('Custom headers'),
});

export const UpdateWebhookEndpointSchema = z.object({
  endpointId: z.string().describe('Endpoint ID'),
  name: z.string().optional().describe('Endpoint name'),
  url: z.string().url().optional().describe('Webhook URL'),
  events: z.array(z.string()).optional().describe('Events to subscribe'),
  enabled: z.boolean().optional().describe('Enable/disable'),
});
