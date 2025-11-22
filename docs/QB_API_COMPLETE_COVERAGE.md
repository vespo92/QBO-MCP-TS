# QuickBooks Online API - Complete Coverage Plan

## Overview

This document provides a comprehensive mapping of all QuickBooks Online API entities, categorized for efficient implementation in the QBO-MCP-TS server. It includes all official QB entities plus sanctioned 3rd party integrations.

---

## API Entity Categories

### 1. CORE ACCOUNTING (Foundation)

| Entity | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| Account | `/account` | Critical | Partial | Chart of Accounts management |
| JournalEntry | `/journalentry` | Critical | Pending | Manual journal entries |
| TaxCode | `/taxcode` | High | Pending | Tax codes configuration |
| TaxRate | `/taxrate` | High | Pending | Tax rate definitions |
| Class | `/class` | Medium | Pending | Transaction classification |
| Department | `/department` | Medium | Pending | Departmental tracking |
| CompanyInfo | `/companyinfo` | High | Pending | Company settings and info |
| Preferences | `/preferences` | Medium | Pending | Company preferences |
| ExchangeRate | `/exchangerate` | Low | Pending | Multi-currency rates |

### 2. SALES & REVENUE (AR Cycle)

| Entity | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| Customer | `/customer` | Critical | Done | Customer management |
| Invoice | `/invoice` | Critical | Done | Sales invoices |
| Estimate | `/estimate` | High | Pending | Quotes/estimates |
| SalesReceipt | `/salesreceipt` | High | Pending | Cash sales |
| CreditMemo | `/creditmemo` | High | Pending | Customer credits |
| RefundReceipt | `/refundreceipt` | Medium | Pending | Refund records |
| Payment | `/payment` | Critical | Done | Customer payments |
| PaymentMethod | `/paymentmethod` | Medium | Pending | Payment methods |
| Term | `/term` | Medium | Pending | Payment terms |
| Item | `/item` | Critical | Pending | Products/services |

### 3. PURCHASING & EXPENSES (AP Cycle)

| Entity | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| Vendor | `/vendor` | Critical | Partial | Vendor management |
| Bill | `/bill` | Critical | Pending | Vendor bills |
| BillPayment | `/billpayment` | Critical | Pending | Bill payments |
| VendorCredit | `/vendorcredit` | High | Pending | Vendor credits |
| Purchase | `/purchase` | Critical | Done | Direct purchases/expenses |
| PurchaseOrder | `/purchaseorder` | Medium | Pending | Purchase orders |

### 4. BANKING & CASH MANAGEMENT

| Entity | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| Deposit | `/deposit` | High | Pending | Bank deposits |
| Transfer | `/transfer` | High | Pending | Inter-account transfers |
| BankAccount | `/account` (Bank type) | High | Partial | Bank account management |

### 5. INVENTORY & PRODUCTS

| Entity | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| Item | `/item` | Critical | Pending | Inventory items |
| InventoryAdjustment | `/inventoryadjustment` | High | Pending | Stock adjustments |
| ItemCategory | `/itemcategory` (via Item) | Medium | Pending | Product categories |

### 6. EMPLOYEES & PAYROLL

| Entity | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| Employee | `/employee` | High | Pending | Employee records |
| TimeActivity | `/timeactivity` | High | Pending | Time tracking |

### 7. ATTACHMENTS & DOCUMENTS

| Entity | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| Attachable | `/attachable` | Medium | Pending | File attachments |

### 8. FINANCIAL REPORTS

| Report | API Endpoint | Priority | Status | Description |
|--------|--------------|----------|--------|-------------|
| ProfitAndLoss | `/reports/ProfitAndLoss` | Critical | Done | Income statement |
| ProfitAndLossDetail | `/reports/ProfitAndLossDetail` | High | Pending | Detailed P&L |
| BalanceSheet | `/reports/BalanceSheet` | Critical | Pending | Balance sheet |
| BalanceSheetDetail | `/reports/BalanceSheetDetail` | Medium | Pending | Detailed balance sheet |
| CashFlow | `/reports/CashFlow` | High | Pending | Cash flow statement |
| GeneralLedger | `/reports/GeneralLedger` | High | Pending | GL report |
| TrialBalance | `/reports/TrialBalance` | High | Pending | Trial balance |
| AgedReceivables | `/reports/AgedReceivables` | Critical | Pending | AR aging |
| AgedReceivableDetail | `/reports/AgedReceivableDetail` | Medium | Pending | AR aging detail |
| AgedPayables | `/reports/AgedPayables` | Critical | Pending | AP aging |
| AgedPayableDetail | `/reports/AgedPayableDetail` | Medium | Pending | AP aging detail |
| CustomerBalance | `/reports/CustomerBalance` | High | Pending | Balance by customer |
| CustomerBalanceDetail | `/reports/CustomerBalanceDetail` | Medium | Pending | Customer balance detail |
| CustomerIncome | `/reports/CustomerIncome` | Medium | Pending | Income by customer |
| VendorBalance | `/reports/VendorBalance` | High | Pending | Balance by vendor |
| VendorBalanceDetail | `/reports/VendorBalanceDetail` | Medium | Pending | Vendor balance detail |
| VendorExpenses | `/reports/VendorExpenses` | Medium | Pending | Expenses by vendor |
| SalesByCustomer | `/reports/SalesByCustomer` | Medium | Pending | Sales analysis |
| SalesByProduct | `/reports/SalesByProduct` | Medium | Pending | Product sales |
| TransactionList | `/reports/TransactionList` | High | Pending | All transactions |
| TransactionListByCustomer | `/reports/TransactionListByCustomer` | Medium | Pending | Txns by customer |
| TransactionListByVendor | `/reports/TransactionListByVendor` | Medium | Pending | Txns by vendor |
| AccountList | `/reports/AccountList` | Medium | Pending | Account listing |
| ClassSales | `/reports/ClassSales` | Low | Pending | Sales by class |
| DepartmentSales | `/reports/DepartmentSales` | Low | Pending | Sales by department |

---

## 3rd Party Integration Framework

### Tier 1: Native Intuit Integrations

| Integration | Type | Priority | Description |
|-------------|------|----------|-------------|
| QuickBooks Payments | Payment Processing | High | Credit card & ACH processing |
| QuickBooks Time (TSheets) | Time Tracking | High | Employee time tracking |
| QuickBooks Payroll | Payroll | Medium | Payroll processing |

### Tier 2: Sanctioned App Store Partners

| Integration | Category | Priority | Description |
|-------------|----------|----------|-------------|
| Bill.com | AP Automation | High | Automated bill payment |
| Expensify | Expense Management | High | Receipt scanning & expense reports |
| HubSpot | CRM | Medium | Sales pipeline integration |
| Shopify | E-Commerce | High | Online sales sync |
| Square | Point of Sale | High | Retail transactions |
| Stripe | Payment Processing | High | Online payments |
| Amazon Business | Procurement | Medium | Purchase tracking |
| Gusto | Payroll | Medium | Payroll alternative |
| Method:CRM | CRM | Medium | QB-native CRM |
| SOS Inventory | Inventory | High | Advanced inventory |
| Avalara | Tax | High | Sales tax automation |

### Tier 3: Generic Integrations

| Integration | Type | Priority | Description |
|-------------|------|----------|-------------|
| Plaid | Banking | High | Bank feed connections |
| Zapier/Make | Automation | Medium | Workflow automation |
| Excel/CSV | Data Import/Export | High | Bulk operations |

---

## Architecture: Tool Categories

```
tools/
├── accounting/           # Core accounting operations
│   ├── accounts/         # Chart of accounts
│   ├── journal-entries/  # Manual entries
│   ├── tax/             # Tax codes & rates
│   └── company/         # Company info & preferences
│
├── sales/               # AR cycle
│   ├── customers/       # Customer management
│   ├── invoices/        # Invoicing
│   ├── estimates/       # Quotes/estimates
│   ├── receipts/        # Sales receipts
│   ├── credits/         # Credit memos & refunds
│   ├── payments/        # Customer payments
│   └── items/           # Products/services
│
├── purchasing/          # AP cycle
│   ├── vendors/         # Vendor management
│   ├── bills/           # Bill management
│   ├── bill-payments/   # Bill payments
│   ├── expenses/        # Direct expenses
│   ├── purchase-orders/ # PO management
│   └── vendor-credits/  # Vendor credits
│
├── banking/             # Cash management
│   ├── deposits/        # Bank deposits
│   ├── transfers/       # Account transfers
│   └── reconciliation/  # Bank reconciliation
│
├── inventory/           # Stock management
│   ├── items/           # Inventory items
│   ├── adjustments/     # Stock adjustments
│   └── categories/      # Item categories
│
├── employees/           # HR & time
│   ├── employees/       # Employee records
│   └── time-tracking/   # Time activities
│
├── reports/             # Financial reporting
│   ├── financial/       # P&L, Balance Sheet, Cash Flow
│   ├── aging/           # AR/AP aging
│   ├── sales/           # Sales reports
│   ├── purchasing/      # Expense reports
│   └── custom/          # Custom queries
│
├── integrations/        # 3rd party
│   ├── payments/        # QB Payments, Stripe
│   ├── time/            # TSheets/QB Time
│   ├── ecommerce/       # Shopify, Square
│   ├── banking/         # Plaid
│   └── automation/      # Zapier webhooks
│
├── automation/          # Workflows
│   ├── recurring/       # Recurring transactions
│   ├── reminders/       # Payment reminders
│   ├── rules/           # Automation rules
│   └── scheduled/       # Scheduled tasks
│
└── utility/             # System tools
    ├── status/          # API health
    ├── config/          # Settings
    └── batch/           # Bulk operations
```

---

## Service Layer Architecture

```
services/
├── core/
│   ├── account.service.ts         # Chart of accounts
│   ├── journal-entry.service.ts   # Journal entries
│   ├── tax.service.ts             # Tax management
│   └── company.service.ts         # Company info
│
├── sales/
│   ├── customer.service.ts        # Customer ops
│   ├── invoice.service.ts         # Invoice ops
│   ├── estimate.service.ts        # Estimate ops
│   ├── sales-receipt.service.ts   # Cash sales
│   ├── credit-memo.service.ts     # Credits
│   ├── refund.service.ts          # Refunds
│   ├── payment.service.ts         # Payments
│   └── item.service.ts            # Products
│
├── purchasing/
│   ├── vendor.service.ts          # Vendor ops
│   ├── bill.service.ts            # Bill ops
│   ├── bill-payment.service.ts    # Bill payments
│   ├── expense.service.ts         # Expenses
│   ├── purchase-order.service.ts  # POs
│   └── vendor-credit.service.ts   # Vendor credits
│
├── banking/
│   ├── deposit.service.ts         # Deposits
│   ├── transfer.service.ts        # Transfers
│   └── reconciliation.service.ts  # Reconciliation
│
├── inventory/
│   ├── inventory-item.service.ts  # Inventory
│   └── adjustment.service.ts      # Adjustments
│
├── employees/
│   ├── employee.service.ts        # Employees
│   └── time-activity.service.ts   # Time tracking
│
├── reports/
│   ├── financial-report.service.ts   # Core reports
│   ├── aging-report.service.ts       # Aging
│   ├── sales-report.service.ts       # Sales
│   ├── purchasing-report.service.ts  # Purchasing
│   └── custom-report.service.ts      # Custom
│
├── integrations/
│   ├── qb-payments.service.ts     # QB Payments
│   ├── qb-time.service.ts         # TSheets
│   ├── stripe.service.ts          # Stripe
│   ├── plaid.service.ts           # Plaid
│   └── webhook-relay.service.ts   # External webhooks
│
├── automation/
│   ├── recurring.service.ts       # Recurring txns
│   ├── reminder.service.ts        # Reminders
│   ├── workflow.service.ts        # Rules engine
│   └── scheduler.service.ts       # Scheduled jobs
│
└── infrastructure/
    ├── cache.service.ts           # Caching
    ├── queue.service.ts           # Rate limiting
    ├── batch.service.ts           # Bulk ops
    └── multi-company.service.ts   # Multi-tenant
```

---

## Type Definitions Structure

```
types/
├── entities/
│   ├── core/
│   │   ├── account.types.ts
│   │   ├── journal-entry.types.ts
│   │   ├── tax.types.ts
│   │   └── company.types.ts
│   │
│   ├── sales/
│   │   ├── customer.types.ts
│   │   ├── invoice.types.ts
│   │   ├── estimate.types.ts
│   │   ├── sales-receipt.types.ts
│   │   ├── credit-memo.types.ts
│   │   ├── refund-receipt.types.ts
│   │   ├── payment.types.ts
│   │   └── item.types.ts
│   │
│   ├── purchasing/
│   │   ├── vendor.types.ts
│   │   ├── bill.types.ts
│   │   ├── bill-payment.types.ts
│   │   ├── purchase.types.ts
│   │   ├── purchase-order.types.ts
│   │   └── vendor-credit.types.ts
│   │
│   ├── banking/
│   │   ├── deposit.types.ts
│   │   └── transfer.types.ts
│   │
│   ├── inventory/
│   │   ├── item.types.ts
│   │   └── adjustment.types.ts
│   │
│   └── employees/
│       ├── employee.types.ts
│       └── time-activity.types.ts
│
├── reports/
│   ├── financial.types.ts
│   ├── aging.types.ts
│   ├── sales.types.ts
│   └── purchasing.types.ts
│
├── integrations/
│   ├── qb-payments.types.ts
│   ├── qb-time.types.ts
│   └── third-party.types.ts
│
└── common/
    ├── api.types.ts
    ├── mcp.types.ts
    └── service.types.ts
```

---

## Implementation Priority Matrix

### Phase 1: Foundation (Critical)
- [x] Invoice CRUD + Send
- [x] Customer management
- [x] Payment recording
- [x] Expense tracking
- [x] P&L Report
- [ ] Account (Chart of Accounts) - NEXT
- [ ] Bill management
- [ ] Bill Payment
- [ ] Balance Sheet
- [ ] AR/AP Aging Reports

### Phase 2: Complete AR/AP Cycle
- [ ] Estimate (Quotes)
- [ ] Credit Memo
- [ ] Sales Receipt
- [ ] Refund Receipt
- [ ] Vendor Credit
- [ ] Purchase Order
- [ ] Item (Products/Services)

### Phase 3: Advanced Operations
- [ ] Journal Entry
- [ ] Deposit
- [ ] Transfer
- [ ] Tax Codes/Rates
- [ ] Inventory Adjustment
- [ ] Employee management
- [ ] Time tracking

### Phase 4: Reports & Analytics
- [ ] All financial reports
- [ ] All aging reports
- [ ] All sales/purchasing reports
- [ ] Custom report builder
- [ ] Dashboard metrics

### Phase 5: Integrations
- [ ] QB Payments API
- [ ] TSheets/QB Time API
- [ ] Plaid banking
- [ ] Webhook relay system
- [ ] Third-party app framework

### Phase 6: Enterprise Features
- [ ] Multi-company operations
- [ ] Batch processing
- [ ] Scheduled automation
- [ ] Advanced workflows
- [ ] Audit logging

---

## Tool Naming Convention

All tools follow a consistent naming pattern:

```
{category}_{action}_{entity}

Examples:
- sales_get_invoices
- sales_create_invoice
- sales_send_invoice
- sales_void_invoice
- purchasing_get_bills
- purchasing_create_bill
- purchasing_pay_bill
- banking_create_deposit
- banking_create_transfer
- reports_get_profit_loss
- reports_get_balance_sheet
```

---

## API Rate Limiting Considerations

### Core API (Free, Unlimited)
- Create/Update operations
- Invoice, Customer, Vendor, Bill, Payment
- Journal Entry, Deposit, Transfer

### CorePlus API (Metered)
- Query operations (SELECT)
- Report generation
- Bulk read operations

### Optimization Strategies
1. Aggressive caching for reads
2. Batch queries where possible
3. Webhook-driven updates instead of polling
4. Smart cache invalidation
5. Request queuing and throttling

---

## Security Requirements

1. **OAuth 2.0** - All API calls use OAuth tokens
2. **Token Refresh** - Auto-refresh before expiry
3. **HMAC Verification** - Webhook signature validation
4. **Input Validation** - Zod schemas on all inputs
5. **Sensitive Data** - Redaction in logs
6. **Rate Limiting** - Prevent API abuse
7. **Audit Trail** - Track all operations

---

## Next Steps

1. Implement expanded type definitions
2. Create base services for each category
3. Build tools using the modular pattern
4. Add comprehensive test coverage
5. Update tool registry with new categories
6. Document all new features
