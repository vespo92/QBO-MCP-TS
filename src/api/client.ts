/**
 * QuickBooks Online API Client with retry logic and error handling
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
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

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Ensure we have a valid token
        await this.ensureValidToken();

        // Add authorization header
        config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;

        // Log API request
        const startTime = Date.now();
        (config as any).metadata = { startTime };

        logger.api('Request', config.url || '', {
          method: config.method?.toUpperCase(),
          endpoint: config.url,
        });

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful response
        const startTime = (response.config as any).metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        logger.api(response.config.method?.toUpperCase() || 'GET', response.config.url || '', {
          status: response.status,
          duration,
        });

        return response;
      },
      async (error: AxiosError) => {
        const startTime = (error.config as any)?.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        if (error.response) {
          // Log error response
          logger.api(error.config?.method?.toUpperCase() || 'GET', error.config?.url || '', {
            status: error.response?.status,
            error: error.message,
            duration,
          });

          // Handle specific error types
          if (error.response.status === 401) {
            // Try to refresh token once
            if (!(error.config as any)?._retry) {
              (error.config as any)._retry = true;
              await this.refreshAccessToken();
              return this.axiosInstance(error.config!);
            }
            throw new AuthenticationError('Authentication failed. Please check your credentials.');
          } else if (error.response.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            throw new RateLimitError(
              `Rate limit exceeded. Retry after ${retryAfter || 'unknown'} seconds.`,
            );
          } else if (error.response.status === 403) {
            throw new AuthenticationError(
              'Access forbidden. Check your app permissions and company ID.',
            );
          } else if (error.response.status >= 500) {
            throw new QBOError('QuickBooks server error. Please try again later.', 'SERVER_ERROR');
          } else {
            const qboError = error.response.data as any;
            throw new QBOError(
              qboError?.Fault?.Error?.[0]?.Message || error.message,
              qboError?.Fault?.Error?.[0]?.code || 'UNKNOWN_ERROR',
              qboError?.Fault?.Error?.[0]?.Detail,
            );
          }
        } else if (error.request) {
          logger.api(error.config?.method?.toUpperCase() || 'GET', error.config?.url || '', {
            error: error.message,
            duration,
          });
          throw new NetworkError('Network error. Please check your connection.');
        } else {
          throw new QBOError(error.message, 'REQUEST_ERROR');
        }
      },
    );

    // Configure simple retry logic if enabled
    if (apiConfig.enableRetry) {
      this.setupRetryInterceptor(apiConfig.retryAttempts, apiConfig.retryDelay);
    }
  }

  /**
   * Setup simple retry interceptor
   */
  private setupRetryInterceptor(maxRetries: number, retryDelay: number): void {
    this.axiosInstance.interceptors.response.use(undefined, async (error: AxiosError) => {
      const config = error.config as any;
      if (!config) {
        return Promise.reject(error);
      }

      config.retryCount = config.retryCount || 0;

      // Check if we should retry
      const shouldRetry =
        config.retryCount < maxRetries &&
        (error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          (error.response?.status && error.response.status >= 500));

      if (!shouldRetry) {
        return Promise.reject(error);
      }

      config.retryCount += 1;
      const delay = retryDelay * Math.pow(2, config.retryCount - 1);

      logger.warn(`Retrying request (attempt ${config.retryCount}/${maxRetries})`, {
        url: config.url,
        delay,
      });

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.axiosInstance(config);
    });
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    const now = new Date();
    const expiryBuffer = new Date(this.tokens.expiresAt.getTime() - 60000); // 1 minute buffer

    if (now >= expiryBuffer) {
      // Avoid concurrent refresh requests
      if (!this.tokenRefreshPromise) {
        this.tokenRefreshPromise = this.refreshAccessToken().then(() => undefined);
      }
      await this.tokenRefreshPromise;
      this.tokenRefreshPromise = undefined;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  public async refreshAccessToken(): Promise<QBOTokens> {
    try {
      const response = await axios.post(
        this.authUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refreshToken,
          client_id: this.qboConfig.clientId,
          client_secret: this.qboConfig.clientSecret,
        }),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = response.data;
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };

      logger.info('Access token refreshed successfully', {
        expiresAt: this.tokens.expiresAt,
      });

      return this.tokens;
    } catch (error: any) {
      logger.error('Failed to refresh access token', error);
      throw new AuthenticationError(
        'Failed to refresh access token. Please check your refresh token.',
      );
    }
  }

  /**
   * Make a request to the QuickBooks API
   */
  public async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: any,
  ): Promise<AxiosResponse<T>> {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return this.axiosInstance.request<T>({
      method,
      url,
      data,
      params,
    });
  }

  /**
   * GET request
   */
  public async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.request<T>('GET', endpoint, undefined, params);
    return response.data;
  }

  /**
   * POST request
   */
  public async post<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.request<T>('POST', endpoint, data);
    return response.data;
  }

  /**
   * PUT request
   */
  public async put<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.request<T>('PUT', endpoint, data);
    return response.data;
  }

  /**
   * DELETE request
   */
  public async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.request<T>('DELETE', endpoint);
    return response.data;
  }

  /**
   * Query QuickBooks entities
   */
  public async query<T = any>(query: string): Promise<T> {
    return this.get<T>('/query', { query });
  }

  /**
   * Download PDF for an entity (Invoice, Estimate, etc.)
   */
  public async downloadPDF(entityType: string, entityId: string): Promise<Buffer> {
    const response = await this.axiosInstance.get(`/${entityType.toLowerCase()}/${entityId}/pdf`, {
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
   * Initialize the client (refresh token if needed)
   */
  public async initialize(): Promise<void> {
    await this.refreshAccessToken();
  }

  /**
   * Get API usage limits
   */
  public async getApiLimits(): Promise<any> {
    // QuickBooks doesn't have a specific endpoint for API limits
    // Return mock data for now
    return {
      callsRemaining: 500,
      callsLimit: 500,
      resetTime: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  /**
   * Send email for an entity
   */
  public async sendEmail(entityType: string, entityId: string, email: string): Promise<any> {
    return this.post(`/${entityType.toLowerCase()}/${entityId}/send`, {
      EmailAddress: email,
    });
  }
}

export class QuickBooksClient extends QBOApiClient {}
