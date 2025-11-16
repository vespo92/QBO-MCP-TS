# QuickBooks Online MCP Server

A production-ready, modular Model Context Protocol (MCP) server for QuickBooks Online integration. Built with TypeScript, designed for accountants, with comprehensive automation features and real-time capabilities.

## 🚀 Features

### Core Capabilities
- ✅ **Modular Architecture** - Extensible tool and service system
- ✅ **Full CRUD Operations** - Invoices, expenses, customers, payments
- ✅ **Financial Reporting** - P&L, Balance Sheet, Cash Flow, AR/AP Aging
- ✅ **Real-Time Updates** - SSE transport and QuickBooks webhooks
- ✅ **Workflow Automation** - Rule-based automation engine
- ✅ **Multi-Company Support** - Manage multiple QBO companies
- ✅ **Production-Ready** - Comprehensive error handling, caching, rate limiting

### Automation Features
- 🔄 **Recurring Invoices** - Automated invoice generation (daily → yearly)
- 📧 **Payment Reminders** - Smart follow-up sequences (4-tier system)
- 🤖 **Workflow Engine** - Conditional rules and automated actions
- 📊 **Scheduled Reports** - Automated report generation and distribution

### Developer Experience
- 🧪 **Testing Infrastructure** - Jest with comprehensive test utilities
- 📝 **TypeScript Strict Mode** - Complete type safety
- 🔍 **Extensive Logging** - Structured logging with context
- 📚 **Comprehensive Documentation** - Examples and guides

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/vespo92/QBO-MCP-TS.git
cd QBO-MCP-TS

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your QuickBooks credentials

# Build
npm run build

# Run
npm start
```

## 🔧 Configuration

### Environment Variables

```bash
# QuickBooks OAuth
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
COMPANY_ID=your_company_id
REFRESH_TOKEN=your_refresh_token

# Environment
QBO_ENVIRONMENT=sandbox  # or 'production'
NODE_ENV=development

# SSE Transport (optional)
SSE_PORT=3100
SSE_HOST=localhost

# Webhook Receiver (optional)
WEBHOOK_PORT=3200
WEBHOOK_VERIFIER_TOKEN=your_webhook_token

# Cache Settings
CACHE_TTL=300
CACHE_MAX_SIZE=100
ENABLE_CACHE=true

# API Settings
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
TIMEOUT=30000
RATE_LIMIT=60

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 🛠️ Available Tools

### Invoice Management
- `get_invoices` - Query invoices with filtering
- `create_invoice` - Create invoices with line items
- `send_invoice` - Email invoices to customers

### Expense Management
- `get_expenses` - Query expenses with filtering
- `create_expense` - Create expenses with auto vendor/account lookup

### Customer Management
- `get_customers` - Query and search customers
- `get_customer_balance` - Get balance details with overdue tracking

### Financial Reporting
- `get_profit_loss` - Profit & Loss statements
- `get_balance_sheet` - Balance Sheet reports
- `get_cash_flow` - Cash Flow statements
- `get_ar_aging` - Accounts Receivable aging
- `get_ap_aging` - Accounts Payable aging

### Utilities
- `get_api_status` - Server health and metrics

## 📖 Usage Examples

### Create an Invoice
```typescript
{
  "tool": "create_invoice",
  "params": {
    "customerName": "Acme Corp",
    "items": [
      {
        "description": "Web Design Services",
        "amount": 2500,
        "quantity": 1
      },
      {
        "description": "Hosting (1 year)",
        "amount": 600,
        "quantity": 1
      }
    ],
    "dueDate": "net 30",
    "emailToCustomer": true
  }
}
```

### Query Overdue Invoices
```typescript
{
  "tool": "get_invoices",
  "params": {
    "status": "overdue",
    "dateFrom": "this year",
    "dateTo": "today"
  }
}
```

### Generate Profit & Loss Report
```typescript
{
  "tool": "get_profit_loss",
  "params": {
    "startDate": "this quarter",
    "endDate": "today",
    "accountingMethod": "Accrual",
    "summarizeBy": "Month"
  }
}
```

## 🔄 Automation Setup

### Recurring Invoices

```typescript
import { automationService } from './services/automation.service';

const scheduleId = await automationService.createRecurringInvoice({
  customerId: '123',
  lineItems: [
    { description: 'Monthly Retainer', amount: 5000 }
  ],
  frequency: 'monthly',
  startDate: new Date('2025-01-01'),
  dueInDays: 30,
  autoSend: true
});
```

### Workflow Rules

```typescript
import { workflowService } from './services/workflow.service';

workflowService.addRule({
  id: 'auto-approve-small-expenses',
  name: 'Auto-approve small expenses',
  enabled: true,
  trigger: 'expense:submitted',
  conditions: [
    { field: 'TotalAmt', operator: 'lt', value: 100 },
    { field: 'category', operator: 'in', value: ['Office Supplies'] }
  ],
  actions: [
    { type: 'approve', notify: 'submitter' },
    { type: 'broadcast_event', eventType: 'expense:auto_approved' }
  ]
});
```

## 🌐 Real-Time Features

### Server-Sent Events (SSE)

Start the SSE server for real-time client updates:

```typescript
import { getSSETransport } from './transports/sse.transport';

const sse = getSSETransport();
await sse.start();

// Events automatically broadcast:
// - invoice:created, invoice:updated, invoice:paid
// - payment:received
// - expense:created
// - customer:created
// - report:ready
// - webhook:received
```

### QuickBooks Webhooks

Receive real-time notifications from QuickBooks:

```typescript
import { getWebhookReceiver } from './webhooks/receiver';

const webhooks = getWebhookReceiver({
  port: 3200,
  verifierToken: process.env.WEBHOOK_VERIFIER_TOKEN
});

// Register handlers
webhooks.on('invoice:create', async (data) => {
  console.log('Invoice created:', data.id);
  // Cache invalidation, notifications, etc.
});

await webhooks.start();
```

## 🏢 Multi-Company Support

Manage multiple QuickBooks companies:

```typescript
import { multiCompanyService } from './services/multi-company.service';

// Add companies
await multiCompanyService.addCompany('company1', {
  name: 'Acme Corp',
  config: { /* QBO config */ }
});

await multiCompanyService.addCompany('company2', {
  name: 'XYZ Inc',
  config: { /* QBO config */ }
});

// Switch between companies
multiCompanyService.setActiveCompany('company1');
const invoices = await invoiceService.getInvoices();

multiCompanyService.setActiveCompany('company2');
const expenses = await expenseService.getExpenses();
```

## 💾 Redis Cache (Optional)

Enable Redis for distributed caching:

```typescript
import { createRedisCacheService } from './services/cache-redis.service';

const cache = await createRedisCacheService({
  host: 'localhost',
  port: 6379,
  keyPrefix: 'qbo:',
  enableFallback: true  // Falls back to in-memory if Redis unavailable
});

// Automatically used by all services
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

```typescript
import { createMockInvoice, MockQBOApiClient } from './test-utils';

describe('InvoiceService', () => {
  it('should create invoice', async () => {
    const mockClient = new MockQBOApiClient();
    const service = new InvoiceService(mockClient);

    const invoice = await service.createInvoice({
      customerName: 'Test Customer',
      lineItems: [{ description: 'Test', amount: 100 }]
    });

    expect(invoice.Id).toBeDefined();
  });
});
```

## 📊 Architecture

### Service Layer
- **InvoiceService** - Invoice operations and AR aging
- **ExpenseService** - Expense management with vendor lookup
- **ReportService** - 15+ financial reports with PDF export
- **CustomerService** - Customer management and balance tracking
- **PaymentService** - Payment recording and application
- **AutomationService** - Recurring invoices and payment reminders
- **WorkflowService** - Rule-based automation engine

### Tool System
- **BaseTool** - Abstract base with automatic validation
- **ToolRegistry** - Auto-discovery and registration
- **Modular Structure** - Each tool is self-contained

### Transport Layer
- **SSE Transport** - Real-time server-to-client streaming
- **Webhook Receiver** - QuickBooks event notifications
- **STDIO Transport** - Standard MCP communication

## 🔒 Security

- ✅ OAuth 2.0 with automatic token refresh
- ✅ HMAC-SHA256 webhook signature verification
- ✅ Replay attack prevention
- ✅ Input validation with Zod schemas
- ✅ Sensitive data sanitization in logs
- ✅ Rate limiting and request queuing

## 📈 Performance

- ✅ Multi-tier caching (in-memory + optional Redis)
- ✅ Request queuing to prevent API throttling
- ✅ Exponential backoff retry logic
- ✅ Batch operations where possible
- ✅ Lazy service initialization

## 🐛 Error Handling

50+ predefined errors with actionable suggestions:

```typescript
{
  code: 'QBO_AUTH_001',
  message: 'Your QuickBooks session has expired',
  suggestion: 'Refreshing authentication automatically...',
  recoverable: true,
  severity: 'warning'
}
```

Automatic retry for recoverable errors:
- Token refresh failures
- Rate limit exceeded
- Network timeouts
- Transient errors

## 📚 Documentation

- **FEATURES.md** - Comprehensive feature documentation
- **ACCOUNTANT_NEEDS_RESEARCH.md** - Accountant requirements research
- **IMPLEMENTATION_PLAN.md** - Technical roadmap
- **API Examples** - See `examples/` directory

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- QuickBooks Online API documentation
- TypeScript and Node.js communities

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/vespo92/QBO-MCP-TS/issues)
- **Documentation**: See docs in repository
- **API Reference**: See FEATURES.md

---

**Made with ❤️ for accountants who want to automate their workflows**
