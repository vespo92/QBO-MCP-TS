/**
 * Third-Party Integration Framework
 *
 * This module provides a standardized framework for integrating with
 * Intuit-sanctioned third-party applications and services.
 */

export * from './base-integration.js';
export * from './registry.js';
export * from './types.js';

// Integration implementations
export * from './qb-payments/index.js';
export * from './qb-time/index.js';
export * from './plaid/index.js';
export * from './webhook-relay/index.js';
