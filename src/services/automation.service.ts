/**
 * Automation Service
 *
 * Handles automated QuickBooks operations including:
 * - Recurring invoices
 * - Payment reminders
 * - Scheduled reports
 * - Workflow automation
 */

import { logger } from '../utils/logger.js';
import { InvoiceService } from './invoice.js';
import type { QBOInvoice } from '../types/index.js';

/**
 * Recurring invoice configuration
 */
export interface RecurringInvoiceConfig {
  id: string;
  customerId: string;
  lineItems: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  dueInDays: number;
  autoSend: boolean;
  emailSubject?: string;
  emailMessage?: string;
  active: boolean;
}

/**
 * Payment reminder schedule
 */
export interface PaymentReminderSchedule {
  invoiceId: string;
  reminders: Array<{
    daysAfterDue: number;
    type: 'friendly' | 'firm' | 'final' | 'collections';
    subject: string;
    message: string;
  }>;
}

/**
 * Scheduled report configuration
 */
export interface ScheduledReportConfig {
  id: string;
  reportType: 'ProfitAndLoss' | 'BalanceSheet' | 'CashFlow' | 'AgedReceivables' | 'AgedPayables';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'excel' | 'json';
  active: boolean;
}

/**
 * Automation Service
 *
 * @example
 * ```typescript
 * const automation = new AutomationService();
 *
 * // Create recurring invoice
 * await automation.createRecurringInvoice({
 *   customerId: '123',
 *   lineItems: [{ description: 'Monthly Service', amount: 1000 }],
 *   frequency: 'monthly',
 *   startDate: new Date(),
 *   dueInDays: 30,
 *   autoSend: true
 * });
 *
 * // Schedule payment reminders
 * await automation.schedulePaymentReminders('invoice-456');
 * ```
 */
export class AutomationService {
  private invoiceService: InvoiceService;
  private recurringInvoices: Map<string, RecurringInvoiceConfig> = new Map();
  private paymentReminders: Map<string, PaymentReminderSchedule> = new Map();
  private scheduledReports: Map<string, ScheduledReportConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  /**
   * Create recurring invoice schedule
   *
   * @param config - Recurring invoice configuration
   * @returns Schedule ID
   */
  async createRecurringInvoice(
    config: Omit<RecurringInvoiceConfig, 'id' | 'active'>
  ): Promise<string> {
    const id = this.generateId();

    const fullConfig: RecurringInvoiceConfig = {
      ...config,
      id,
      active: true,
    };

    this.recurringInvoices.set(id, fullConfig);

    // Schedule next invoice creation
    this.scheduleNextInvoice(fullConfig);

    logger.info('Recurring invoice created', {
      id,
      customerId: config.customerId,
      frequency: config.frequency,
    });

    return id;
  }

  /**
   * Schedule next invoice creation
   */
  private scheduleNextInvoice(config: RecurringInvoiceConfig): void {
    if (!config.active) {
      return;
    }

    const now = new Date();
    const nextDate = this.calculateNextDate(config.startDate, config.frequency);

    // Check if we've passed the end date
    if (config.endDate && nextDate > config.endDate) {
      logger.info('Recurring invoice end date reached', { id: config.id });
      config.active = false;
      return;
    }

    // Calculate delay until next invoice
    const delay = nextDate.getTime() - now.getTime();

    if (delay > 0) {
      const timer = setTimeout(async () => {
        await this.generateRecurringInvoice(config);
        this.scheduleNextInvoice(config);
      }, delay);

      this.timers.set(`recurring-${config.id}`, timer);

      logger.debug('Next invoice scheduled', {
        id: config.id,
        nextDate: nextDate.toISOString(),
      });
    } else {
      // Past due, generate immediately
      this.generateRecurringInvoice(config).then(() => {
        this.scheduleNextInvoice(config);
      });
    }
  }

  /**
   * Generate invoice from recurring config
   */
  private async generateRecurringInvoice(config: RecurringInvoiceConfig): Promise<void> {
    logger.info('Generating recurring invoice', { id: config.id });

    try {
      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + config.dueInDays);

      // Create invoice
      const invoice = await this.invoiceService.createInvoice({
        customerId: config.customerId,
        lineItems: config.lineItems,
        dueDate: dueDate.toISOString().split('T')[0],
        autoEmail: config.autoSend,
      });

      logger.info('Recurring invoice generated', {
        scheduleId: config.id,
        invoiceId: invoice.Id,
        amount: invoice.TotalAmt,
      });

      // Schedule payment reminders if auto-send is enabled
      if (config.autoSend) {
        await this.schedulePaymentReminders(invoice.Id);
      }
    } catch (error) {
      logger.error('Failed to generate recurring invoice', {
        id: config.id,
        error,
      });
    }
  }

  /**
   * Schedule payment reminders for an invoice
   *
   * @param invoiceId - Invoice ID
   * @returns Schedule ID
   */
  async schedulePaymentReminders(invoiceId: string): Promise<string> {
    const id = this.generateId();

    // Default reminder schedule
    const schedule: PaymentReminderSchedule = {
      invoiceId,
      reminders: [
        {
          daysAfterDue: 1,
          type: 'friendly',
          subject: 'Friendly Payment Reminder',
          message:
            'This is a friendly reminder that payment for your invoice is due. Please let us know if you have any questions.',
        },
        {
          daysAfterDue: 7,
          type: 'firm',
          subject: 'Payment Overdue',
          message:
            'Your payment is now 7 days overdue. Please submit payment at your earliest convenience.',
        },
        {
          daysAfterDue: 14,
          type: 'final',
          subject: 'Final Payment Notice',
          message:
            'This is a final notice for your overdue payment. Please contact us immediately to resolve this matter.',
        },
        {
          daysAfterDue: 30,
          type: 'collections',
          subject: 'Collections Notice',
          message:
            'Your account is significantly past due. If payment is not received within 48 hours, this matter will be forwarded to collections.',
        },
      ],
    };

    this.paymentReminders.set(id, schedule);

    // Schedule reminders
    this.scheduleReminders(id, schedule);

    logger.info('Payment reminders scheduled', {
      scheduleId: id,
      invoiceId,
      reminders: schedule.reminders.length,
    });

    return id;
  }

  /**
   * Schedule individual reminders
   */
  private async scheduleReminders(id: string, schedule: PaymentReminderSchedule): Promise<void> {
    // Get invoice to find due date
    const invoice = await this.getInvoice(schedule.invoiceId);

    if (!invoice || !invoice.DueDate) {
      logger.warn('Cannot schedule reminders, invoice not found or no due date', {
        invoiceId: schedule.invoiceId,
      });
      return;
    }

    const dueDate = new Date(invoice.DueDate);

    for (const reminder of schedule.reminders) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() + reminder.daysAfterDue);

      const now = new Date();
      const delay = reminderDate.getTime() - now.getTime();

      if (delay > 0) {
        const timer = setTimeout(async () => {
          await this.sendReminder(invoice, reminder);
        }, delay);

        this.timers.set(`reminder-${id}-${reminder.daysAfterDue}`, timer);

        logger.debug('Reminder scheduled', {
          invoiceId: invoice.Id,
          type: reminder.type,
          date: reminderDate.toISOString(),
        });
      }
    }
  }

  /**
   * Send payment reminder
   */
  private async sendReminder(
    invoice: QBOInvoice,
    reminder: PaymentReminderSchedule['reminders'][0]
  ): Promise<void> {
    logger.info('Sending payment reminder', {
      invoiceId: invoice.Id,
      type: reminder.type,
      daysOverdue: reminder.daysAfterDue,
    });

    try {
      // Check if invoice is still unpaid
      const current = await this.getInvoice(invoice.Id);

      if (!current || (current.Balance || 0) === 0) {
        logger.info('Invoice already paid, skipping reminder', {
          invoiceId: invoice.Id,
        });
        return;
      }

      // Send reminder email
      await this.invoiceService.sendInvoice({
        invoiceId: invoice.Id,
        subject: reminder.subject,
        message: reminder.message,
      });

      logger.info('Payment reminder sent', {
        invoiceId: invoice.Id,
        type: reminder.type,
      });
    } catch (error) {
      logger.error('Failed to send payment reminder', {
        invoiceId: invoice.Id,
        error,
      });
    }
  }

  /**
   * Cancel recurring invoice
   *
   * @param id - Schedule ID
   */
  async cancelRecurringInvoice(id: string): Promise<void> {
    const config = this.recurringInvoices.get(id);

    if (!config) {
      throw new Error(`Recurring invoice not found: ${id}`);
    }

    config.active = false;

    // Clear timer
    const timer = this.timers.get(`recurring-${id}`);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(`recurring-${id}`);
    }

    logger.info('Recurring invoice cancelled', { id });
  }

  /**
   * Calculate next date based on frequency
   */
  private calculateNextDate(startDate: Date, frequency: RecurringInvoiceConfig['frequency']): Date {
    const next = new Date(startDate);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  /**
   * Get invoice (helper method)
   */
  private async getInvoice(id: string): Promise<QBOInvoice | null> {
    try {
      return await this.invoiceService.getInvoiceById(id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `auto-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get all recurring invoices
   */
  getRecurringInvoices(): RecurringInvoiceConfig[] {
    return Array.from(this.recurringInvoices.values());
  }

  /**
   * Get all payment reminder schedules
   */
  getPaymentReminders(): PaymentReminderSchedule[] {
    return Array.from(this.paymentReminders.values());
  }
}

/**
 * Singleton instance
 */
export const automationService = new AutomationService();
