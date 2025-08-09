/**
 * STDIO Transport implementation for MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '../utils/logger';

/**
 * STDIO Transport for local development and CLI usage
 */
export class StdioTransport {
  private server: Server;
  private transport?: StdioServerTransport;

  constructor(server: Server) {
    this.server = server;
    logger.info('Initializing STDIO transport');
  }

  /**
   * Start the STDIO transport
   */
  public async start(): Promise<void> {
    try {
      logger.info('Starting STDIO transport');

      // Create STDIO transport
      this.transport = new StdioServerTransport();

      // Connect server to transport
      await this.server.connect(this.transport);

      logger.info('STDIO transport started successfully');

      // Handle process termination
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
    } catch (error) {
      logger.error('Failed to start STDIO transport', error);
      throw error;
    }
  }

  /**
   * Shutdown the transport
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down STDIO transport');

    try {
      await this.server.close();

      if (this.transport) {
        // Close stdio streams properly
        process.stdin.destroy();
        process.stdout.end();
        process.stderr.end();
      }

      logger.info('STDIO transport shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during STDIO transport shutdown', error);
      process.exit(1);
    }
  }
}
