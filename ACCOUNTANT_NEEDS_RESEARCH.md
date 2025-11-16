# QuickBooks MCP: Accountant Needs & Requirements Research

## Executive Summary

This document compiles research on what accountants need from QuickBooks integrations and provides actionable recommendations for making this MCP server a beautiful, safe, and effective tool for meaningful accounting workflows.

---

## 1. Core Accountant Needs

### High-Priority Workflows

#### Accounts Receivable Automation
- **Recurring Invoices**: Automated creation and sending for subscription/retainer clients
- **Payment Reminders**: Automated follow-ups for overdue invoices
- **Payment Processing**: Automated credit card/ACH payment acceptance
- **Aging Reports**: Real-time AR aging with actionable insights
- **Collections Management**: Automated escalation workflows

#### Accounts Payable Automation
- **Invoice Capture**: OCR/email-based bill entry
- **Approval Workflows**: Multi-level approval routing
- **Payment Scheduling**: Cash-flow optimized bill payment
- **Vendor Management**: Automated vendor communications
- **Three-way Matching**: PO → Receipt → Invoice validation

#### Financial Reporting
- **Real-Time Reports**: P&L, Balance Sheet, Cash Flow on demand
- **Comparative Analysis**: Period-over-period, budget vs actual
- **Custom Dashboards**: KPI tracking and alerts
- **Tax Preparation**: Categorized expense reports, deduction tracking
- **Audit Trails**: Complete transaction history with notes

### Medium-Priority Features

#### Client Management
- **Multi-Company Support**: Manage multiple QBO companies from one interface
- **Client Portal**: Secure invoice/report sharing
- **Collaboration**: Comments, attachments, approvals
- **Time Tracking**: Billable time capture and invoicing

#### Data Integrity
- **Reconciliation Automation**: Bank/CC matching
- **Duplicate Detection**: Prevent duplicate entries
- **Data Validation**: Real-time error checking
- **Backup & Export**: Scheduled data backups

#### Compliance & Security
- **Role-Based Access**: Granular permissions
- **Audit Logging**: Track all changes
- **Data Encryption**: At-rest and in-transit
- **SOC 2 Compliance**: Security best practices

---

## 2. QuickBooks API Landscape (2025)

### Critical Changes Effective Aug 1, 2025

**Minor Version Deprecation**:
- QuickBooks deprecating minor versions 1-74
- All requests default to minor version 75+
- **Action Required**: Test in sandbox before July 31, 2025
- **Impact**: Breaking changes to some endpoints

**Recommendation**: Add version header management to API client
```typescript
headers: {
  'Minor-Version': '75'
}
```

### API Rate Limits & Pricing

**Free Tier (Core API)**:
- ✅ Unlimited: Create, Update, Delete operations
- ✅ Free: Invoice creation, payment recording, customer management

**Metered Tier (CorePlus API)**:
- ⚠️ Metered: Read/Query operations
- Builder Tier: 500,000 calls/month (free)
- Growth: $199/month (1.5M calls)
- Scale: $499/month (5M calls)
- Platinum: $999/month (20M calls)

**Optimization Strategy**:
- Implement aggressive caching for reads
- Batch queries where possible
- Use webhooks instead of polling
- Monitor usage with alerts

### OAuth Reliability Concerns

**2025 OAuth Issues**:
- Simultaneous failures across multiple integrations
- Power BI and third-party apps affected
- Token refresh failures

**Mitigation Strategies**:
1. Implement exponential backoff with jitter
2. Token refresh with 5+ minute buffer
3. Fallback refresh flow
4. User-friendly error messages
5. Automatic retry with circuit breaker

---

## 3. Real-Time Data Integration

### QuickBooks Webhooks (Preferred Method)

**What They Are**:
- Event-driven notifications from QBO
- Push model (vs polling)
- Near-instant updates

**Key Events**:
- Invoice: created, updated, deleted
- Payment: created, updated, deleted
- Customer: created, updated
- Expense: created, updated
- Account: updated

**Security Requirements**:
- HTTPS endpoint required
- HMAC-SHA256 signature verification
- Replay attack prevention

**Implementation Needs**:
1. Webhook receiver endpoint (Express/Fastify)
2. Signature verification middleware
3. Event queue (for reliable processing)
4. Retry logic for failed processing
5. Webhook management UI

### SSE for Client Communication

**Use Case**: Server → Client real-time updates

While QuickBooks uses webhooks (Server → Your Server), SSE is ideal for:
- **Your Server → MCP Client**: Stream updates to Claude
- **Progress Updates**: Long-running operations
- **Live Reports**: Streaming financial data
- **Notifications**: Alert users of important events

**Architecture**:
```
QuickBooks API → Webhooks → Your Server → SSE → MCP Client (Claude)
```

**Benefits**:
- One-way server-to-client streaming
- Auto-reconnection
- Built-in browser support
- Simpler than WebSockets for one-way data

---

## 4. Current Codebase Assessment

### Strengths ✅

1. **Clean Architecture**: Well-organized service-oriented design
2. **Type Safety**: Comprehensive TypeScript with strict mode
3. **Error Handling**: Multi-layer with typed exceptions
4. **Configuration**: Robust env-based config with validation
5. **Caching**: LRU cache with TTL
6. **Rate Limiting**: Queue-based request throttling
7. **Natural Language**: Date parsing for user-friendly inputs

### Areas for Improvement ⚠️

1. **Tool Organization**: Hardcoded in server.ts (need modular structure)
2. **Missing Services**: Expense, Report, Customer services not implemented
3. **Limited Testing**: Framework configured but minimal tests
4. **No Webhooks**: Missing real-time event handling
5. **SSE Disabled**: Transport layer incomplete
6. **Error Messages**: Scattered strings (need catalog)
7. **Documentation**: Missing inline docs and examples

### Missing Features for Accountants 🚧

1. **Recurring Invoices**: No automation for subscription billing
2. **Payment Reminders**: No automated follow-ups
3. **Batch Operations**: No bulk invoice/expense creation
4. **Reconciliation**: No bank matching tools
5. **Multi-Company**: Single company only
6. **Custom Reports**: Limited to standard reports
7. **Workflow Automation**: No approval flows or rules engine

---

## 5. Recommended Architecture Improvements

### Phase 1: Modular Foundation (Week 1-2)

#### 1.1 Tool Module System
```
src/tools/
├── registry.ts              # Auto-discovery and registration
├── base-tool.ts             # Abstract base class
├── invoice/
│   ├── get-invoices.tool.ts
│   ├── create-invoice.tool.ts
│   ├── send-invoice.tool.ts
│   └── update-invoice.tool.ts
├── expense/
│   ├── get-expenses.tool.ts
│   ├── create-expense.tool.ts
│   └── categorize-expense.tool.ts
├── reports/
│   ├── profit-loss.tool.ts
│   ├── balance-sheet.tool.ts
│   ├── cash-flow.tool.ts
│   └── custom-report.tool.ts
├── customer/
│   ├── get-customers.tool.ts
│   ├── create-customer.tool.ts
│   └── customer-balance.tool.ts
└── automation/
    ├── recurring-invoice.tool.ts
    ├── payment-reminder.tool.ts
    └── workflow-trigger.tool.ts
```

**Benefits**:
- Each tool is independently testable
- Clear ownership and responsibility
- Easy to add new tools
- Better code organization
- Auto-registration via registry pattern

#### 1.2 Service Layer Expansion
```
src/services/
├── invoice.service.ts       # ✅ Exists
├── expense.service.ts       # 🆕 New
├── report.service.ts        # 🆕 New
├── customer.service.ts      # 🆕 New
├── payment.service.ts       # 🆕 New
├── reconciliation.service.ts # 🆕 New
├── automation.service.ts    # 🆕 New
└── webhook.service.ts       # 🆕 New
```

#### 1.3 Error Catalog
```
src/errors/
├── catalog.ts               # Error message templates
├── codes.ts                 # Error code constants
├── builder.ts               # Contextual error builder
└── suggestions.ts           # User-friendly fix suggestions
```

Example:
```typescript
// errors/catalog.ts
export const ErrorCatalog = {
  AUTH_TOKEN_EXPIRED: {
    code: 'QBO_AUTH_001',
    message: 'Your QuickBooks session has expired',
    suggestion: 'Please re-authenticate with QuickBooks',
    recoverable: true,
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'QBO_RATE_001',
    message: 'QuickBooks API rate limit exceeded',
    suggestion: 'Request will retry automatically in {retryAfter} seconds',
    recoverable: true,
  },
} as const;
```

### Phase 2: Real-Time Infrastructure (Week 3-4)

#### 2.1 Webhook System
```
src/webhooks/
├── receiver.ts              # Express/Fastify webhook endpoint
├── validator.ts             # HMAC signature verification
├── processor.ts             # Event processing logic
├── queue.ts                 # Event queue (Bull/BullMQ)
└── handlers/
    ├── invoice.handler.ts
    ├── payment.handler.ts
    └── customer.handler.ts
```

**Flow**:
1. QuickBooks sends webhook → `/webhooks/qbo`
2. Validate HMAC signature
3. Queue event for processing
4. Process event asynchronously
5. Update cache (invalidate stale data)
6. Broadcast via SSE to connected clients

#### 2.2 SSE Transport
```
src/transports/
├── stdio.ts                 # ✅ Exists
├── sse.ts                   # 🔄 Restore and enhance
└── websocket.ts             # 🆕 Optional alternative
```

**SSE Events**:
```typescript
type SSEEvent =
  | { type: 'invoice:created', data: QBOInvoice }
  | { type: 'invoice:paid', data: { invoiceId: string, payment: QBOPayment } }
  | { type: 'report:ready', data: QBOReport }
  | { type: 'sync:progress', data: { current: number, total: number } }
  | { type: 'error', data: { code: string, message: string } };
```

### Phase 3: Automation Features (Week 5-6)

#### 3.1 Recurring Invoice System
```typescript
// services/automation.service.ts
class AutomationService {
  async createRecurringInvoice(config: RecurringInvoiceConfig): Promise<void> {
    // Store schedule in database or config
    // Use node-cron or Bull for scheduling
    // Generate and send invoices automatically
  }

  async schedulePaymentReminders(invoiceId: string, schedule: ReminderSchedule): Promise<void> {
    // Day 1: Friendly reminder
    // Day 7: Second notice
    // Day 14: Final notice
    // Day 30: Collections notice
  }
}
```

#### 3.2 Workflow Engine
```typescript
// Simple rule-based system
interface WorkflowRule {
  trigger: 'invoice:created' | 'payment:received' | 'expense:submitted';
  conditions: Condition[];
  actions: Action[];
}

// Example: Auto-approve expenses under $100
const autoApprovalRule: WorkflowRule = {
  trigger: 'expense:submitted',
  conditions: [
    { field: 'amount', operator: '<', value: 100 },
    { field: 'category', operator: 'in', value: ['Office Supplies', 'Meals'] }
  ],
  actions: [
    { type: 'approve', notify: 'submitter' },
    { type: 'categorize', account: 'Office Expenses' }
  ]
};
```

### Phase 4: Enhanced Reporting (Week 7-8)

#### 4.1 Report Builder
```typescript
interface CustomReport {
  name: string;
  type: 'summary' | 'detail' | 'comparison';
  dateRange: DateRange;
  filters: ReportFilter[];
  groupBy: string[];
  sortBy: string[];
  columns: ReportColumn[];
}

// Enable accountants to build custom reports
async function buildCustomReport(config: CustomReport): Promise<QBOReport> {
  // Query QBO API
  // Apply filters and transformations
  // Format for presentation
  // Cache result
}
```

#### 4.2 Scheduled Reports
```typescript
// Daily/weekly/monthly report generation
interface ReportSchedule {
  reportId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'excel' | 'json';
}
```

### Phase 5: Data Integrity (Week 9-10)

#### 5.1 Reconciliation Tools
```typescript
class ReconciliationService {
  async matchTransactions(
    bankTransactions: BankTransaction[],
    qboTransactions: QBOTransaction[]
  ): Promise<ReconciliationResult> {
    // Fuzzy matching by amount, date, description
    // Suggest matches
    // Allow manual override
  }

  async detectDuplicates(): Promise<DuplicateReport> {
    // Find potential duplicate invoices/expenses
    // Group by similarity score
    // Provide merge/delete options
  }
}
```

---

## 6. Security & Compliance

### OAuth 2.0 Hardening
```typescript
// Enhanced token management
class SecureTokenManager {
  private tokens: Map<string, QBOTokens> = new Map();

  async refreshToken(companyId: string): Promise<QBOTokens> {
    // Refresh with 5-minute buffer
    // Implement circuit breaker pattern
    // Log all auth events
    // Encrypt tokens at rest
    // Implement token rotation
  }
}
```

### Audit Logging
```typescript
interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes: Record<string, { old: any, new: any }>;
  ipAddress: string;
  userAgent: string;
}

// Log all data modifications
auditLogger.log('invoice', 'update', {
  invoiceId: '123',
  changes: { amount: { old: 100, new: 150 } }
});
```

### Data Validation
```typescript
// Enhanced Zod schemas with business rules
const InvoiceAmountSchema = z.number()
  .min(0.01, 'Invoice amount must be positive')
  .max(1000000, 'Invoice exceeds maximum amount')
  .refine(
    (amount) => Number.isFinite(amount) && amount.toFixed(2) === String(amount),
    'Amount must have at most 2 decimal places'
  );
```

---

## 7. Performance Optimization

### Caching Strategy
```typescript
// Multi-tier caching
const cacheConfig = {
  // Hot data: in-memory, 5 min TTL
  tier1: {
    entities: ['company', 'preferences'],
    ttl: 300,
    storage: 'memory'
  },
  // Warm data: in-memory, 30 min TTL
  tier2: {
    entities: ['invoices', 'customers'],
    ttl: 1800,
    storage: 'memory'
  },
  // Cold data: Redis, 24 hour TTL
  tier3: {
    entities: ['historical_reports'],
    ttl: 86400,
    storage: 'redis'
  }
};
```

### Query Optimization
```typescript
// Batch requests
async function getBulkInvoices(invoiceIds: string[]): Promise<QBOInvoice[]> {
  // Use batch API endpoint
  const query = `SELECT * FROM Invoice WHERE Id IN (${invoiceIds.join(',')})`;
  return qboClient.query(query);
}

// Pagination for large datasets
async function* streamInvoices(filters: InvoiceFilters): AsyncGenerator<QBOInvoice> {
  let startPosition = 1;
  const maxResults = 1000;

  while (true) {
    const batch = await getInvoices({ ...filters, startPosition, maxResults });
    if (batch.length === 0) break;

    for (const invoice of batch) {
      yield invoice;
    }

    startPosition += maxResults;
  }
}
```

---

## 8. Testing Strategy

### Unit Tests
```typescript
// Test each service independently
describe('InvoiceService', () => {
  it('should create invoice with line items', async () => {
    const mockClient = createMockQBOClient();
    const service = new InvoiceService(mockClient);

    const invoice = await service.createInvoice({
      customerId: '123',
      lineItems: [{ description: 'Test', amount: 100 }]
    });

    expect(invoice.Id).toBeDefined();
    expect(invoice.TotalAmt).toBe(100);
  });
});
```

### Integration Tests
```typescript
// Test against QBO sandbox
describe('QBO API Integration', () => {
  it('should authenticate and fetch company info', async () => {
    const client = new QBOClient(sandboxConfig);
    const company = await client.getCompanyInfo();
    expect(company.CompanyName).toBeDefined();
  });
});
```

### E2E Tests
```typescript
// Test full MCP flows
describe('Invoice Creation Flow', () => {
  it('should create, send, and track invoice via MCP', async () => {
    const mcpClient = new MCPTestClient();

    // Create invoice
    const createResult = await mcpClient.callTool('create_invoice', {
      customerId: '123',
      items: [{ description: 'Consulting', amount: 1000 }]
    });

    const invoiceId = createResult.data.invoiceId;

    // Send invoice
    await mcpClient.callTool('send_invoice', { invoiceId });

    // Verify status
    const invoices = await mcpClient.callTool('get_invoices', {
      status: 'sent',
      limit: 1
    });

    expect(invoices.data).toContainEqual(
      expect.objectContaining({ Id: invoiceId })
    );
  });
});
```

---

## 9. Documentation Requirements

### Inline Documentation
```typescript
/**
 * Creates a new invoice in QuickBooks Online
 *
 * @param params - Invoice creation parameters
 * @param params.customerId - QuickBooks customer ID
 * @param params.lineItems - Array of invoice line items
 * @param params.dueDate - Due date (supports natural language like "next Friday")
 * @param params.sendEmail - Whether to email invoice to customer (default: false)
 *
 * @returns Created invoice with QuickBooks-assigned ID
 *
 * @throws {ValidationError} If required fields are missing or invalid
 * @throws {AuthenticationError} If QuickBooks session expired
 * @throws {RateLimitError} If API rate limit exceeded
 *
 * @example
 * ```typescript
 * const invoice = await createInvoice({
 *   customerId: '123',
 *   lineItems: [
 *     { description: 'Web Design', amount: 2500, quantity: 1 }
 *   ],
 *   dueDate: 'net 30',
 *   sendEmail: true
 * });
 * ```
 */
async function createInvoice(params: CreateInvoiceParams): Promise<QBOInvoice> {
  // Implementation
}
```

### User Guides
- Getting Started Guide
- Authentication Setup
- Common Workflows
- Troubleshooting
- API Reference
- Migration Guide (for existing integrations)

---

## 10. Implementation Roadmap

### Week 1-2: Foundation
- ✅ Modular tool system
- ✅ Service layer expansion
- ✅ Error catalog
- ✅ Enhanced validation

### Week 3-4: Real-Time
- ✅ Webhook receiver
- ✅ SSE transport restoration
- ✅ Event processing queue
- ✅ Cache invalidation

### Week 5-6: Automation
- ✅ Recurring invoices
- ✅ Payment reminders
- ✅ Workflow engine
- ✅ Scheduled reports

### Week 7-8: Reporting
- ✅ Custom report builder
- ✅ Comparative analysis
- ✅ Export formats (PDF, Excel)
- ✅ Report scheduling

### Week 9-10: Quality
- ✅ Comprehensive testing
- ✅ Documentation
- ✅ Performance optimization
- ✅ Security audit

---

## 11. Success Metrics

### Performance
- API response time < 200ms (95th percentile)
- Cache hit rate > 80%
- Webhook processing < 5 seconds
- Zero data loss in event processing

### Reliability
- Uptime > 99.9%
- OAuth success rate > 99.5%
- Error recovery rate > 95%
- Zero security incidents

### User Experience
- Tool response time < 2 seconds
- Error messages actionable (100%)
- Natural language support (dates, amounts)
- Documentation coverage > 90%

### Business Impact
- Reduce manual data entry by 80%
- Automate 90% of recurring tasks
- Support 100+ concurrent companies
- Handle 1M+ API calls/month

---

## Conclusion

This MCP server has a solid foundation but needs strategic enhancements to truly serve accountant needs. The recommended improvements focus on:

1. **Modularity**: Making the codebase maintainable and extensible
2. **Real-Time**: Enabling responsive, event-driven workflows
3. **Automation**: Reducing manual, repetitive tasks
4. **Safety**: Robust error handling, validation, and security
5. **Beauty**: Clean code, great DX, intuitive interfaces

By implementing these improvements in phases, we can transform this from a basic QuickBooks API wrapper into a comprehensive, production-ready accounting automation platform that accountants will love to use.
