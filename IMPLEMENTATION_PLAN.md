# QuickBooks MCP Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for transforming the QuickBooks MCP into a modular, production-ready accounting automation platform.

## Phase 1: Modular Foundation (Current Phase)

### 1.1 Base Tool Architecture

**Create abstract base tool class**:
```typescript
// src/tools/base-tool.ts
export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodSchema;

  async execute(params: unknown): Promise<MCPToolResponse<unknown>>;
  validate(params: unknown): ValidationResult;
  handleError(error: Error): MCPToolResponse<unknown>;
}
```

**Tool registry with auto-discovery**:
```typescript
// src/tools/registry.ts
export class ToolRegistry {
  private tools: Map<string, BaseTool>;

  register(tool: BaseTool): void;
  get(name: string): BaseTool | undefined;
  listAll(): ToolDefinition[];
  autoDiscover(directory: string): Promise<void>;
}
```

### 1.2 Modular Tool Structure

**Directory structure**:
```
src/tools/
├── base-tool.ts
├── registry.ts
├── invoice/
│   ├── get-invoices.tool.ts
│   ├── create-invoice.tool.ts
│   ├── send-invoice.tool.ts
│   └── update-invoice.tool.ts
├── expense/
│   ├── get-expenses.tool.ts
│   ├── create-expense.tool.ts
│   └── update-expense.tool.ts
├── reports/
│   ├── profit-loss.tool.ts
│   ├── balance-sheet.tool.ts
│   └── cash-flow.tool.ts
├── customer/
│   ├── get-customers.tool.ts
│   ├── create-customer.tool.ts
│   └── get-customer-balance.tool.ts
└── automation/
    ├── create-recurring-invoice.tool.ts
    └── schedule-payment-reminder.tool.ts
```

### 1.3 Error Catalog System

**Error definitions**:
```typescript
// src/errors/catalog.ts
export interface ErrorDefinition {
  code: string;
  message: string;
  suggestion: string;
  recoverable: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export const ErrorCatalog = {
  // Authentication errors
  AUTH_TOKEN_EXPIRED: {
    code: 'QBO_AUTH_001',
    message: 'QuickBooks session expired',
    suggestion: 'Refreshing authentication automatically...',
    recoverable: true,
    severity: 'warning'
  },
  AUTH_INVALID_CREDENTIALS: {
    code: 'QBO_AUTH_002',
    message: 'Invalid QuickBooks credentials',
    suggestion: 'Check CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN in .env',
    recoverable: false,
    severity: 'error'
  },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    code: 'QBO_RATE_001',
    message: 'QuickBooks API rate limit exceeded',
    suggestion: 'Request queued and will retry automatically',
    recoverable: true,
    severity: 'warning'
  },

  // Validation errors
  VALIDATION_MISSING_FIELD: {
    code: 'QBO_VAL_001',
    message: 'Required field missing',
    suggestion: 'Check the required parameters for this tool',
    recoverable: false,
    severity: 'error'
  },

  // Business logic errors
  INVOICE_ALREADY_PAID: {
    code: 'QBO_INV_001',
    message: 'Cannot modify paid invoice',
    suggestion: 'Create a credit memo to adjust a paid invoice',
    recoverable: false,
    severity: 'error'
  },

  // Network errors
  NETWORK_TIMEOUT: {
    code: 'QBO_NET_001',
    message: 'Request to QuickBooks timed out',
    suggestion: 'Retrying with exponential backoff...',
    recoverable: true,
    severity: 'warning'
  }
} as const;
```

**Error builder**:
```typescript
// src/errors/builder.ts
export class ErrorBuilder {
  static fromCode(code: keyof typeof ErrorCatalog, context?: Record<string, any>): QBOError {
    const def = ErrorCatalog[code];
    return new QBOError(
      def.message,
      def.code,
      def.suggestion,
      context
    );
  }

  static withSuggestions(error: Error): QBOError {
    // Analyze error and provide contextual suggestions
  }
}
```

### 1.4 Enhanced Service Layers

**Expense Service**:
```typescript
// src/services/expense.service.ts
export class ExpenseService {
  async getExpenses(params: GetExpensesParams): Promise<QBOExpense[]>;
  async createExpense(params: CreateExpenseParams): Promise<QBOExpense>;
  async updateExpense(id: string, params: UpdateExpenseParams): Promise<QBOExpense>;
  async categorizeExpense(id: string, accountId: string): Promise<QBOExpense>;
  async attachReceipt(id: string, file: Buffer): Promise<void>;
}
```

**Report Service**:
```typescript
// src/services/report.service.ts
export class ReportService {
  async getProfitAndLoss(params: ReportParams): Promise<QBOReport>;
  async getBalanceSheet(params: ReportParams): Promise<QBOReport>;
  async getCashFlow(params: ReportParams): Promise<QBOReport>;
  async getCustomReport(definition: CustomReportDefinition): Promise<QBOReport>;
  async scheduleReport(schedule: ReportSchedule): Promise<void>;
}
```

**Customer Service**:
```typescript
// src/services/customer.service.ts
export class CustomerService {
  async getCustomers(params: GetCustomersParams): Promise<QBOCustomer[]>;
  async createCustomer(params: CreateCustomerParams): Promise<QBOCustomer>;
  async updateCustomer(id: string, params: UpdateCustomerParams): Promise<QBOCustomer>;
  async getCustomerBalance(id: string): Promise<CustomerBalance>;
  async getCustomerHistory(id: string): Promise<CustomerHistory>;
}
```

## Phase 2: Real-Time Infrastructure

### 2.1 Webhook System

**Webhook receiver**:
```typescript
// src/webhooks/receiver.ts
export class WebhookReceiver {
  private app: Express;

  constructor(config: WebhookConfig) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Body parser
    // CORS
    // Rate limiting
    // Request logging
  }

  private setupRoutes(): void {
    this.app.post('/webhooks/qbo', this.handleWebhook.bind(this));
    this.app.get('/webhooks/health', this.healthCheck.bind(this));
  }

  private async handleWebhook(req: Request, res: Response): Promise<void> {
    // Validate signature
    // Queue event
    // Return 200 immediately
  }
}
```

**Signature validator**:
```typescript
// src/webhooks/validator.ts
export class WebhookValidator {
  static validateSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const expected = hmac.update(payload).digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
}
```

**Event processor**:
```typescript
// src/webhooks/processor.ts
export class WebhookProcessor {
  async processEvent(event: WebhookEvent): Promise<void> {
    const handler = this.getHandler(event.eventType);
    await handler.handle(event);

    // Invalidate cache
    await this.invalidateCache(event);

    // Broadcast via SSE
    await this.broadcastEvent(event);
  }
}
```

### 2.2 SSE Transport

**SSE server**:
```typescript
// src/transports/sse.ts
export class SSETransport {
  private clients: Set<SSEClient> = new Set();

  broadcast(event: SSEEvent): void {
    const data = JSON.stringify(event);
    this.clients.forEach(client => {
      client.send(`event: ${event.type}\ndata: ${data}\n\n`);
    });
  }

  addClient(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const client: SSEClient = {
      id: generateId(),
      response: res,
      send: (data: string) => res.write(data)
    };

    this.clients.add(client);

    res.on('close', () => {
      this.clients.delete(client);
    });
  }
}
```

**Event types**:
```typescript
// src/transports/sse-events.ts
export type SSEEvent =
  | { type: 'invoice:created', data: QBOInvoice }
  | { type: 'invoice:updated', data: QBOInvoice }
  | { type: 'invoice:paid', data: { invoiceId: string, payment: QBOPayment } }
  | { type: 'payment:received', data: QBOPayment }
  | { type: 'expense:created', data: QBOExpense }
  | { type: 'report:ready', data: QBOReport }
  | { type: 'sync:progress', data: { current: number, total: number } }
  | { type: 'error', data: { code: string, message: string } };
```

## Phase 3: Automation Features

### 3.1 Recurring Invoices

**Recurring invoice config**:
```typescript
// src/types/automation.ts
export interface RecurringInvoiceConfig {
  templateId: string;
  customerId: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  lineItems: QBOLineItem[];
  autoSend: boolean;
  emailSubject?: string;
  emailMessage?: string;
}
```

**Automation service**:
```typescript
// src/services/automation.service.ts
export class AutomationService {
  async createRecurringInvoice(config: RecurringInvoiceConfig): Promise<string> {
    // Store config
    // Schedule cron job
    // Return schedule ID
  }

  async generateScheduledInvoice(scheduleId: string): Promise<QBOInvoice> {
    // Load config
    // Create invoice
    // Send if autoSend
    // Log result
  }

  async stopRecurringInvoice(scheduleId: string): Promise<void> {
    // Cancel cron job
    // Mark as inactive
  }
}
```

### 3.2 Payment Reminders

**Reminder schedule**:
```typescript
export interface ReminderSchedule {
  invoiceId: string;
  reminders: Array<{
    daysAfterDue: number;
    type: 'friendly' | 'firm' | 'final' | 'collections';
    subject: string;
    message: string;
  }>;
}
```

**Reminder service**:
```typescript
export class ReminderService {
  async scheduleReminders(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceService.getInvoice(invoiceId);

    // Schedule day 1, 7, 14, 30 reminders
    const schedule = this.buildReminderSchedule(invoice);

    for (const reminder of schedule.reminders) {
      await this.scheduleReminder(reminder);
    }
  }

  async sendReminder(reminder: Reminder): Promise<void> {
    // Check if already paid
    // Send email
    // Log reminder sent
  }
}
```

## Phase 4: Testing & Documentation

### 4.1 Unit Tests

**Tool tests**:
```typescript
// src/tools/__tests__/create-invoice.tool.test.ts
describe('CreateInvoiceTool', () => {
  let tool: CreateInvoiceTool;
  let mockService: jest.Mocked<InvoiceService>;

  beforeEach(() => {
    mockService = createMockInvoiceService();
    tool = new CreateInvoiceTool(mockService);
  });

  it('should create invoice with valid params', async () => {
    const params = {
      customerId: '123',
      lineItems: [{ description: 'Test', amount: 100 }]
    };

    const result = await tool.execute(params);

    expect(result.success).toBe(true);
    expect(result.data.invoiceId).toBeDefined();
  });

  it('should throw validation error for missing customer', async () => {
    const params = { lineItems: [] };

    await expect(tool.execute(params)).rejects.toThrow(ValidationError);
  });
});
```

### 4.2 Integration Tests

**API client tests**:
```typescript
// src/api/__tests__/client.integration.test.ts
describe('QBOClient Integration', () => {
  let client: QBOClient;

  beforeAll(() => {
    client = new QBOClient(getSandboxConfig());
  });

  it('should authenticate and fetch company info', async () => {
    const company = await client.getCompanyInfo();
    expect(company.CompanyName).toBeDefined();
  });

  it('should handle token refresh', async () => {
    // Force token expiry
    client.tokens.expiresAt = new Date(Date.now() - 1000);

    const company = await client.getCompanyInfo();
    expect(company).toBeDefined();
  });
});
```

### 4.3 Documentation

**Tool documentation**:
```typescript
/**
 * Creates a new invoice in QuickBooks Online
 *
 * This tool allows you to create invoices with multiple line items,
 * set due dates using natural language, and optionally email the
 * invoice to the customer automatically.
 *
 * @example
 * ```
 * create_invoice({
 *   customerId: "123",
 *   lineItems: [
 *     { description: "Web Design", amount: 2500, quantity: 1 }
 *   ],
 *   dueDate: "net 30",
 *   sendEmail: true
 * })
 * ```
 *
 * @param params - Invoice creation parameters
 * @param params.customerId - QuickBooks customer ID (required)
 * @param params.lineItems - Invoice line items (required)
 * @param params.dueDate - Due date (supports "net 30", "next Friday", etc.)
 * @param params.sendEmail - Email invoice to customer (default: false)
 *
 * @returns Invoice object with QuickBooks-assigned ID
 *
 * @throws {ValidationError} Missing or invalid parameters
 * @throws {AuthenticationError} QuickBooks session expired
 * @throws {RateLimitError} API rate limit exceeded
 */
```

## Implementation Checklist

### Phase 1: Foundation ✓
- [ ] Create base tool class
- [ ] Implement tool registry
- [ ] Migrate invoice tools to modular structure
- [ ] Create error catalog
- [ ] Add expense service
- [ ] Add report service
- [ ] Add customer service
- [ ] Update API client for minor version 75

### Phase 2: Real-Time ⏳
- [ ] Implement webhook receiver
- [ ] Add HMAC signature validation
- [ ] Create event processor
- [ ] Restore SSE transport
- [ ] Add event broadcasting
- [ ] Implement cache invalidation

### Phase 3: Automation ⏳
- [ ] Create automation service
- [ ] Implement recurring invoices
- [ ] Add payment reminder system
- [ ] Create workflow engine
- [ ] Add scheduled reports

### Phase 4: Quality ⏳
- [ ] Write unit tests (80%+ coverage)
- [ ] Write integration tests
- [ ] Add E2E tests
- [ ] Complete inline documentation
- [ ] Create user guide
- [ ] Add examples

## Success Criteria

- ✅ All tools follow modular pattern
- ✅ Error messages use catalog
- ✅ Test coverage > 80%
- ✅ Documentation complete
- ✅ SSE transport functional
- ✅ Webhooks receiving events
- ✅ Recurring invoices working
- ✅ API minor version 75 compatible

## Timeline

- **Week 1-2**: Phase 1 (Foundation)
- **Week 3-4**: Phase 2 (Real-Time)
- **Week 5-6**: Phase 3 (Automation)
- **Week 7-8**: Phase 4 (Quality)

## Notes

- Maintain backward compatibility
- Follow existing code style
- Update README with new features
- Create migration guide for existing users
