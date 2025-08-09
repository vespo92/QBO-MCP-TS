/**
 * Logger service for QBOMCP-TS
 */

import winston from 'winston';
import path from 'path';
import { config } from './config';
import { ILoggerService } from '../types';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format for better readability
 */
const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }

  // Add stack trace for errors
  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

/**
 * Logger implementation using Winston
 */
class Logger implements ILoggerService {
  private winston: winston.Logger;
  private requestId?: string;

  constructor() {
    const logConfig = config.getLoggerConfig();

    // Create transports array
    const transports: winston.transport[] = [];

    // Console transport for development
    if (logConfig.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            customFormat,
          ),
        }),
      );
    }

    // File transports for production
    if (logConfig.enableFile) {
      // General log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logConfig.dir, 'combined.log'),
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            customFormat,
          ),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logConfig.dir, 'error.log'),
          level: 'error',
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            errors({ stack: true }),
            customFormat,
          ),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );

      // API log file for QuickBooks API calls
      transports.push(
        new winston.transports.File({
          filename: path.join(logConfig.dir, 'api.log'),
          level: 'http',
          format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    // Create Winston logger
    this.winston = winston.createLogger({
      level: logConfig.level,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Set request ID for tracing
   */
  public setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * Clear request ID
   */
  public clearRequestId(): void {
    this.requestId = undefined;
  }

  /**
   * Add request ID to metadata
   */
  private addRequestId(meta: any = {}): any {
    if (this.requestId) {
      return { ...meta, requestId: this.requestId };
    }
    return meta;
  }

  /**
   * Log info message
   */
  public info(message: string, meta?: any): void {
    this.winston.info(message, this.addRequestId(meta));
  }

  /**
   * Log warning message
   */
  public warn(message: string, meta?: any): void {
    this.winston.warn(message, this.addRequestId(meta));
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = this.addRequestId({
      ...meta,
      ...(error && {
        errorName: error.name || 'Error',
        errorMessage: error.message || String(error),
        errorStack: error.stack,
        errorCode: error.code,
        errorDetails: error.details,
      }),
    });

    this.winston.error(message, errorMeta);
  }

  /**
   * Log debug message
   */
  public debug(message: string, meta?: any): void {
    this.winston.debug(message, this.addRequestId(meta));
  }

  /**
   * Log HTTP request/response
   */
  public http(message: string, meta?: any): void {
    this.winston.http(message, this.addRequestId(meta));
  }

  /**
   * Log API call
   */
  public api(
    operation: string,
    details: {
      method?: string;
      endpoint?: string;
      statusCode?: number;
      duration?: number;
      error?: any;
      request?: any;
      response?: any;
    },
  ): void {
    const message = `QuickBooks API: ${operation}`;
    const meta = this.addRequestId({
      operation,
      ...details,
      timestamp: new Date().toISOString(),
    });

    if (details.error) {
      this.winston.error(message, meta);
    } else {
      this.winston.http(message, meta);
    }
  }

  /**
   * Log performance metrics
   */
  public performance(operation: string, duration: number, meta?: any): void {
    this.winston.info(
      `Performance: ${operation}`,
      this.addRequestId({
        ...meta,
        operation,
        duration,
        unit: 'ms',
      }),
    );
  }

  /**
   * Log cache operation
   */
  public cache(
    operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear',
    key?: string,
    meta?: any,
  ): void {
    this.winston.debug(
      `Cache ${operation}`,
      this.addRequestId({
        ...meta,
        operation,
        key,
      }),
    );
  }

  /**
   * Create child logger with context
   */
  public child(context: any): Logger {
    const childLogger = new Logger();
    childLogger.winston = this.winston.child(context);
    if (this.requestId) {
      childLogger.requestId = this.requestId;
    }
    return childLogger;
  }

  /**
   * Start a timer for performance logging
   */
  public startTimer(): () => void {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Log MCP tool execution
   */
  public tool(toolName: string, phase: 'start' | 'complete' | 'error', details?: any): void {
    const message = `MCP Tool ${toolName}: ${phase}`;
    const meta = this.addRequestId({
      tool: toolName,
      phase,
      ...details,
    });

    if (phase === 'error') {
      this.winston.error(message, meta);
    } else {
      this.winston.info(message, meta);
    }
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export logger class for testing
export { Logger };
