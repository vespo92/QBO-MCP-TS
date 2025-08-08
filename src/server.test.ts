/**
 * Basic tests for QBOMCP-TS Server
 */

import { QBOMCPServer } from './server';

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

// Mock the QuickBooks API client
jest.mock('./api/client', () => ({
  QuickBooksClient: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    refreshAccessToken: jest.fn().mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }),
    makeRequest: jest.fn().mockResolvedValue({ data: {} }),
    createInvoice: jest.fn().mockResolvedValue({ Id: '123' }),
    getInvoice: jest.fn().mockResolvedValue({ Id: '123', TotalAmt: 100 }),
  })),
}));

// Mock the logger to avoid console output during tests
jest.mock('./utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('QBOMCPServer', () => {
  let server: QBOMCPServer;

  beforeEach(() => {
    server = new QBOMCPServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should create a server instance', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(QBOMCPServer);
    });

    it('should initialize with correct server info', async () => {
      await server.initialize();
      const serverInfo = server.getServerInfo();
      expect(serverInfo.name).toBe('qbomcp-ts');
      expect(serverInfo.version).toBe('2.0.0');
    });

    it('should have capabilities for tools and resources', async () => {
      await server.initialize();
      const serverInfo = server.getServerInfo();
      expect(serverInfo.capabilities?.tools).toBeDefined();
      expect(serverInfo.capabilities?.resources).toBeDefined();
    });
  });

  describe('Tool Registration', () => {
    it('should register invoice tools', async () => {
      await server.initialize();
      const tools = server.getTools();
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create_invoice');
      expect(toolNames).toContain('get_invoice');
      expect(toolNames).toContain('list_invoices');
      expect(toolNames).toContain('update_invoice');
      expect(toolNames).toContain('delete_invoice');
      expect(toolNames).toContain('send_invoice');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const mockError = new Error('Initialization failed');
      jest.spyOn(server as any, 'setupTools').mockRejectedValueOnce(mockError);
      
      await expect(server.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Transport Selection', () => {
    it('should select STDIO transport by default', () => {
      const transport = server.getTransport();
      expect(transport).toBe('stdio');
    });
  });
});