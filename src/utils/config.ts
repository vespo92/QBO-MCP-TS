/**
 * Configuration management for QBOMCP-TS
 */

import { config as dotenvConfig } from 'dotenv';
import { QBOConfig, TransportConfig } from '../types';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenvConfig();

/**
 * Environment variable schema for validation
 */
const EnvSchema = z.object({
  // QuickBooks OAuth Configuration
  QBO_CLIENT_ID: z.string().min(1),
  QBO_CLIENT_SECRET: z.string().min(1),
  QBO_COMPANY_ID: z.string().min(1),
  QBO_REFRESH_TOKEN: z.string().min(1),
  QBO_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  QBO_REDIRECT_URI: z.string().url().optional(),

  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug']).default('info'),

  // Transport Configuration
  TRANSPORT_TYPE: z.enum(['stdio', 'sse']).default('stdio'),
  SSE_PORT: z.coerce.number().default(3000),
  SSE_HOST: z.string().default('0.0.0.0'),

  // Cache Configuration
  CACHE_TTL: z.coerce.number().default(300), // 5 minutes
  CACHE_MAX_SIZE: z.coerce.number().default(100),

  // API Configuration
  API_RETRY_ATTEMPTS: z.coerce.number().default(3),
  API_RETRY_DELAY: z.coerce.number().default(1000),
  API_TIMEOUT: z.coerce.number().default(30000),
  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(60),

  // Security Configuration
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Feature Flags
  ENABLE_CACHE: z.coerce.boolean().default(true),
  ENABLE_RETRY: z.coerce.boolean().default(true),
  ENABLE_HEALTH_CHECK: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(false),

  // File Paths
  LOG_DIR: z.string().default('./logs'),
  CACHE_DIR: z.string().default('./cache'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Configuration class for managing application settings
 */
export class Config {
  private static instance: Config;
  private env: EnvConfig;
  private configFile?: any;

  private constructor() {
    // Parse and validate environment variables
    const parseResult = EnvSchema.safeParse(process.env);

    if (!parseResult.success) {
      const missingVars = parseResult.error.issues.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }

    this.env = parseResult.data;

    // Load additional config from file if exists
    this.loadConfigFile();

    // Create necessary directories
    this.ensureDirectories();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Load configuration from JSON file if it exists
   */
  private loadConfigFile(): void {
    const configPath = path.resolve(process.cwd(), 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        this.configFile = JSON.parse(configContent);
      } catch (error) {
        console.warn(`Failed to load config.json: ${error}`);
      }
    }
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [this.env.LOG_DIR, this.env.CACHE_DIR];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get QuickBooks configuration
   */
  public getQBOConfig(): QBOConfig {
    return {
      clientId: this.env.QBO_CLIENT_ID,
      clientSecret: this.env.QBO_CLIENT_SECRET,
      companyId: this.env.QBO_COMPANY_ID,
      refreshToken: this.env.QBO_REFRESH_TOKEN,
      environment: this.env.QBO_ENVIRONMENT,
      redirectUri: this.env.QBO_REDIRECT_URI,
    };
  }

  /**
   * Get transport configuration
   */
  public getTransportConfig(): TransportConfig {
    return {
      type: this.env.TRANSPORT_TYPE,
      port: this.env.SSE_PORT,
      host: this.env.SSE_HOST,
      cors: {
        origin: this.env.CORS_ORIGIN.split(',').map((o) => o.trim()),
        credentials: true,
      },
      rateLimit: {
        windowMs: this.env.RATE_LIMIT_WINDOW_MS,
        max: this.env.RATE_LIMIT_MAX_REQUESTS,
      },
      healthCheckPath: this.env.ENABLE_HEALTH_CHECK ? '/health' : undefined,
    };
  }

  /**
   * Get cache configuration
   */
  public getCacheConfig() {
    return {
      enabled: this.env.ENABLE_CACHE,
      ttl: this.env.CACHE_TTL,
      maxSize: this.env.CACHE_MAX_SIZE,
      dir: this.env.CACHE_DIR,
    };
  }

  /**
   * Get API configuration
   */
  public getAPIConfig() {
    return {
      retryAttempts: this.env.API_RETRY_ATTEMPTS,
      retryDelay: this.env.API_RETRY_DELAY,
      timeout: this.env.API_TIMEOUT,
      rateLimitPerMinute: this.env.API_RATE_LIMIT_PER_MINUTE,
      enableRetry: this.env.ENABLE_RETRY,
    };
  }

  /**
   * Get logger configuration
   */
  public getLoggerConfig() {
    return {
      level: this.env.LOG_LEVEL,
      dir: this.env.LOG_DIR,
      enableConsole: this.env.NODE_ENV !== 'production',
      enableFile: true,
    };
  }

  /**
   * Get feature flags
   */
  public getFeatureFlags() {
    return {
      cache: this.env.ENABLE_CACHE,
      retry: this.env.ENABLE_RETRY,
      healthCheck: this.env.ENABLE_HEALTH_CHECK,
      metrics: this.env.ENABLE_METRICS,
    };
  }

  /**
   * Get environment
   */
  public getEnv(): 'development' | 'production' | 'test' {
    return this.env.NODE_ENV;
  }

  /**
   * Check if in development mode
   */
  public isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  /**
   * Check if in production mode
   */
  public isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  /**
   * Check if in test mode
   */
  public isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  /**
   * Get a custom config value from config.json
   */
  public getCustom<T = any>(path: string, defaultValue?: T): T | undefined {
    if (!this.configFile) {
      return defaultValue;
    }

    const keys = path.split('.');
    let value = this.configFile;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value as T;
  }

  /**
   * Get all configuration (for debugging)
   */
  public getAll(): any {
    return {
      qbo: this.getQBOConfig(),
      transport: this.getTransportConfig(),
      cache: this.getCacheConfig(),
      api: this.getAPIConfig(),
      logger: this.getLoggerConfig(),
      features: this.getFeatureFlags(),
      environment: this.getEnv(),
      custom: this.configFile,
    };
  }
}

// Export singleton instance
export const config = Config.getInstance();
