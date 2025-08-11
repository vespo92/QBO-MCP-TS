/**
 * QuickBooks Online API Client with retry logic and error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import {
  QBOConfig,
  QBOTokens,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  QBOError,
} from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * QuickBooks Online API Client
 */
export class QBOApiClient {
  private axiosInstance: AxiosInstance;
  private tokens: QBOTokens;
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private readonly qboConfig: QBOConfig;
  private tokenRefreshPromise?: Promise<void>;

  constructor(qboConfig?: QBOConfig) {
    this.qboConfig = qboConfig || config.getQBOConfig();
    const apiConfig = config.getAPIConfig();

    // Set base URLs based on environment
    if (this.qboConfig.environment === 'production') {
      this.baseUrl = `https://quickbooks.api.intuit.com/v3/company/${this.qboConfig.companyId}`;
      this.authUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    } else {
      this.baseUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${this.qboConfig.companyId}`;
      this.authUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    }

    // Initialize tokens
    this.tokens = {
      accessToken: '',
      refreshToken: this.qboConfig.refreshToken,
      expiresAt: new Date(0), // Force initial refresh
    };

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: apiConfig.timeout,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Ensure we have a valid access token
        await this.ensureValidToken();

        // Add authorization header
        config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;

        // Log API request
        const timer = logger.startTimer();
        (config as any).metadata = { timer };

        logger.api('Request', {
          method: config.method?.toUpperCase(),
          endpoint: config.url,
        });

        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging and error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful response
        const duration = (response.config as any).metadata?.timer?.() || 0;

        logger.api('Response', {
          method: response.config.method?.toUpperCase(),
          endpoint: response.config.url,
          statusCode: response.status,
          duration,
        });

        return response;
      },
      async (error: AxiosError) => {
        const duration = (error.config as any)?.metadata?.timer?.() || 0;

        // Log error response
        logger.api('Error', {
          method: error.config?.method?.toUpperCase(),
          endpoint: error.config?.url,
          statusCode: error.response?.status,
          duration,
          error: error.message,
        });

        // Handle specific error types
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;

          switch (status) {
            case 401:
              // Try to refresh token once
              if (!(error.config as any)?.retry) {
                (error.config as any).retry = true;
                await this.refreshAccessToken();
                return this.axiosInstance.request(error.config!);
              }
              throw new AuthenticationError(
                'Authentication failed. Please check your credentials.',
                data,
              );

            case 429:
              const retryAfter = error.response.headers['retry-after'];
              throw new RateLimitError(
                'Rate limit exceeded. Please try again later.',
                retryAfter ? parseInt(retryAfter) : undefined,
              );

            case 400:
              throw new QBOError(
                data?.Fault?.Error?.[0]?.Message || 'Bad request',
                'VALIDATION_ERROR',
                400,
                data,
              );

            case 403:
              throw new QBOError(
                'Access forbidden. Check your permissions.',
                'FORBIDDEN',
                403,
                data,
              );

            case 404:
              throw new QBOError('Resource not found', 'NOT_FOUND', 404, data);

            case 500:
            case 502:
            case 503:
            case 504:
              throw new NetworkError('QuickBooks service is temporarily unavailable', data);

            default:
              throw new QBOError(
                data?.Fault?.Error?.[0]?.Message || 'An error occurred',
                'UNKNOWN_ERROR',
                status,
                data,
              );
          }
        } else if (error.request) {
          throw new NetworkError('Network error. Please check your connection.');
        } else {
          throw new QBOError(error.message, 'REQUEST_ERROR');
        }
      },
    );

    // Configure retry logic if enabled
    if (apiConfig.enableRetry) {
      axiosRetry(this.axiosInstance, {
        retries: apiConfig.retryAttempts,
        retryDelay: (retryCount) => {
          const delay = apiConfig.retryDelay * Math.pow(2, retryCount - 1);
          logger.info(`Retrying request (attempt ${retryCount}), waiting ${delay}ms`);
          return delay;
        },
        retryCondition: (error) => {
          // Retry on network errors and 5xx status codes
          return (
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            (error.response?.status ? error.response.status >= 500 : false)
          );
        },
        onRetry: (retryCount, error) => {
          logger.warn(`Retry attempt ${retryCount} for ${error.config?.url}`, {
            error: error.message,
          });
        },
      });
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    const now = new Date();
    const expiryBuffer = new Date(this.tokens.expiresAt.getTime() - 60000); // 1 minute buffer

    if (now >= expiryBuffer) {
      // Use existing refresh promise if one is in progress
      if (!this.tokenRefreshPromise) {
        this.tokenRefreshPromise = this.refreshAccessToken();
      }
      await this.tokenRefreshPromise;
      this.tokenRefreshPromise = undefined;
    }
  }

  /**
   * Refresh the OAuth2 access token
   */
  private async refreshAccessToken(): Promise<void> {
    logger.info('Refreshing QuickBooks access token');

    try {
      const authHeader = Buffer.from(
        `${this.qboConfig.clientId}:${this.qboConfig.clientSecret}`,
      ).toString('base64');

      const response = await axios.post(
        this.authUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refreshToken,
        }),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authHeader}`,
          },
        },
      );

      const data = response.data;

      // Update tokens
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };

      logger.info('Successfully refreshed QuickBooks access token', {
        expiresAt: this.tokens.expiresAt.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to refresh access token', error);
      throw new AuthenticationError(
        'Failed to refresh access token. Please check your credentials.',
      );
    }
  }

  /**
   * Make a GET request to QuickBooks API
   */
  public async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.axiosInstance.get<T>(endpoint, { params });
    return response.data;
  }

  /**
   * Make a POST request to QuickBooks API
   */
  public async post<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.axiosInstance.post<T>(endpoint, data);
    return response.data;
  }

  /**
   * Make a PUT request to QuickBooks API
   */
  public async put<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.axiosInstance.put<T>(endpoint, data);
    return response.data;
  }

  /**
   * Make a DELETE request to QuickBooks API
   */
  public async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.axiosInstance.delete<T>(endpoint);
    return response.data;
  }

  /**
   * Execute a query using QuickBooks Query Language
   */
  public async query<T = any>(query: string): Promise<T> {
    const response = await this.axiosInstance.get<T>('/query', {
      params: { query },
    });
    return response.data;
  }

  /**
   * Send an email for an entity (invoice, estimate, etc.)
   */
  public async sendEmail(entityType: string, entityId: string, email?: string): Promise<any> {
    const endpoint = `/${entityType.toLowerCase()}/${entityId}/send`;
    const params = email ? { sendTo: email } : undefined;

    const response = await this.axiosInstance.post(endpoint, null, { params });
    return response.data;
  }

  /**
   * Download a PDF for an entity
   */
  public async downloadPDF(entityType: string, entityId: string): Promise<Buffer> {
    const endpoint = `/${entityType.toLowerCase()}/${entityId}/pdf`;

    const response = await this.axiosInstance.get(endpoint, {
      responseType: 'arraybuffer',
      headers: {
        Accept: 'application/pdf',
      },
    });

    return Buffer.from(response.data);
  }

  /**
   * Get company info
   */
  public async getCompanyInfo(): Promise<any> {
    return this.get('/companyinfo/1');
  }

  /**
   * Get current user info
   */
  public async getCurrentUser(): Promise<any> {
    // const authHeader = Buffer.from(
    //   `${this.qboConfig.clientId}:${this.qboConfig.clientSecret}`
    // ).toString('base64');

    const response = await axios.get(
      'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.tokens.accessToken}`,
        },
      },
    );

    return response.data;
  }

  /**
   * Batch operations
   */
  public async batch(
    operations: Array<{
      bId: string;
      operation: 'create' | 'update' | 'query' | 'delete';
      entity?: string;
      data?: any;
      query?: string;
    }>,
  ): Promise<any> {
    const batchRequest = {
      BatchItemRequest: operations.map((op) => {
        const item: any = { bId: op.bId };

        switch (op.operation) {
          case 'create':
            item[op.entity!] = op.data;
            item.operation = 'create';
            break;
          case 'update':
            item[op.entity!] = op.data;
            item.operation = 'update';
            break;
          case 'delete':
            item[op.entity!] = { Id: op.data.Id };
            item.operation = 'delete';
            break;
          case 'query':
            item.Query = op.query;
            break;
        }

        return item;
      }),
    };

    return this.post('/batch', batchRequest);
  }

  /**
   * Get API limits and usage
   */
  public async getApiLimits(): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    // QuickBooks doesn't provide a direct API for this,
    // but we can track it from response headers
    try {
      const response = await this.axiosInstance.get('/companyinfo/1');

      const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '1000');
      const limit = parseInt(response.headers['x-ratelimit-limit'] || '1000');
      const reset = response.headers['x-ratelimit-reset']
        ? new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000)
        : new Date(Date.now() + 3600000);

      return { remaining, limit, reset };
    } catch (_error) {
      // Return default values if headers are not available
      return {
        remaining: 1000,
        limit: 1000,
        reset: new Date(Date.now() + 3600000),
      };
    }
  }
}
