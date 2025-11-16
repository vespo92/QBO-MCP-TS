/**
 * QuickBooks Online MCP Error Codes
 *
 * Organized by category for easy reference
 */

/**
 * Authentication errors (QBO_AUTH_xxx)
 */
export const AUTH_ERRORS = {
  TOKEN_EXPIRED: 'QBO_AUTH_001',
  TOKEN_REFRESH_FAILED: 'QBO_AUTH_002',
  INVALID_CREDENTIALS: 'QBO_AUTH_003',
  MISSING_CREDENTIALS: 'QBO_AUTH_004',
  PERMISSIONS_DENIED: 'QBO_AUTH_005',
  COMPANY_NOT_FOUND: 'QBO_AUTH_006',
  REALM_MISMATCH: 'QBO_AUTH_007',
} as const;

/**
 * Rate limiting errors (QBO_RATE_xxx)
 */
export const RATE_LIMIT_ERRORS = {
  EXCEEDED: 'QBO_RATE_001',
  THROTTLED: 'QBO_RATE_002',
  QUOTA_EXCEEDED: 'QBO_RATE_003',
  COREPLUS_LIMIT: 'QBO_RATE_004',
} as const;

/**
 * Validation errors (QBO_VAL_xxx)
 */
export const VALIDATION_ERRORS = {
  MISSING_FIELD: 'QBO_VAL_001',
  INVALID_TYPE: 'QBO_VAL_002',
  INVALID_FORMAT: 'QBO_VAL_003',
  OUT_OF_RANGE: 'QBO_VAL_004',
  INVALID_DATE: 'QBO_VAL_005',
  INVALID_AMOUNT: 'QBO_VAL_006',
  DUPLICATE_VALUE: 'QBO_VAL_007',
  CONSTRAINT_VIOLATION: 'QBO_VAL_008',
} as const;

/**
 * Invoice errors (QBO_INV_xxx)
 */
export const INVOICE_ERRORS = {
  NOT_FOUND: 'QBO_INV_001',
  ALREADY_PAID: 'QBO_INV_002',
  ALREADY_VOIDED: 'QBO_INV_003',
  CANNOT_MODIFY_PAID: 'QBO_INV_004',
  INVALID_STATUS: 'QBO_INV_005',
  MISSING_LINE_ITEMS: 'QBO_INV_006',
  CUSTOMER_REQUIRED: 'QBO_INV_007',
  EMAIL_FAILED: 'QBO_INV_008',
  PDF_GENERATION_FAILED: 'QBO_INV_009',
} as const;

/**
 * Payment errors (QBO_PAY_xxx)
 */
export const PAYMENT_ERRORS = {
  NOT_FOUND: 'QBO_PAY_001',
  ALREADY_DEPOSITED: 'QBO_PAY_002',
  INSUFFICIENT_AMOUNT: 'QBO_PAY_003',
  INVALID_PAYMENT_METHOD: 'QBO_PAY_004',
  BANK_ACCOUNT_REQUIRED: 'QBO_PAY_005',
} as const;

/**
 * Expense errors (QBO_EXP_xxx)
 */
export const EXPENSE_ERRORS = {
  NOT_FOUND: 'QBO_EXP_001',
  ALREADY_RECONCILED: 'QBO_EXP_002',
  INVALID_ACCOUNT: 'QBO_EXP_003',
  MISSING_VENDOR: 'QBO_EXP_004',
  DUPLICATE_EXPENSE: 'QBO_EXP_005',
} as const;

/**
 * Customer errors (QBO_CUST_xxx)
 */
export const CUSTOMER_ERRORS = {
  NOT_FOUND: 'QBO_CUST_001',
  DUPLICATE_NAME: 'QBO_CUST_002',
  INVALID_EMAIL: 'QBO_CUST_003',
  REQUIRED_FIELD_MISSING: 'QBO_CUST_004',
  HAS_ACTIVE_TRANSACTIONS: 'QBO_CUST_005',
} as const;

/**
 * Report errors (QBO_RPT_xxx)
 */
export const REPORT_ERRORS = {
  INVALID_DATE_RANGE: 'QBO_RPT_001',
  REPORT_NOT_AVAILABLE: 'QBO_RPT_002',
  GENERATION_FAILED: 'QBO_RPT_003',
  EXPORT_FAILED: 'QBO_RPT_004',
  INVALID_PARAMETERS: 'QBO_RPT_005',
} as const;

/**
 * Network errors (QBO_NET_xxx)
 */
export const NETWORK_ERRORS = {
  TIMEOUT: 'QBO_NET_001',
  CONNECTION_FAILED: 'QBO_NET_002',
  DNS_LOOKUP_FAILED: 'QBO_NET_003',
  SSL_ERROR: 'QBO_NET_004',
  PROXY_ERROR: 'QBO_NET_005',
} as const;

/**
 * Cache errors (QBO_CACHE_xxx)
 */
export const CACHE_ERRORS = {
  WRITE_FAILED: 'QBO_CACHE_001',
  READ_FAILED: 'QBO_CACHE_002',
  INVALIDATION_FAILED: 'QBO_CACHE_003',
  STORAGE_FULL: 'QBO_CACHE_004',
} as const;

/**
 * Webhook errors (QBO_HOOK_xxx)
 */
export const WEBHOOK_ERRORS = {
  INVALID_SIGNATURE: 'QBO_HOOK_001',
  REPLAY_ATTACK: 'QBO_HOOK_002',
  MALFORMED_PAYLOAD: 'QBO_HOOK_003',
  PROCESSING_FAILED: 'QBO_HOOK_004',
  QUEUE_FULL: 'QBO_HOOK_005',
} as const;

/**
 * Automation errors (QBO_AUTO_xxx)
 */
export const AUTOMATION_ERRORS = {
  SCHEDULE_NOT_FOUND: 'QBO_AUTO_001',
  SCHEDULE_FAILED: 'QBO_AUTO_002',
  WORKFLOW_FAILED: 'QBO_AUTO_003',
  RULE_EVALUATION_FAILED: 'QBO_AUTO_004',
  TEMPLATE_NOT_FOUND: 'QBO_AUTO_005',
} as const;

/**
 * System errors (QBO_SYS_xxx)
 */
export const SYSTEM_ERRORS = {
  UNKNOWN: 'QBO_SYS_001',
  CONFIGURATION_ERROR: 'QBO_SYS_002',
  SERVICE_UNAVAILABLE: 'QBO_SYS_003',
  INTERNAL_ERROR: 'QBO_SYS_004',
  NOT_IMPLEMENTED: 'QBO_SYS_005',
} as const;

/**
 * All error codes combined
 */
export const ERROR_CODES = {
  ...AUTH_ERRORS,
  ...RATE_LIMIT_ERRORS,
  ...VALIDATION_ERRORS,
  ...INVOICE_ERRORS,
  ...PAYMENT_ERRORS,
  ...EXPENSE_ERRORS,
  ...CUSTOMER_ERRORS,
  ...REPORT_ERRORS,
  ...NETWORK_ERRORS,
  ...CACHE_ERRORS,
  ...WEBHOOK_ERRORS,
  ...AUTOMATION_ERRORS,
  ...SYSTEM_ERRORS,
} as const;

/**
 * Type for error codes
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Get error category from code
 *
 * @param code - Error code
 * @returns Error category
 */
export function getErrorCategory(code: string): string {
  const parts = code.split('_');
  const prefix = parts.length > 1 ? parts[1] : '';

  const categoryMap: Record<string, string> = {
    AUTH: 'Authentication',
    RATE: 'Rate Limiting',
    VAL: 'Validation',
    INV: 'Invoice',
    PAY: 'Payment',
    EXP: 'Expense',
    CUST: 'Customer',
    RPT: 'Report',
    NET: 'Network',
    CACHE: 'Cache',
    HOOK: 'Webhook',
    AUTO: 'Automation',
    SYS: 'System',
  };

  return categoryMap[prefix] || 'Unknown';
}

/**
 * Check if error is recoverable
 *
 * @param code - Error code
 * @returns True if error is recoverable
 */
export function isRecoverableError(code: string): boolean {
  const recoverableCodes = [
    AUTH_ERRORS.TOKEN_EXPIRED,
    RATE_LIMIT_ERRORS.EXCEEDED,
    RATE_LIMIT_ERRORS.THROTTLED,
    NETWORK_ERRORS.TIMEOUT,
    NETWORK_ERRORS.CONNECTION_FAILED,
  ];

  return recoverableCodes.includes(code as any);
}
