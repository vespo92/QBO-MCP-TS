import { QBOError, AuthenticationError, ValidationError, RateLimitError, NetworkError } from '../types/index.js';
import { getErrorDefinition } from './catalog.js';
import { ERROR_CODES, isRecoverableError } from './codes.js';
import type { AxiosError } from 'axios';

/**
 * Error context for providing additional debugging information
 */
export interface ErrorContext {
  [key: string]: unknown;
  requestId?: string;
  tool?: string;
  timestamp?: string;
  retryCount?: number;
  retryAfter?: number;
}

/**
 * Error builder for creating contextual, user-friendly errors
 *
 * Provides utilities to:
 * - Create errors from catalog codes
 * - Convert external errors to QBO errors
 * - Add contextual suggestions
 * - Determine error recoverability
 *
 * @example
 * ```typescript
 * // Create from catalog code
 * const error = ErrorBuilder.fromCode('QBO_AUTH_001');
 *
 * // Convert Axios error
 * const error = ErrorBuilder.fromAxiosError(axiosError);
 *
 * // Add context
 * const error = ErrorBuilder.fromCode('QBO_INV_001', { invoiceId: '123' });
 * ```
 */
export class ErrorBuilder {
  /**
   * Create error from catalog code
   *
   * @param code - Error code from ERROR_CODES
   * @param context - Optional context data
   * @returns Appropriate QBO error instance
   */
  static fromCode(code: string, context?: ErrorContext): QBOError {
    const def = getErrorDefinition(code);

    if (!def) {
      return new QBOError(
        'An unknown error occurred',
        'QBO_SYS_001',
        'Please try again or check the logs for more details',
        context
      );
    }

    // Create appropriate error subclass based on error type
    const ErrorClass = this.getErrorClass(code);

    return new ErrorClass(def.message, def.code, def.suggestion, context);
  }

  /**
   * Convert standard Error to QBOError
   *
   * @param error - Error instance
   * @param context - Optional context data
   * @returns QBO error
   */
  static fromError(error: Error, context?: ErrorContext): QBOError {
    if (error instanceof QBOError) {
      return error;
    }

    // Try to infer error type from message
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return this.fromCode(ERROR_CODES.TIMEOUT, {
        ...context,
        originalError: error.message,
      });
    }

    if (message.includes('network') || message.includes('econnrefused')) {
      return this.fromCode(ERROR_CODES.CONNECTION_FAILED, {
        ...context,
        originalError: error.message,
      });
    }

    if (message.includes('401') || message.includes('unauthorized')) {
      return this.fromCode(ERROR_CODES.TOKEN_EXPIRED, {
        ...context,
        originalError: error.message,
      });
    }

    if (message.includes('403') || message.includes('forbidden')) {
      return this.fromCode(ERROR_CODES.PERMISSIONS_DENIED, {
        ...context,
        originalError: error.message,
      });
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return this.fromCode(ERROR_CODES.EXCEEDED, {
        ...context,
        originalError: error.message,
      });
    }

    // Generic error
    return new QBOError(
      error.message || 'An unexpected error occurred',
      ERROR_CODES.UNKNOWN,
      'Please try again. If the problem persists, check the logs for more details.',
      {
        ...context,
        originalError: error.message,
        stack: error.stack,
      }
    );
  }

  /**
   * Convert Axios error to QBOError
   *
   * @param error - Axios error
   * @param context - Optional context data
   * @returns Appropriate QBO error
   */
  static fromAxiosError(error: AxiosError, context?: ErrorContext): QBOError {
    const status = error.response?.status;
    const data = error.response?.data as any;

    // Extract QuickBooks error details if available
    const qboError = data?.Fault?.Error?.[0];
    const qboMessage = qboError?.Message || data?.message;
    const qboDetail = qboError?.Detail;

    // Map HTTP status to error code
    if (status === 401) {
      return this.fromCode(ERROR_CODES.TOKEN_EXPIRED, {
        ...context,
        statusCode: status,
        qboMessage,
        qboDetail,
      });
    }

    if (status === 403) {
      return this.fromCode(ERROR_CODES.PERMISSIONS_DENIED, {
        ...context,
        statusCode: status,
        qboMessage,
        qboDetail,
      });
    }

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];

      return this.fromCode(ERROR_CODES.EXCEEDED, {
        ...context,
        statusCode: status,
        retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
        qboMessage,
      });
    }

    if (status === 400) {
      // Validation error
      return new ValidationError(
        qboMessage || 'Invalid request parameters',
        ERROR_CODES.INVALID_FORMAT,
        'Check the request parameters and try again',
        {
          ...context,
          statusCode: status,
          qboDetail,
          validationErrors: qboError?.ValidationErrors,
        }
      );
    }

    if (status === 404) {
      return new QBOError(
        qboMessage || 'Resource not found',
        ERROR_CODES.NOT_FOUND,
        'Verify the ID is correct. The resource may have been deleted.',
        {
          ...context,
          statusCode: status,
          qboDetail,
        }
      );
    }

    if (status && status >= 500) {
      return this.fromCode(ERROR_CODES.SERVICE_UNAVAILABLE, {
        ...context,
        statusCode: status,
        qboMessage,
        qboDetail,
      });
    }

    // Network errors (no response)
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return this.fromCode(ERROR_CODES.TIMEOUT, {
        ...context,
        errorCode: error.code,
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return this.fromCode(ERROR_CODES.CONNECTION_FAILED, {
        ...context,
        errorCode: error.code,
      });
    }

    // Generic Axios error
    return new NetworkError(
      error.message || 'Network request failed',
      ERROR_CODES.UNKNOWN,
      'Check your network connection and try again',
      {
        ...context,
        errorCode: error.code,
        statusCode: status,
        qboMessage,
      }
    );
  }

  /**
   * Create validation error with field details
   *
   * @param fields - Array of field errors
   * @param context - Optional context data
   * @returns Validation error
   */
  static validationError(
    fields: Array<{ field: string; message: string; code?: string }>,
    context?: ErrorContext
  ): ValidationError {
    const fieldList = fields.map((f) => f.field).join(', ');

    return new ValidationError(
      `Validation failed for fields: ${fieldList}`,
      ERROR_CODES.MISSING_FIELD,
      'Check the required parameters and their formats',
      {
        ...context,
        fields,
      }
    );
  }

  /**
   * Create invoice-specific error
   *
   * @param message - Error message
   * @param code - Error code
   * @param context - Optional context
   * @returns QBO error
   */
  static invoiceError(message: string, code: string, context?: ErrorContext): QBOError {
    const def = getErrorDefinition(code);

    return new QBOError(message, code, def?.suggestion || 'See documentation for invoice operations', context);
  }

  /**
   * Create authentication error with refresh suggestion
   *
   * @param message - Error message
   * @param context - Optional context
   * @returns Authentication error
   */
  static authError(message: string, context?: ErrorContext): AuthenticationError {
    return new AuthenticationError(
      message,
      ERROR_CODES.TOKEN_EXPIRED,
      'Refreshing authentication automatically. This should not affect your request.',
      context
    );
  }

  /**
   * Get appropriate error class based on code
   *
   * @param code - Error code
   * @returns Error class constructor
   */
  private static getErrorClass(code: string): typeof QBOError {
    if (code.startsWith('QBO_AUTH_')) {
      return AuthenticationError;
    }

    if (code.startsWith('QBO_VAL_')) {
      return ValidationError;
    }

    if (code.startsWith('QBO_RATE_')) {
      return RateLimitError;
    }

    if (code.startsWith('QBO_NET_')) {
      return NetworkError;
    }

    return QBOError;
  }

  /**
   * Check if error is recoverable (can be retried)
   *
   * @param error - Error to check
   * @returns True if error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof QBOError && error.code) {
      return isRecoverableError(error.code);
    }

    return false;
  }

  /**
   * Get retry delay for recoverable error
   *
   * @param error - Error instance
   * @param attempt - Retry attempt number (0-based)
   * @returns Delay in milliseconds
   */
  static getRetryDelay(error: Error, attempt: number): number {
    if (!this.isRecoverable(error)) {
      return 0;
    }

    // Check if error has explicit retry-after header
    if (error instanceof QBOError && error.details?.retryAfter) {
      return error.details.retryAfter * 1000;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const baseDelay = 1000;
    const maxDelay = 16000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);

    return Math.floor(delay + jitter);
  }

  /**
   * Format error for user display
   *
   * @param error - Error to format
   * @returns Formatted error message
   */
  static formatForDisplay(error: Error): string {
    if (!(error instanceof QBOError)) {
      return error.message;
    }

    let message = `❌ ${error.message}`;

    if (error.code) {
      message += `\n\n📋 Error Code: ${error.code}`;
    }

    if (error.suggestion) {
      message += `\n\n💡 Suggestion: ${error.suggestion}`;
    }

    if (error.details && Object.keys(error.details).length > 0) {
      const detailsStr = JSON.stringify(error.details, null, 2);
      message += `\n\n📝 Details:\n${detailsStr}`;
    }

    return message;
  }
}
