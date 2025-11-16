/**
 * Error handling module
 *
 * Provides:
 * - Error classes (QBOError, AuthenticationError, etc.)
 * - Error codes catalog
 * - Error builder utilities
 * - Contextual error suggestions
 */

// Re-export error classes from types
export {
  QBOError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  NetworkError,
} from '../types/index.js';

// Export error codes
export * from './codes.js';

// Export error catalog
export * from './catalog.js';

// Export error builder
export { ErrorBuilder, type ErrorContext } from './builder.js';
