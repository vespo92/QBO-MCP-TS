# QBOMCP-TS API Usage Examples

## Invoice Operations

### Get All Unpaid Invoices
```json
{
  "tool": "get_invoices",
  "arguments": {
    "status": "unpaid"
  }
}
```

### Get Overdue Invoices
```json
{
  "tool": "get_invoices",
  "arguments": {
    "status": "overdue"
  }
}
```

### Get Invoices for a Specific Customer
```json
{
  "tool": "get_invoices",
  "arguments": {
    "customerName": "ABC Company",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-12-31"
  }
}
```

### Get High-Value Invoices from Last Quarter
```json
{
  "tool": "get_invoices",
  "arguments": {
    "dateFrom": "last quarter",
    "minAmount": 5000
  }
}
```

### Create a Simple Invoice
```json
{
  "tool": "create_invoice",
  "arguments": {
    "customerName": "John Smith",
    "items": [
      {
        "description": "Consulting Services - January 2024",
        "amount": 2500
      }
    ],
    "dueDate": "30 days"
  }
}
```

### Create a Detailed Invoice with Multiple Items
```json
{
  "tool": "create_invoice",
  "arguments": {
    "customerName": "ABC Company",
    "items": [
      {
        "description": "Website Development",
        "amount": 5000,
        "quantity": 1,
        "unitPrice": 5000
      },
      {
        "description": "Monthly Maintenance",
        "amount": 1000,
        "quantity": 2,
        "unitPrice": 500
      },
      {
        "description": "Additional Features",
        "amount": 1500
      }
    ],
    "dueDate": "2024-02-15",
    "memo": "Project completion - Phase 1",
    "emailToCustomer": true
  }
}
```

### Send Invoice via Email
```json
{
  "tool": "send_invoice",
  "arguments": {
    "invoiceId": "123",
    "email": "billing@example.com",
    "subject": "Invoice for January Services",
    "message": "Please find attached your invoice for services rendered in January. Thank you for your business!"
  }
}
```

### Get Accounts Receivable Aging Report
```json
{
  "tool": "get_invoice_aging",
  "arguments": {
    "asOfDate": "today"
  }
}
```

## Natural Language Date Examples

The server understands various natural language date formats:

### Relative Dates
- `"today"`
- `"yesterday"`
- `"tomorrow"`
- `"last month"`
- `"this month"`
- `"next month"`
- `"last quarter"`
- `"this quarter"`
- `"last year"`
- `"this year"`
- `"year to date"` or `"ytd"`
- `"month to date"` or `"mtd"`
- `"quarter to date"` or `"qtd"`

### Specific Periods
- `"Q1 2024"`
- `"Q3"` (current year)
- `"January 2024"`
- `"March"` (current year)
- `"last 30 days"`
- `"last 3 months"`
- `"last 6 months"`

### Standard Formats
- `"2024-01-15"`
- `"01/15/2024"`
- `"15/01/2024"`
- `"Jan 15, 2024"`
- `"January 15, 2024"`

## System Operations

### Get Help
```json
{
  "tool": "help",
  "arguments": {
    "topic": "invoices"
  }
}
```

### Check API Status and Limits
```json
{
  "tool": "get_api_status",
  "arguments": {}
}
```

## SSE Transport Examples (for web clients)

### Connect to SSE Stream
```javascript
const eventSource = new EventSource('http://localhost:3000/sse');

eventSource.onmessage = (event) => {
  console.log('Message:', event.data);
};

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
};
```

### Send Tool Request via HTTP
```javascript
const response = await fetch('http://localhost:3000/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'get_invoices',
      arguments: {
        status: 'unpaid'
      }
    },
    id: 1
  })
});

const result = await response.json();
console.log('Result:', result);
```

### Check Server Health
```javascript
const health = await fetch('http://localhost:3000/health').then(r => r.json());
console.log('Server health:', health);
// Output: { status: 'healthy', timestamp: '...', uptime: 123, connections: 1 }
```

### List Available Tools
```javascript
const tools = await fetch('http://localhost:3000/tools').then(r => r.json());
console.log('Available tools:', tools);
```

## Error Handling

The server provides detailed error messages with suggestions:

### Customer Not Found
```json
{
  "success": false,
  "error": "Customer not found: XYZ Company",
  "suggestion": "Please verify the customer name exists in QuickBooks. Use 'get_customers' to list available customers."
}
```

### Invalid Date Format
```json
{
  "success": false,
  "error": "Invalid date format",
  "suggestion": "Try using natural language like 'last month' or standard format like '2024-01-15'"
}
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "suggestion": "Please wait 60 seconds before making additional requests",
  "metadata": {
    "retryAfter": 60
  }
}
```

## Performance Tips

1. **Use Natural Language**: The server understands phrases like "last month" better than calculating dates yourself
2. **Leverage Caching**: Repeated queries within 5 minutes return cached results instantly
3. **Batch Operations**: When creating multiple invoices, consider using batch mode (coming soon)
4. **Filter Efficiently**: Use specific filters to reduce API calls and response size
5. **Monitor Limits**: Use `get_api_status` to check your remaining API calls

## Advanced Features

### Custom Date Ranges
```json
{
  "tool": "get_invoices",
  "arguments": {
    "dateFrom": "Q1 2024",
    "dateTo": "Q2 2024",
    "status": "paid"
  }
}
```

### Complex Filtering
```json
{
  "tool": "get_invoices",
  "arguments": {
    "customerName": "ABC Company",
    "minAmount": 1000,
    "maxAmount": 10000,
    "dateFrom": "last 90 days",
    "status": "unpaid",
    "limit": 50
  }
}
```

### Fiscal Year Queries (coming soon)
```json
{
  "tool": "get_invoices",
  "arguments": {
    "dateFrom": "fiscal year 2024"
  }
}
```