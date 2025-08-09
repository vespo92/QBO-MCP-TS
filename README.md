# QBOMCP-TS: TypeScript QuickBooks Online MCP Server

[![CI](https://github.com/vespo92/QBO-MCP-TS/actions/workflows/ci.yml/badge.svg)](https://github.com/vespo92/QBO-MCP-TS/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/qbo-mcp-ts.svg)](https://www.npmjs.com/package/qbo-mcp-ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-2.0-green.svg)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/vespo92/QBO-MCP-TS/graphs/commit-activity)

## 🚀 Overview

QBOMCP-TS is a production-ready TypeScript reimplementation of the QuickBooks
Online MCP Server, featuring enhanced architecture, dual transport support
(STDIO & SSE), comprehensive error handling, and enterprise-grade features like
caching, retry logic, and rate limiting.

## ⚡ Quick Start with npx

**No installation required!** Use directly with npx:

```bash
# Run with environment variables
QBO_CLIENT_ID="your_id" QBO_CLIENT_SECRET="your_secret" \
QBO_COMPANY_ID="your_company" QBO_REFRESH_TOKEN="your_token" \
npx qbo-mcp-ts

# Or use a .env file
npx qbo-mcp-ts --env-file /path/to/.env

# Start SSE server for web applications
npx qbo-mcp-ts --transport sse --port 3000
```

## 🎁 Why Use npx?

- **Zero Installation**: Run directly without installing dependencies
- **Always Latest**: Automatically uses the latest published version
- **No Global Pollution**: Doesn't clutter your global npm packages
- **Quick Testing**: Perfect for trying out the server before committing
- **CI/CD Friendly**: Ideal for automated workflows and GitHub Actions

## ✨ Key Improvements Over Original QBOMCP

### Architecture Enhancements

- **Full TypeScript** with strict type safety and comprehensive type definitions
- **Modular architecture** with clean separation of concerns
- **Dual transport support**: STDIO for local development, SSE for production
- **Service-oriented design** with dedicated services for caching, queuing, and
  API operations

### Performance & Reliability

- **Intelligent caching** with LRU eviction and persistent storage
- **Queue management** for API rate limiting and concurrent request handling
- **Exponential backoff retry logic** for transient failures
- **Connection pooling** and token refresh management
- **Comprehensive error handling** with specific error types and recovery
  strategies

### Developer Experience

- **Natural language date parsing** for all date inputs
- **Comprehensive logging** with request tracing and performance metrics
- **Health check endpoints** for monitoring
- **Detailed API documentation** with TypeScript types
- **Jest test framework** with unit and integration tests
- **ESLint and Prettier** for code quality

### Production Features

- **SSE transport** for web-based deployments
- **CORS configuration** for cross-origin requests
- **Rate limiting** to prevent abuse
- **Graceful shutdown** handling
- **Docker support** (coming soon)
- **Kubernetes ready** with health checks

## 📋 Prerequisites

- Node.js 18+ (for native fetch support)
- QuickBooks Online account (or
  [sandbox account](https://developer.intuit.com/app/developer/sandbox))
- [Intuit Developer account](https://developer.intuit.com)
- OAuth2 credentials from Intuit

## 🔧 Installation Options

### Option 1: Use Directly with npx (Recommended)

No installation needed! The package is available on npm:

```bash
# Create a .env file with your credentials
cat > .env << EOF
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_COMPANY_ID=your_company_id
QBO_REFRESH_TOKEN=your_refresh_token
EOF

# Run the server
npx qbo-mcp-ts --env-file .env
```

### Option 2: Global Installation

```bash
# Install globally
npm install -g qbo-mcp-ts

# Run from anywhere
qbo-mcp-ts --env-file /path/to/.env
```

### Option 3: Clone Repository (For Development)

```bash
git clone https://github.com/vespo92/QBO-MCP-TS.git
cd QBOMCP-TS
npm install
npm run build
```

## 🚀 Usage

### Claude Desktop Configuration

Add to your Claude Desktop config:

#### Using npx (Simplest - No Installation Required)

```json
{
  "mcpServers": {
    "quickbooks": {
      "command": "npx",
      "args": ["qbo-mcp-ts"],
      "env": {
        "QBO_CLIENT_ID": "your_client_id",
        "QBO_CLIENT_SECRET": "your_client_secret",
        "QBO_COMPANY_ID": "your_company_id",
        "QBO_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

#### Using Global Installation

```json
{
  "mcpServers": {
    "quickbooks": {
      "command": "qbo-mcp-ts",
      "args": [],
      "env": {
        "QBO_CLIENT_ID": "your_client_id",
        "QBO_CLIENT_SECRET": "your_client_secret",
        "QBO_COMPANY_ID": "your_company_id",
        "QBO_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

### Command Line Usage

#### STDIO Mode (Default - for Claude Desktop)

```bash
# Using npx
npx qbo-mcp-ts

# With environment file
npx qbo-mcp-ts --env-file .env

# With debug logging
npx qbo-mcp-ts --debug
```

#### SSE Mode (for Web Applications)

```bash
# Start SSE server on default port 3000
npx qbo-mcp-ts --transport sse

# Custom port
npx qbo-mcp-ts --transport sse --port 8080

# With environment file
npx qbo-mcp-ts --transport sse --env-file .env --port 3000
```

**SSE Endpoints:**

- SSE Stream: `http://localhost:3000/sse`
- Health Check: `http://localhost:3000/health`
- Server Info: `http://localhost:3000/info`
- Available Tools: `http://localhost:3000/tools`

### Available Command Arguments

```bash
npx qbo-mcp-ts [options]

Options:
  --transport <type>    Transport type: 'stdio' (default) or 'sse'
  --port <number>       Port for SSE server (default: 3000)
  --env-file <path>     Path to .env file with credentials
  --debug              Enable debug logging
  --help               Show help information
  --version            Show version number
```

## 🛠️ Available Tools

### Invoice Management

- `get_invoices` - Query invoices with natural language filters
- `create_invoice` - Create new invoices
- `send_invoice` - Email invoices to customers
- `get_invoice_aging` - Generate AR aging reports

### Expense Tracking (Coming Soon)

- `create_expense` - Record business expenses
- `get_expenses` - Query expense transactions

### Financial Reports (Coming Soon)

- `profit_and_loss` - Generate P&L statements
- `balance_sheet` - Generate balance sheets
- `cash_flow` - Cash flow analysis

### Customer Management (Coming Soon)

- `get_customers` - List and search customers
- `create_customer` - Add new customers
- `customer_balance` - Check customer balances

### System Tools

- `help` - Get help on using the server
- `get_api_status` - Check API connection and limits

## 💡 Example Usage

### Quick Examples with Natural Language

```javascript
// Get unpaid invoices from last month
{
  "tool": "get_invoices",
  "arguments": {
    "status": "unpaid",
    "dateFrom": "last month"  // Understands "last month", "30 days ago", "Q1 2024", etc.
  }
}

// Create and send invoice
{
  "tool": "create_invoice",
  "arguments": {
    "customerName": "ABC Company",
    "items": [
      {
        "description": "Consulting Services",
        "amount": 5000
      }
    ],
    "dueDate": "30 days",  // Understands "30 days", "net 30", "end of month"
    "emailToCustomer": true
  }
}
```

## 🏗️ Architecture

```
QBOMCP-TS/
├── src/
│   ├── api/           # QuickBooks API client with retry logic
│   ├── services/      # Business logic services
│   │   ├── cache.ts   # LRU cache with persistence
│   │   ├── queue.ts   # Rate limiting and queue management
│   │   └── invoice.ts # Invoice operations
│   ├── transports/    # MCP transport implementations
│   │   ├── stdio.ts   # STDIO for local development
│   │   └── sse.ts     # SSE for production
│   ├── utils/         # Utility functions
│   │   ├── config.ts  # Configuration management
│   │   ├── logger.ts  # Winston logger
│   │   └── date-parser.ts # Natural language dates
│   ├── types/         # TypeScript type definitions
│   ├── server.ts      # Main MCP server
│   └── index.ts       # Entry point
├── tests/            # Jest test suites
├── logs/            # Application logs
├── cache/           # Persistent cache storage
└── dist/            # Compiled JavaScript
```

## 🔒 Security Features

- **OAuth2 token management** with automatic refresh
- **Input validation** using Zod schemas
- **Rate limiting** to prevent API abuse
- **CORS configuration** for secure cross-origin requests
- **Environment-based configuration** (no hardcoded secrets)
- **Comprehensive error handling** without exposing sensitive data

## 📊 Performance Optimizations

- **Intelligent caching** reduces API calls by up to 80%
- **Request queuing** prevents rate limit errors
- **Connection pooling** for efficient resource usage
- **Lazy loading** of services and resources
- **Optimized date parsing** with memoization
- **Batch operations** support (coming soon)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📝 Development

### Available Scripts

```bash
# Start in development mode with hot reload
npm run dev

# Build the project
npm run build

# Run tests
npm run test
npm run test:watch    # Watch mode
npm run test:coverage # With coverage

# Code Quality
npm run typecheck     # Check TypeScript types
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix ESLint issues
npm run lint:strict   # Fail on warnings
npm run format        # Format with Prettier
npm run format:check  # Check formatting

# Combined checks
npm run check:all     # Run all checks (type, lint, format)
npm run fix:all       # Fix all auto-fixable issues
```

### Code Quality & Linting

This project uses a comprehensive ESLint setup optimized for TypeScript MCP
servers:

#### ESLint Configuration

- **TypeScript-aware rules** for type safety and best practices
- **Import ordering** and organization rules
- **Promise handling** validation
- **Security scanning** for common vulnerabilities
- **Node.js specific** rules and optimizations
- **Prettier integration** for consistent formatting

#### Key Linting Features

- Warns on `any` types to encourage type safety
- Enforces proper async/await patterns
- Validates error handling practices
- Checks for security issues (eval, non-literal fs operations)
- Maintains import organization and naming conventions
- Enforces code complexity limits (configurable warnings)

#### Pre-commit Hooks

When the project is added to a Git repository, pre-commit hooks will
automatically:

- Run ESLint on staged TypeScript files
- Format code with Prettier
- Prevent commits with linting errors

To set up hooks after initializing Git:

```bash
npx husky init
```

### Code Style Guidelines

- Use functional programming patterns where appropriate
- Prefer `const` over `let`, never use `var`
- Use template literals for string concatenation
- Implement proper error types and handling
- Add JSDoc comments for public APIs
- Keep functions focused and under 150 lines
- Maximum file length of 500 lines (warning)

## 🐳 Docker Support (Coming Soon)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js", "--transport", "sse"]
```

## 📚 API Documentation

Full TypeScript definitions are available in `src/types/index.ts`. The server
provides comprehensive type safety for all operations.

## 🤝 Contributing

Contributions are welcome! Please see the original CONTRIBUTING.md for
guidelines.

## 📄 License

MIT License - See LICENSE file for details.

## 🔍 Comparison with Original QBOMCP

| Feature          | QBOMCP (Python) | QBOMCP-TS (TypeScript)   |
| ---------------- | --------------- | ------------------------ |
| Language         | Python 3.8+     | TypeScript 5.3+          |
| Transport        | STDIO only      | STDIO + SSE              |
| Type Safety      | Runtime checks  | Compile-time + Runtime   |
| Caching          | None            | LRU with persistence     |
| Retry Logic      | Basic           | Exponential backoff      |
| Rate Limiting    | None            | Queue-based management   |
| Logging          | Basic           | Structured with levels   |
| Error Handling   | Basic           | Comprehensive with types |
| Testing          | None            | Jest with coverage       |
| Production Ready | Development     | Production-grade         |
| Performance      | Good            | Optimized with caching   |
| Monitoring       | None            | Health checks + Metrics  |

## 🎯 Getting Started Checklist

1. ☑️ Get QuickBooks OAuth2 credentials from
   [Intuit Developer](https://developer.intuit.com)
2. ☑️ Create a `.env` file with your credentials
3. ☑️ Run `npx qbo-mcp-ts --env-file .env` to test
4. ☑️ Add to Claude Desktop config (see above)
5. ☑️ Start using natural language to manage invoices!

## 🚧 Roadmap

- [x] Core invoice management
- [x] Dual transport support
- [x] Caching and queue management
- [x] Comprehensive error handling
- [x] npm package with npx support
- [ ] Complete expense tracking
- [ ] Full financial reports
- [ ] Customer management
- [ ] Batch operations
- [ ] WebSocket transport
- [ ] Docker deployment
- [ ] Kubernetes manifests
- [ ] OAuth2 flow UI
- [ ] Multi-company support
- [ ] Webhook support

## 💡 Pro Tips

1. **Quick Test**: Run `npx qbo-mcp-ts --help` to verify installation
2. **Natural Language Dates**: Use phrases like "last month", "Q1 2024", "year
   to date"
3. **Caching**: Results are cached for 5 minutes by default (configurable)
4. **Rate Limits**: The server automatically manages QuickBooks API rate limits
5. **Debug Mode**: Use `npx qbo-mcp-ts --debug` for verbose logging
6. **Health Monitoring**: Check `/health` endpoint for server status (SSE mode)

## 🆘 Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure your refresh token is valid and not expired
2. **Rate Limiting**: The server handles this automatically, but you can adjust
   `API_RATE_LIMIT_PER_MINUTE`
3. **Cache Issues**: Clear cache directory if experiencing stale data
4. **Connection Issues**: Check network and QuickBooks API status

### Debug Mode

```bash
# Enable debug logging with npx
npx qbo-mcp-ts --debug

# Or with environment variable
LOG_LEVEL=debug npx qbo-mcp-ts

# Debug SSE mode
npx qbo-mcp-ts --transport sse --debug --port 3000
```

## 📞 Support

For issues specific to QBOMCP-TS, please open an issue in this repository. For
QuickBooks API issues, refer to
[Intuit Developer Support](https://developer.intuit.com/support).

---

**Built with ❤️ by the VCPU Infrastructure Team**
