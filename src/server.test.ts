/**
 * Basic tests for QBOMCP-TS Server
 */

import { QBOMCPServer } from './server';
import { config } from './utils/config';

// Mock the config to avoid needing real credentials for tests
jest.mock('./utils/config', () => ({
  config: {
    getQBOConfig: jest.fn(() => ({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      companyId: 'test-company-id',
      refreshToken: 'test-refresh-token',
      environment: 'sandbox' as const,
    })),
    getTransportConfig: jest.fn(() => ({
      type: 'stdio' as const,
      port: 3000,
      host: 'localhost',
    })),
    getCacheConfig: jest.fn(() => ({
      enabled: false,
      ttl: 300,
      maxSize: 100,
      dir: './cache',
    })),
    getAPIConfig: jest.fn(() => ({
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      rateLimitPerMinute: 60,
      enableRetry: true,
    })),
    getLoggerConfig: jest.fn(() => ({
      level: 'error',
      dir: './logs',
      enableConsole: false,
      enableFile: false,
    })),
    getFeatureFlags: jest.fn(() => ({
      cache: false,
      retry: true,
      healthCheck: true,
      metrics: false,
    })),
    getEnv: jest.fn(() => 'test' as const),
    isDevelopment: jest.fn(() => false),
    isProduction: jest.fn(() => false),
    isTest: jest.fn(() => true),
  },
}));

// Mock the API client to avoid real API calls
jest.mock('./api/client', () => ({
  QBOApiClient: jest.fn().mockImplementation(() => ({
    getApiLimits: jest.fn().mockResolvedValue({
      remaining: 1000,
      limit: 1000,
      reset: new Date(),
    }),
    getCompanyInfo: jest.fn().mockResolvedValue({
      CompanyName: 'Test Company',
      Country: 'US',
    }),
  })),
}));

describe('QBOMCP-TS Server', () => {
  let server: QBOMCPServer;
  
  beforeEach(() => {
    server = new QBOMCPServer();
  });
  
  afterEach(async () => {
    await server.shutdown();
  });
  
  test('should initialize server successfully', () => {
    expect(server).toBeDefined();
    expect(server.getServer()).toBeDefined();
  });
  
  test('should have correct server metadata', () => {
    const mcpServer = server.getServer();
    expect(mcpServer.serverInfo.name).toBe('qbomcp-ts');
    expect(mcpServer.serverInfo.version).toBe('2.0.0');
  });
  
  test('should support tools capability', () => {
    const mcpServer = server.getServer();
    expect(mcpServer.serverInfo.capabilities?.tools).toBeDefined();
  });
  
  test('should support resources capability', () => {
    const mcpServer = server.getServer();
    expect(mcpServer.serverInfo.capabilities?.resources).toBeDefined();
  });
});