## QuickBooks MCP - Feature Overview

This document provides a comprehensive overview of all features implemented in the QuickBooks MCP TypeScript server.

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Service Layers](#service-layers)
3. [Modular Tools](#modular-tools)
4. [Real-Time Features](#real-time-features)
5. [Automation](#automation)
6. [Error Handling](#error-handling)
7. [Security & Compliance](#security--compliance)

---

## Core Architecture

### Modular Tool System

All tools now inherit from `BaseTool`, providing:
- ✅ Automatic parameter validation with Zod
- ✅ Standardized error handling with user-friendly messages
- ✅ Request tracking and logging
- ✅ Execution metrics
- ✅ Consistent response formatting

**Example:**
```typescript
class GetInvoicesTool extends BaseTool<GetInvoicesParams, QBOInvoice[]> {
  metadata = {
    name: 'get_invoices',
    description: 'Query invoices from QuickBooks',
    category: 'invoice'
  };

  schema = GetInvoicesSchema;

  async executeImpl(params: GetInvoicesParams): Promise<QBOInvoice[]> {
    return await invoiceService.getInvoices(params);
  }
}
```

### Tool Registry

Auto-discovery and registration system:
- 🔍 Automatically finds tools in `/src/tools/`
- 📝 Validates tool definitions
- 🎯 Category-based organization
- 🔌 Easy enable/disable functionality

---

## Service Layers

### Invoice Service (`src/services/invoice.service.ts`)
Handles all invoice operations:
- Query invoices with comprehensive filtering
- Create invoices with line items
- Send invoices via email
- Update existing invoices
- Get invoice aging reports

**Features:**
- Natural language date parsing ("last week", "net 30")
- Customer lookup by name
- Automatic caching (5 min TTL)
- Queue-based rate limiting

### Expense Service (`src/services/expense.service.ts`)
Manages expenses and purchases:
- Query expenses with filters
- Create expenses with vendor/account lookup
- Categorize expenses
- Attach receipts
- Vendor management

### Report Service (`src/services/report.service.ts`)
Financial reporting capabilities:
- Profit & Loss statements
- Balance Sheets
- Cash Flow reports
- AR/AP Aging reports
- Transaction lists
- Custom report generation
- PDF export

**Available Reports:**
- ProfitAndLoss / ProfitAndLossDetail
- BalanceSheet
- CashFlow
- AgedReceivables / AgedPayables
- TransactionList
- GeneralLedger
- TrialBalance
- CustomerBalance / CustomerIncome
- VendorBalance / VendorExpenses
- SalesByCustomer / SalesByProduct

### Customer Service (`src/services/customer.service.ts`)
Customer relationship management:
- Query customers with search
- Create/update customers
- Get customer balances
- Track overdue amounts
- Payment history
- Fuzzy name search

### Payment Service (`src/services/payment.service.ts`)
Payment processing:
- Record customer payments
- Apply payments to invoices
- Payment method management
- Query payment history
- Void payments
- Automatic bank account deposits

### Automation Service (`src/services/automation.service.ts`)
Workflow automation:
- Recurring invoice schedules
- Automated payment reminders
- Scheduled report generation
- Customizable reminder sequences

---

## Modular Tools

### Invoice Tools

#### `get_invoices`
Query invoices with filtering:
```typescript
{
  status?: 'unpaid' | 'paid' | 'overdue' | 'all',
  customerName?: string,
  dateFrom?: string, // Natural language supported
  dateTo?: string,
  minAmount?: number,
  maxAmount?: number,
  limit?: number
}
```

#### `create_invoice`
Create new invoices:
```typescript
{
  customerName: string,
  items: [
    {
      description: string,
      amount: number,
      quantity?: number,
      unitPrice?: number
    }
  ],
  dueDate?: string, // "net 30", "next Friday", etc.
  memo?: string,
  emailToCustomer?: boolean
}
```

#### `send_invoice`
Email invoices to customers:
```typescript
{
  invoiceId: string,
  email?: string, // Custom email or use customer default
  subject?: string,
  message?: string
}
```

### Report Tools

#### `get_profit_loss`
Generate P&L statements:
```typescript
{
  startDate?: string,
  endDate?: string,
  accountingMethod?: 'Cash' | 'Accrual',
  summarizeBy?: 'Month' | 'Quarter' | 'Year' | 'Total'
}
```

---

## Real-Time Features

### Server-Sent Events (SSE)

Real-time streaming updates to MCP clients.

**Configuration:**
```typescript
const transport = new SSETransport({
  port: 3100,
  host: 'localhost',
  heartbeatInterval: 30000
});

await transport.start();
```

**Event Types:**
- `invoice:created` - New invoice created
- `invoice:updated` - Invoice modified
- `invoice:paid` - Invoice payment received
- `payment:received` - Payment recorded
- `expense:created` - New expense added
- `customer:created` - New customer added
- `report:ready` - Report generation complete
- `sync:progress` - Bulk operation progress
- `webhook:received` - QuickBooks webhook event
- `heartbeat` - Keep-alive ping

**Broadcasting Events:**
```typescript
sseTransport.broadcast({
  type: 'invoice:created',
  data: invoice
});
```

### QuickBooks Webhooks

Receive real-time notifications from QuickBooks.

**Configuration:**
```typescript
const receiver = new WebhookReceiver({
  port: 3200,
  verifierToken: process.env.QBO_WEBHOOK_TOKEN,
  enableReplayProtection: true
});

// Register handlers
receiver.on('invoice:create', async (data) => {
  console.log('Invoice created:', data.id);
  // Invalidate cache, broadcast via SSE, etc.
});

await receiver.start();
```

**Security Features:**
- ✅ HMAC-SHA256 signature verification
- ✅ Replay attack prevention
- ✅ Timing-safe signature comparison
- ✅ Automatic event deduplication

**Supported Events:**
- Invoice: Create, Update, Delete, Void
- Payment: Create, Update, Delete
- Customer: Create, Update, Delete
- Expense: Create, Update, Delete
- And more...

---

## Automation

### Recurring Invoices

Automatically generate and send invoices on a schedule.

**Configuration:**
```typescript
const scheduleId = await automationService.createRecurringInvoice({
  customerId: '123',
  lineItems: [
    { description: 'Monthly Service', amount: 1000 }
  ],
  frequency: 'monthly',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  dueInDays: 30,
  autoSend: true,
  emailSubject: 'Your Monthly Invoice',
  emailMessage: 'Thank you for your business!'
});
```

**Supported Frequencies:**
- `daily` - Every day
- `weekly` - Every 7 days
- `biweekly` - Every 14 days
- `monthly` - Same day each month
- `quarterly` - Every 3 months
- `yearly` - Annual

### Payment Reminders

Automatic follow-up emails for overdue invoices.

**Default Schedule:**
1. **Day 1** (Friendly): Gentle reminder payment is due
2. **Day 7** (Firm): Payment is overdue, please pay soon
3. **Day 14** (Final): Final notice before collections
4. **Day 30** (Collections): Account forwarded to collections

**Usage:**
```typescript
await automationService.schedulePaymentReminders('invoice-123');
```

**Customization:**
```typescript
const schedule: PaymentReminderSchedule = {
  invoiceId: 'invoice-123',
  reminders: [
    {
      daysAfterDue: 1,
      type: 'friendly',
      subject: 'Payment Reminder',
      message: 'Your payment is due...'
    }
  ]
};
```

---

## Error Handling

### Error Catalog

50+ predefined errors with user-friendly messages and actionable suggestions.

**Error Categories:**
- `AUTH` - Authentication errors
- `RATE` - Rate limiting errors
- `VAL` - Validation errors
- `INV` - Invoice errors
- `PAY` - Payment errors
- `EXP` - Expense errors
- `CUST` - Customer errors
- `RPT` - Report errors
- `NET` - Network errors
- `CACHE` - Cache errors
- `HOOK` - Webhook errors
- `AUTO` - Automation errors
- `SYS` - System errors

**Example Error:**
```typescript
{
  code: 'QBO_AUTH_001',
  message: 'Your QuickBooks session has expired',
  suggestion: 'Refreshing authentication automatically. This should not affect your request.',
  recoverable: true,
  severity: 'warning'
}
```

### Error Builder

Contextual error creation with automatic retry logic:

```typescript
// From error code
const error = ErrorBuilder.fromCode('QBO_AUTH_001', {
  requestId: '123',
  timestamp: new Date()
});

// From Axios error
const error = ErrorBuilder.fromAxiosError(axiosError);

// Check recoverability
if (ErrorBuilder.isRecoverable(error)) {
  const delay = ErrorBuilder.getRetryDelay(error, attempt);
  // Wait and retry...
}
```

### Automatic Retries

Exponential backoff for recoverable errors:
- Token refresh failures → automatic re-auth
- Rate limit exceeded → automatic queuing
- Network timeouts → retry with backoff
- Transient errors → up to 3 retries

**Retry Strategy:**
- Attempt 1: 1 second delay
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- With ±20% jitter to prevent thundering herd

---

## Security & Compliance

### QuickBooks API Compatibility

✅ **Minor Version 75** - Required as of August 1, 2025
- All API requests include `Minor-Version: 75` header
- Compatible with latest QuickBooks changes
- Prepared for deprecation of versions 1-74

### Authentication

- OAuth 2.0 token management
- Automatic token refresh with 5-minute buffer
- Concurrent refresh protection
- Secure token storage (in-memory)

### Data Validation

- Runtime validation with Zod schemas
- Type-safe parameters
- Business rule enforcement
- Sanitization of sensitive data in logs

### Audit Logging

- All API requests logged
- Request/response correlation
- Performance metrics
- Error tracking with stack traces

### Rate Limiting

- Queue-based request throttling
- 60 requests/minute (default)
- 5 concurrent requests (default)
- Automatic request queuing when limits reached

### Webhook Security

- HMAC-SHA256 signature verification
- Timing-safe signature comparison
- Replay attack prevention
- Event deduplication
- Secure verifier token storage

---

## Performance Optimization

### Caching Strategy

**Multi-Tier Caching:**
- **Tier 1** (5 min TTL): Invoices, customers
- **Tier 2** (30 min TTL): Reports, financial data
- **Tier 3** (1 hour TTL): Static data (payment methods, accounts)

**Cache Features:**
- LRU eviction policy
- Automatic expiration
- Manual invalidation
- Size limits

### Query Optimization

- Batch API requests where possible
- Efficient query construction
- Post-query filtering for complex searches
- Pagination support

### Queue Management

- Prevents API throttling
- Fair request scheduling
- Priority queuing
- Backpressure handling

---

## Getting Started

### Prerequisites

```bash
npm install
```

### Environment Configuration

Create `.env` file:
```bash
# QuickBooks OAuth
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
COMPANY_ID=your_company_id
REFRESH_TOKEN=your_refresh_token

# QuickBooks Environment
QBO_ENVIRONMENT=sandbox  # or 'production'

# SSE Transport (optional)
SSE_PORT=3100
SSE_HOST=localhost

# Webhook Receiver (optional)
WEBHOOK_PORT=3200
WEBHOOK_VERIFIER_TOKEN=your_webhook_token

# Caching
CACHE_TTL=300
CACHE_MAX_SIZE=100

# API Settings
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
TIMEOUT=30000
```

### Running the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Enabling Real-Time Features

**Start SSE Transport:**
```typescript
import { getSSETransport } from './transports/sse.transport.js';

const sse = getSSETransport();
await sse.start();
```

**Start Webhook Receiver:**
```typescript
import { getWebhookReceiver } from './webhooks/receiver.js';

const webhooks = getWebhookReceiver({
  port: 3200,
  verifierToken: process.env.WEBHOOK_VERIFIER_TOKEN!
});

await webhooks.start();
```

---

## Next Steps

- [ ] Add comprehensive test suite
- [ ] Implement Redis cache backend option
- [ ] Add multi-company support
- [ ] Create workflow rules engine
- [ ] Add custom report templates
- [ ] Implement batch operations
- [ ] Add GraphQL API layer
- [ ] Create admin dashboard

---

## Support

For issues or questions:
- GitHub Issues: [https://github.com/vespo92/QBO-MCP-TS/issues](https://github.com/vespo92/QBO-MCP-TS/issues)
- Documentation: See `ACCOUNTANT_NEEDS_RESEARCH.md` and `IMPLEMENTATION_PLAN.md`

## License

MIT
