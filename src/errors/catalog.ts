import { ERROR_CODES } from './codes.js';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error definition with message, suggestion, and metadata
 */
export interface ErrorDefinition {
  code: string;
  message: string;
  suggestion: string;
  recoverable: boolean;
  severity: ErrorSeverity;
  docsUrl?: string;
}

/**
 * Comprehensive error catalog with user-friendly messages and suggestions
 *
 * Each error includes:
 * - Descriptive message explaining what went wrong
 * - Actionable suggestion for how to fix it
 * - Whether the error is recoverable (can be retried)
 * - Severity level
 * - Optional documentation URL
 */
export const ErrorCatalog: Record<string, ErrorDefinition> = {
  // Authentication Errors
  [ERROR_CODES.TOKEN_EXPIRED]: {
    code: ERROR_CODES.TOKEN_EXPIRED,
    message: 'Your QuickBooks session has expired',
    suggestion: 'Refreshing authentication automatically. This should not affect your request.',
    recoverable: true,
    severity: 'warning',
  },

  [ERROR_CODES.TOKEN_REFRESH_FAILED]: {
    code: ERROR_CODES.TOKEN_REFRESH_FAILED,
    message: 'Failed to refresh QuickBooks authentication',
    suggestion:
      'Please check your REFRESH_TOKEN in .env and ensure it is still valid. You may need to re-authenticate.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.INVALID_CREDENTIALS]: {
    code: ERROR_CODES.INVALID_CREDENTIALS,
    message: 'Invalid QuickBooks credentials',
    suggestion: 'Verify CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN in your .env file are correct.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.MISSING_CREDENTIALS]: {
    code: ERROR_CODES.MISSING_CREDENTIALS,
    message: 'QuickBooks credentials not configured',
    suggestion:
      'Set CLIENT_ID, CLIENT_SECRET, COMPANY_ID, and REFRESH_TOKEN in your .env file. See README for setup instructions.',
    recoverable: false,
    severity: 'critical',
  },

  [ERROR_CODES.PERMISSIONS_DENIED]: {
    code: ERROR_CODES.PERMISSIONS_DENIED,
    message: 'Permission denied to access this QuickBooks resource',
    suggestion:
      'Ensure your QuickBooks app has the required permissions (scopes) enabled in the Intuit Developer Portal.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.COMPANY_NOT_FOUND]: {
    code: ERROR_CODES.COMPANY_NOT_FOUND,
    message: 'QuickBooks company not found',
    suggestion: 'Verify the COMPANY_ID in your .env file matches your QuickBooks company realm ID.',
    recoverable: false,
    severity: 'error',
  },

  // Rate Limiting Errors
  [ERROR_CODES.EXCEEDED]: {
    code: ERROR_CODES.EXCEEDED,
    message: 'QuickBooks API rate limit exceeded',
    suggestion: 'Your request will be automatically queued and retried when the limit resets.',
    recoverable: true,
    severity: 'warning',
  },

  [ERROR_CODES.THROTTLED]: {
    code: ERROR_CODES.THROTTLED,
    message: 'Too many requests to QuickBooks API',
    suggestion: 'Requests are being throttled. Consider reducing request frequency or implementing caching.',
    recoverable: true,
    severity: 'warning',
  },

  [ERROR_CODES.COREPLUS_LIMIT]: {
    code: ERROR_CODES.COREPLUS_LIMIT,
    message: 'Monthly CorePlus API limit exceeded',
    suggestion:
      'You have exceeded your monthly read operation quota. Consider upgrading your QuickBooks API tier or optimizing cache usage.',
    recoverable: false,
    severity: 'error',
  },

  // Validation Errors
  [ERROR_CODES.MISSING_FIELD]: {
    code: ERROR_CODES.MISSING_FIELD,
    message: 'Required field is missing',
    suggestion: 'Check the tool documentation for required parameters.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.INVALID_TYPE]: {
    code: ERROR_CODES.INVALID_TYPE,
    message: 'Parameter has invalid type',
    suggestion: 'Ensure all parameters match the expected types (string, number, boolean, etc.).',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.INVALID_FORMAT]: {
    code: ERROR_CODES.INVALID_FORMAT,
    message: 'Parameter format is invalid',
    suggestion: 'Check the format requirements for this field (e.g., email, phone, date).',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.OUT_OF_RANGE]: {
    code: ERROR_CODES.OUT_OF_RANGE,
    message: 'Value is out of acceptable range',
    suggestion: 'Ensure values are within the allowed minimum and maximum bounds.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.INVALID_DATE]: {
    code: ERROR_CODES.INVALID_DATE,
    message: 'Date format is invalid',
    suggestion: 'Use ISO format (YYYY-MM-DD) or natural language like "today", "next Friday", "net 30".',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.INVALID_AMOUNT]: {
    code: ERROR_CODES.INVALID_AMOUNT,
    message: 'Amount format is invalid',
    suggestion: 'Amounts must be positive numbers with at most 2 decimal places.',
    recoverable: false,
    severity: 'error',
  },

  // Invoice Errors
  [ERROR_CODES.NOT_FOUND]: {
    code: ERROR_CODES.NOT_FOUND,
    message: 'Invoice not found',
    suggestion: 'Verify the invoice ID is correct. The invoice may have been deleted.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.ALREADY_PAID]: {
    code: ERROR_CODES.ALREADY_PAID,
    message: 'Invoice has already been paid',
    suggestion: 'Paid invoices cannot be modified. Create a credit memo if you need to adjust it.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.ALREADY_VOIDED]: {
    code: ERROR_CODES.ALREADY_VOIDED,
    message: 'Invoice has already been voided',
    suggestion: 'Voided invoices cannot be modified or sent.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.MISSING_LINE_ITEMS]: {
    code: ERROR_CODES.MISSING_LINE_ITEMS,
    message: 'Invoice must have at least one line item',
    suggestion: 'Add at least one line item with description and amount.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.CUSTOMER_REQUIRED]: {
    code: ERROR_CODES.CUSTOMER_REQUIRED,
    message: 'Customer is required for invoice',
    suggestion: 'Provide a valid customerId. Use get_customers tool to find customer IDs.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.EMAIL_FAILED]: {
    code: ERROR_CODES.EMAIL_FAILED,
    message: 'Failed to send invoice email',
    suggestion: 'Check that the customer has a valid email address in QuickBooks.',
    recoverable: true,
    severity: 'warning',
  },

  // Network Errors
  [ERROR_CODES.TIMEOUT]: {
    code: ERROR_CODES.TIMEOUT,
    message: 'Request to QuickBooks timed out',
    suggestion: 'The request took too long. Retrying automatically with exponential backoff.',
    recoverable: true,
    severity: 'warning',
  },

  [ERROR_CODES.CONNECTION_FAILED]: {
    code: ERROR_CODES.CONNECTION_FAILED,
    message: 'Could not connect to QuickBooks API',
    suggestion: 'Check your internet connection. The request will be retried automatically.',
    recoverable: true,
    severity: 'warning',
  },

  [ERROR_CODES.DNS_LOOKUP_FAILED]: {
    code: ERROR_CODES.DNS_LOOKUP_FAILED,
    message: 'DNS lookup failed for QuickBooks API',
    suggestion: 'Check your DNS settings and internet connection.',
    recoverable: true,
    severity: 'error',
  },

  // Cache Errors
  [ERROR_CODES.WRITE_FAILED]: {
    code: ERROR_CODES.WRITE_FAILED,
    message: 'Failed to write to cache',
    suggestion: 'Cache is disabled temporarily. Operations will continue without caching.',
    recoverable: true,
    severity: 'warning',
  },

  [ERROR_CODES.STORAGE_FULL]: {
    code: ERROR_CODES.STORAGE_FULL,
    message: 'Cache storage is full',
    suggestion: 'Cache will automatically evict old entries. Consider increasing CACHE_MAX_SIZE in .env.',
    recoverable: true,
    severity: 'warning',
  },

  // Webhook Errors
  [ERROR_CODES.INVALID_SIGNATURE]: {
    code: ERROR_CODES.INVALID_SIGNATURE,
    message: 'Webhook signature validation failed',
    suggestion: 'Verify your webhook secret matches the one configured in Intuit Developer Portal.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.REPLAY_ATTACK]: {
    code: ERROR_CODES.REPLAY_ATTACK,
    message: 'Webhook event already processed (possible replay attack)',
    suggestion: 'This event has already been processed and will be ignored.',
    recoverable: false,
    severity: 'warning',
  },

  [ERROR_CODES.MALFORMED_PAYLOAD]: {
    code: ERROR_CODES.MALFORMED_PAYLOAD,
    message: 'Webhook payload is malformed',
    suggestion: 'The webhook payload could not be parsed. This may indicate an issue with QuickBooks.',
    recoverable: false,
    severity: 'error',
  },

  // Automation Errors
  [ERROR_CODES.SCHEDULE_NOT_FOUND]: {
    code: ERROR_CODES.SCHEDULE_NOT_FOUND,
    message: 'Scheduled task not found',
    suggestion: 'The schedule ID is invalid or the task may have been deleted.',
    recoverable: false,
    severity: 'error',
  },

  [ERROR_CODES.SCHEDULE_FAILED]: {
    code: ERROR_CODES.SCHEDULE_FAILED,
    message: 'Failed to schedule task',
    suggestion: 'Check the schedule parameters and try again.',
    recoverable: true,
    severity: 'error',
  },

  [ERROR_CODES.WORKFLOW_FAILED]: {
    code: ERROR_CODES.WORKFLOW_FAILED,
    message: 'Workflow execution failed',
    suggestion: 'Check workflow configuration and ensure all conditions are valid.',
    recoverable: true,
    severity: 'error',
  },

  // System Errors
  [ERROR_CODES.UNKNOWN]: {
    code: ERROR_CODES.UNKNOWN,
    message: 'An unexpected error occurred',
    suggestion: 'Please try again. If the problem persists, check logs for more details.',
    recoverable: true,
    severity: 'error',
  },

  [ERROR_CODES.CONFIGURATION_ERROR]: {
    code: ERROR_CODES.CONFIGURATION_ERROR,
    message: 'System configuration error',
    suggestion: 'Check your .env file and ensure all required configuration is present and valid.',
    recoverable: false,
    severity: 'critical',
  },

  [ERROR_CODES.SERVICE_UNAVAILABLE]: {
    code: ERROR_CODES.SERVICE_UNAVAILABLE,
    message: 'QuickBooks service is temporarily unavailable',
    suggestion: 'QuickBooks may be experiencing an outage. Please try again later.',
    recoverable: true,
    severity: 'warning',
  },

  [ERROR_CODES.NOT_IMPLEMENTED]: {
    code: ERROR_CODES.NOT_IMPLEMENTED,
    message: 'Feature not yet implemented',
    suggestion: 'This feature is planned but not yet available.',
    recoverable: false,
    severity: 'info',
  },
};

/**
 * Get error definition by code
 *
 * @param code - Error code
 * @returns Error definition or undefined if not found
 */
export function getErrorDefinition(code: string): ErrorDefinition | undefined {
  return ErrorCatalog[code];
}

/**
 * Get all errors by severity
 *
 * @param severity - Error severity level
 * @returns Array of error definitions
 */
export function getErrorsBySeverity(severity: ErrorSeverity): ErrorDefinition[] {
  return Object.values(ErrorCatalog).filter((def) => def.severity === severity);
}

/**
 * Get all recoverable errors
 *
 * @returns Array of recoverable error definitions
 */
export function getRecoverableErrors(): ErrorDefinition[] {
  return Object.values(ErrorCatalog).filter((def) => def.recoverable);
}
