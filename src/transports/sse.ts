/**
 * SSE (Server-Sent Events) Transport implementation for MCP
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { TransportConfig } from '../types';
import { logger } from '../utils/logger';
import * as http from 'http';

/**
 * SSE Transport for production deployments
 */
export class SSETransport {
  private server: Server;
  private app: Express;
  private httpServer?: http.Server;
  // private transport?: SSEServerTransport;
  private config: TransportConfig;
  private connections: Set<Response> = new Set();

  constructor(server: Server, config: TransportConfig) {
    this.server = server;
    this.config = config;
    this.app = express();

    logger.info('Initializing SSE transport', {
      port: config.port,
      host: config.host,
    });

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // JSON body parser
    this.app.use(express.json({ limit: '10mb' }));

    // CORS configuration
    if (this.config.cors) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const origin = Array.isArray(this.config.cors!.origin)
          ? this.config.cors!.origin.join(',')
          : this.config.cors!.origin;

        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (this.config.cors!.credentials) {
          res.header('Access-Control-Allow-Credentials', 'true');
        }

        if (req.method === 'OPTIONS') {
          res.sendStatus(204);
        } else {
          next();
        }
      });
    }

    // Rate limiting
    if (this.config.rateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs,
        max: this.config.rateLimit.max,
        message: 'Too many requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
      });

      this.app.use('/sse', limiter);
    }

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.path}`, {
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
      });

      next();
    });

    // Error handling
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      logger.error('Express error', err);

      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    if (this.config.healthCheckPath) {
      this.app.get(this.config.healthCheckPath, (_req: Request, res: Response) => {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          connections: this.connections.size,
        });
      });
    }

    // SSE endpoint
    this.app.get('/sse', async (_req: Request, res: Response) => {
      logger.info('SSE client connected', {
        ip: _req.ip,
        userAgent: _req.get('user-agent'),
      });

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      });

      // Add to connections set
      this.connections.add(res);

      // Send initial ping
      res.write(':ping\n\n');

      // Set up keep-alive
      const keepAlive = setInterval(() => {
        res.write(':ping\n\n');
      }, 30000); // Every 30 seconds

      // Handle client disconnect
      _req.on('close', () => {
        clearInterval(keepAlive);
        this.connections.delete(res);
        logger.info('SSE client disconnected');
      });

      // Create SSE transport for this connection
      const transport = new SSEServerTransport('/message', res);
      await this.server.connect(transport);
    });

    // Message endpoint for SSE
    this.app.post('/message', async (_req: Request, res: Response) => {
      try {
        // Forward message to MCP server
        const response = await this.handleMessage(_req.body);
        res.json(response);
      } catch (error) {
        logger.error('Failed to handle message', error);
        res.status(500).json({
          error: 'Failed to process message',
        });
      }
    });

    // Server info endpoint
    this.app.get('/info', (_req: Request, res: Response) => {
      res.json({
        name: 'QBOMCP-TS',
        version: '2.0.0',
        transport: 'sse',
        features: {
          accounting: true,
          naturalLanguage: true,
          caching: true,
          retryLogic: true,
        },
      });
    });

    // List available tools
    this.app.get('/tools', async (_req: Request, res: Response) => {
      try {
        // TODO: Implement listTools method
        const tools: any[] = [];
        res.json(tools);
      } catch (error) {
        logger.error('Failed to list tools', error);
        res.status(500).json({
          error: 'Failed to list tools',
        });
      }
    });

    // List available resources
    this.app.get('/resources', async (_req: Request, res: Response) => {
      try {
        // TODO: Implement listResources method
        const resources: any[] = [];
        res.json(resources);
      } catch (error) {
        logger.error('Failed to list resources', error);
        res.status(500).json({
          error: 'Failed to list resources',
        });
      }
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        path: _req.path,
      });
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(_message: any): Promise<any> {
    // This will be handled by the MCP server through the SSE transport
    return { success: true };
  }

  /**
   * Start the SSE transport
   */
  public async start(): Promise<void> {
    try {
      const port = this.config.port || 3000;
      const host = this.config.host || '0.0.0.0';

      logger.info(`Starting SSE transport on ${host}:${port}`);

      // Create HTTP server
      this.httpServer = this.app.listen(port, host, () => {
        logger.info(`SSE transport listening on http://${host}:${port}`);
        logger.info(`Health check: http://${host}:${port}${this.config.healthCheckPath}`);
        logger.info(`SSE endpoint: http://${host}:${port}/sse`);
      });

      // Handle server errors
      this.httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use`);
        } else {
          logger.error('HTTP server error', error);
        }
        process.exit(1);
      });

      // Handle process termination
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
    } catch (error) {
      logger.error('Failed to start SSE transport', error);
      throw error;
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(event: string, data: any): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    this.connections.forEach((res) => {
      res.write(message);
    });
  }

  /**
   * Get connected clients count
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Shutdown the transport
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down SSE transport');

    try {
      // Close all SSE connections
      this.connections.forEach((res) => {
        res.write('event: shutdown\ndata: {}\n\n');
        res.end();
      });
      this.connections.clear();

      // Close HTTP server
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Close MCP server
      await this.server.close();

      logger.info('SSE transport shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during SSE transport shutdown', error);
      process.exit(1);
    }
  }
}
