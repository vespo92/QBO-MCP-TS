/**
 * Simple structured logger for QBOMCP-TS
 */

type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  requestId?: string;
}

/**
 * Simple logger class with structured output
 */
export class Logger {
  private readonly levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
  };

  private currentLevel: LogLevel = 'info';
  private requestId?: string;
  private silent = false;

  constructor(level: LogLevel = 'info') {
    this.currentLevel = level;
    // In production or test, reduce console output
    if (process.env['NODE_ENV'] === 'test') {
      this.silent = true;
    }
  }

  /**
   * Set the current request ID
   */
  setRequestId(id?: string): void {
    this.requestId = id;
  }

  /**
   * Check if should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;
    return this.levels[level] <= this.levels[this.currentLevel];
  }

  /**
   * Format and output log entry
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.requestId && { requestId: this.requestId }),
      ...(meta && { meta }),
    };

    // In development, use pretty printing
    if (process.env['NODE_ENV'] === 'development') {
      const color = this.getColor(level);
      console.log(
        `${color}[${entry.timestamp}] ${level.toUpperCase()}: ${message}${this.resetColor()}`,
      );
      if (meta) {
        console.log(JSON.stringify(meta, null, 2));
      }
    } else {
      // In production, use JSON for structured logging
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Get color code for log level (for development)
   */
  private getColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m', // Yellow
      info: '\x1b[36m', // Cyan
      http: '\x1b[35m', // Magenta
      verbose: '\x1b[34m', // Blue
      debug: '\x1b[90m', // Gray
    };
    return colors[level] || '';
  }

  private resetColor(): string {
    return '\x1b[0m';
  }

  // Log level methods
  error(message: string, error?: any): void {
    const meta =
      error instanceof Error
        ? {
            error: error.message,
            stack: error.stack,
          }
        : error;
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  http(message: string, meta?: any): void {
    this.log('http', message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.log('verbose', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  // Specialized logging methods
  tool(toolName: string, status: 'start' | 'complete' | 'error', details?: any): void {
    const message = `Tool: ${toolName} - ${status}`;
    if (status === 'error') {
      this.error(message, details);
    } else {
      this.info(message, details);
    }
  }

  api(method: string, url: string, details: any): void {
    this.http(`API: ${method} ${url}`, details);
  }

  performance(operation: string, duration: number, meta?: any): void {
    this.info(`Performance: ${operation}`, {
      ...meta,
      operation,
      duration,
      unit: 'ms',
    });
  }

  cache(operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear', key?: string, meta?: any): void {
    this.debug(`Cache: ${operation}`, {
      ...meta,
      key,
      operation,
    });
  }
}

// Export a lazy getter for the logger instance
let loggerInstance: Logger | null = null;

export const getLogger = () => {
  if (!loggerInstance) {
    const level = (process.env['LOG_LEVEL'] as LogLevel) || 'info';
    loggerInstance = new Logger(level);
  }
  return loggerInstance;
};

// For backward compatibility, export a proxy that initializes lazily
export const logger = new Proxy({} as Logger, {
  get(_target, prop, receiver) {
    const instance = getLogger();
    return Reflect.get(instance, prop, receiver);
  },
});
