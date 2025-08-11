#!/usr/bin/env node
/**
 * QBOMCP-TS - TypeScript QuickBooks Online MCP Server
 * Main entry point with dual transport support
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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
  .version('2.1.0')
  .parseSync();

/**
 * Main application entry point
 */
async function main() {
  // Import dependencies only when actually running
  const { QBOMCPServer } = await import('./server');
  const { StdioTransport } = await import('./transports/stdio');
  // SSETransport temporarily disabled - will be reimplemented without Express
  // const { SSETransport } = await import('./transports/sse');
  const { config } = await import('./utils/config');
  const { logger } = await import('./utils/logger');

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
      // SSE Transport temporarily disabled - Express dependency removed
      console.error(
        '\n❌ SSE transport is temporarily disabled while migrating away from Express.',
      );
      console.error('Please use STDIO transport instead: --transport stdio\n');
      process.exit(1);
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
  // Check if help is requested to avoid loading config
  const helpRequested = process.argv.includes('--help') || process.argv.includes('-h');

  if (!helpRequested) {
    main().catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }
}

// Export for testing
export { main };
