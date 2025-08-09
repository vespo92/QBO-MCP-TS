#!/usr/bin/env node
/**
 * QBOMCP-TS - TypeScript QuickBooks Online MCP Server
 * Main entry point with dual transport support
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { QBOMCPServer } from './server';
import { StdioTransport } from './transports/stdio';
import { SSETransport } from './transports/sse';
import { config } from './utils/config';
import { logger } from './utils/logger';

/**
 * Parse command line arguments
 */
const argv = yargs(hideBin(process.argv))
  .option('transport', {
    alias: 't',
    type: 'string',
    choices: ['stdio', 'sse'] as const,
    default: 'stdio',
    description: 'Transport type to use',
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    default: 3000,
    description: 'Port for SSE transport',
  })
  .option('host', {
    alias: 'h',
    type: 'string',
    default: '0.0.0.0',
    description: 'Host for SSE transport',
  })
  .option('debug', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: 'Enable debug logging',
  })
  .help()
  .alias('help', 'h')
  .parseSync();

/**
 * Main application entry point
 */
async function main() {
  try {
    // Log startup information
    logger.info('Starting QBOMCP-TS Server', {
      version: '2.0.0',
      transport: argv.transport,
      environment: config.getEnv(),
      features: config.getFeatureFlags(),
    });

    // Validate configuration
    try {
      const qboConfig = config.getQBOConfig();
      logger.info('QuickBooks configuration validated', {
        environment: qboConfig.environment,
        companyId: qboConfig.companyId,
      });
    } catch (error) {
      logger.error('Invalid QuickBooks configuration', error);
      console.error('\n❌ QuickBooks configuration error:');
      console.error('Please ensure the following environment variables are set:');
      console.error('  - QBO_CLIENT_ID');
      console.error('  - QBO_CLIENT_SECRET');
      console.error('  - QBO_COMPANY_ID');
      console.error('  - QBO_REFRESH_TOKEN');
      console.error('\nSee .env.example for more details.\n');
      process.exit(1);
    }

    // Create MCP server
    const mcpServer = new QBOMCPServer();
    const server = mcpServer.getServer();

    // Initialize transport based on selection
    if (argv.transport === 'sse') {
      // SSE Transport for production
      const transportConfig = {
        ...config.getTransportConfig(),
        type: 'sse' as const,
        port: argv.port,
        host: argv.host,
      };

      const transport = new SSETransport(server, transportConfig);
      await transport.start();

      console.log('\n✅ QBOMCP-TS Server started with SSE transport');
      console.log(`📡 Listening on http://${argv.host}:${argv.port}`);
      console.log(`🔗 SSE endpoint: http://${argv.host}:${argv.port}/sse`);
      console.log(`💚 Health check: http://${argv.host}:${argv.port}/health`);
      console.log('\nPress Ctrl+C to shutdown\n');
    } else {
      // STDIO Transport for local development
      const transport = new StdioTransport(server);
      await transport.start();

      // In STDIO mode, don't output to console as it interferes with the protocol
      logger.info('QBOMCP-TS Server started with STDIO transport');
    }

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('Unhandled rejection', reason as Error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    console.error('\n❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { main };
