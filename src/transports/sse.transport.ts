/**
 * Server-Sent Events (SSE) Transport
 *
 * Provides real-time streaming updates from server to MCP clients.
 * Uses native HTTP server for SSE connections.
 *
 * Features:
 * - Real-time event broadcasting
 * - Automatic client reconnection
 * - Event filtering per client
 * - Connection health monitoring
 */

import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from 'http';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

/**
 * SSE Event types
 */
export type SSEEvent =
  | { type: 'invoice:created'; data: any }
  | { type: 'invoice:updated'; data: any }
  | { type: 'invoice:paid'; data: any }
  | { type: 'payment:received'; data: any }
  | { type: 'expense:created'; data: any }
  | { type: 'customer:created'; data: any }
  | { type: 'report:ready'; data: any }
  | { type: 'sync:progress'; data: { current: number; total: number } }
  | { type: 'webhook:received'; data: any }
  | { type: 'error'; data: { code: string; message: string } }
  | { type: 'heartbeat'; data: { timestamp: string } };

/**
 * SSE Client representation
 */
export interface SSEClient {
  id: string;
  response: ServerResponse;
  connectedAt: Date;
  lastEventAt: Date;
  filters?: string[]; // Event types this client wants to receive
  metadata?: Record<string, any>;
}

/**
 * SSE Transport configuration
 */
export interface SSETransportConfig {
  port?: number;
  host?: string;
  path?: string;
  corsOrigin?: string;
  heartbeatInterval?: number; // milliseconds
  clientTimeout?: number; // milliseconds
}

/**
 * SSE Transport for real-time event streaming
 *
 * @example
 * ```typescript
 * const transport = new SSETransport({
 *   port: 3100,
 *   host: 'localhost'
 * });
 *
 * await transport.start();
 *
 * // Broadcast event to all clients
 * transport.broadcast({
 *   type: 'invoice:created',
 *   data: invoice
 * });
 *
 * // Send to specific client
 * transport.send(clientId, {
 *   type: 'report:ready',
 *   data: report
 * });
 * ```
 */
export class SSETransport {
  private server?: HttpServer;
  private clients: Map<string, SSEClient> = new Map();
  private config: Required<SSETransportConfig>;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(config: SSETransportConfig = {}) {
    const transportConfig = globalThis.config?.getTransportConfig?.() || {};

    this.config = {
      port: config.port || transportConfig.ssePort || 3100,
      host: config.host || transportConfig.sseHost || 'localhost',
      path: config.path || '/events',
      corsOrigin: config.corsOrigin || transportConfig.corsOrigin || '*',
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      clientTimeout: config.clientTimeout || 90000, // 90 seconds
    };
  }

  /**
   * Start the SSE server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error) => {
        logger.error('SSE server error', { error });
        reject(error);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        logger.info('SSE server started', {
          host: this.config.host,
          port: this.config.port,
          path: this.config.path,
        });

        // Start heartbeat timer
        this.startHeartbeat();

        resolve();
      });
    });
  }

  /**
   * Stop the SSE server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Stop heartbeat
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
      }

      // Close all client connections
      for (const [clientId, client] of this.clients) {
        this.closeClient(clientId, 'Server shutting down');
      }

      // Close server
      if (this.server) {
        this.server.close(() => {
          logger.info('SSE server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', this.config.corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Handle SSE endpoint
    if (req.method === 'GET' && req.url === this.config.path) {
      this.handleSSEConnection(req, res);
      return;
    }

    // Handle health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          clients: this.clients.size,
          uptime: process.uptime(),
        })
      );
      return;
    }

    // Not found
    res.writeHead(404);
    res.end('Not found');
  }

  /**
   * Handle new SSE connection
   */
  private handleSSEConnection(req: IncomingMessage, res: ServerResponse): void {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Generate client ID
    const clientId = this.generateClientId();

    // Create client
    const client: SSEClient = {
      id: clientId,
      response: res,
      connectedAt: new Date(),
      lastEventAt: new Date(),
    };

    // Add to clients map
    this.clients.set(clientId, client);

    logger.info('SSE client connected', {
      clientId,
      totalClients: this.clients.size,
    });

    // Send connection event
    this.sendToClient(client, {
      type: 'connected',
      data: {
        clientId,
        serverTime: new Date().toISOString(),
      },
    } as any);

    // Handle client disconnect
    res.on('close', () => {
      this.clients.delete(clientId);
      logger.info('SSE client disconnected', {
        clientId,
        totalClients: this.clients.size,
      });
    });

    // Handle errors
    res.on('error', (error) => {
      logger.error('SSE client error', { clientId, error });
      this.clients.delete(clientId);
    });
  }

  /**
   * Broadcast event to all connected clients
   *
   * @param event - Event to broadcast
   */
  broadcast(event: SSEEvent): void {
    logger.debug('Broadcasting SSE event', {
      type: event.type,
      clients: this.clients.size,
    });

    for (const client of this.clients.values()) {
      // Check if client has filters
      if (client.filters && client.filters.length > 0) {
        // Only send if event type matches filter
        if (!client.filters.includes(event.type)) {
          continue;
        }
      }

      this.sendToClient(client, event);
    }
  }

  /**
   * Send event to specific client
   *
   * @param clientId - Client ID
   * @param event - Event to send
   */
  send(clientId: string, event: SSEEvent): void {
    const client = this.clients.get(clientId);

    if (!client) {
      logger.warn('Attempted to send to non-existent client', { clientId });
      return;
    }

    this.sendToClient(client, event);
  }

  /**
   * Send event to client
   *
   * @param client - Client to send to
   * @param event - Event to send
   */
  private sendToClient(client: SSEClient, event: SSEEvent): void {
    try {
      const data = JSON.stringify(event.data);
      const message = `event: ${event.type}\ndata: ${data}\n\n`;

      client.response.write(message);
      client.lastEventAt = new Date();
    } catch (error) {
      logger.error('Failed to send event to client', {
        clientId: client.id,
        error,
      });

      // Remove client on error
      this.clients.delete(client.id);
    }
  }

  /**
   * Close a client connection
   *
   * @param clientId - Client ID
   * @param reason - Reason for closing
   */
  private closeClient(clientId: string, reason: string): void {
    const client = this.clients.get(clientId);

    if (!client) {
      return;
    }

    // Send close event
    this.sendToClient(client, {
      type: 'closing',
      data: { reason },
    } as any);

    // End response
    client.response.end();

    // Remove from clients
    this.clients.delete(clientId);

    logger.info('Closed SSE client', { clientId, reason });
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();

      // Send heartbeat to all clients
      for (const [clientId, client] of this.clients) {
        // Check if client has timed out
        const timeSinceLastEvent = now.getTime() - client.lastEventAt.getTime();

        if (timeSinceLastEvent > this.config.clientTimeout) {
          this.closeClient(clientId, 'Client timeout');
          continue;
        }

        // Send heartbeat
        this.sendToClient(client, {
          type: 'heartbeat',
          data: {
            timestamp: now.toISOString(),
          },
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get client information
   */
  getClients(): Array<{ id: string; connectedAt: Date; lastEventAt: Date }> {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      connectedAt: client.connectedAt,
      lastEventAt: client.lastEventAt,
    }));
  }
}

/**
 * Singleton instance
 */
let sseTransportInstance: SSETransport | null = null;

export function getSSETransport(): SSETransport {
  if (!sseTransportInstance) {
    sseTransportInstance = new SSETransport();
  }
  return sseTransportInstance;
}
