/**
 * Workflow Engine
 *
 * Rule-based automation and workflow execution.
 * Allows defining conditions and actions to automate business processes.
 *
 * Features:
 * - Conditional rule execution
 * - Multiple action types
 * - Event-driven triggers
 * - Workflow chaining
 * - Error handling and retry logic
 */

import { logger } from '../utils/logger.js';
import { InvoiceService } from './invoice.js';
import { ExpenseService } from './expense.service.js';
import { CustomerService } from './customer.service.js';
import { getSSETransport } from '../transports/sse.transport.js';

/**
 * Workflow condition
 */
export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

/**
 * Workflow action
 */
export type WorkflowAction =
  | { type: 'approve'; notify?: string }
  | { type: 'reject'; notify?: string; reason?: string }
  | { type: 'categorize'; account: string }
  | { type: 'assign'; userId: string }
  | { type: 'send_email'; to: string; subject: string; message: string }
  | { type: 'create_task'; title: string; assignee: string }
  | { type: 'webhook'; url: string; method: 'GET' | 'POST'; data?: any }
  | { type: 'broadcast_event'; eventType: string; data?: any };

/**
 * Workflow rule definition
 */
export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: 'invoice:created' | 'invoice:updated' | 'expense:submitted' | 'customer:created' | 'payment:received';
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  priority?: number; // Higher priority runs first
  stopOnMatch?: boolean; // Stop processing rules after match
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  trigger: string;
  entity: any;
  entityType: string;
  entityId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  actionsExecuted: number;
  errors: string[];
  duration: number;
}

/**
 * Workflow Service
 *
 * @example
 * ```typescript
 * const workflow = new WorkflowService();
 *
 * // Define auto-approval rule
 * workflow.addRule({
 *   id: 'auto-approve-small-expenses',
 *   name: 'Auto-approve small expenses',
 *   enabled: true,
 *   trigger: 'expense:submitted',
 *   conditions: [
 *     { field: 'amount', operator: 'lt', value: 100 },
 *     { field: 'category', operator: 'in', value: ['Office Supplies', 'Meals'] }
 *   ],
 *   actions: [
 *     { type: 'approve', notify: 'submitter' },
 *     { type: 'categorize', account: 'Office Expenses' }
 *   ]
 * });
 *
 * // Execute workflow
 * await workflow.execute('expense:submitted', expense);
 * ```
 */
export class WorkflowService {
  private rules: Map<string, WorkflowRule> = new Map();
  private invoiceService: InvoiceService;
  private expenseService: ExpenseService;
  private customerService: CustomerService;

  constructor() {
    this.invoiceService = new InvoiceService();
    this.expenseService = new ExpenseService();
    this.customerService = new CustomerService();
  }

  /**
   * Add a workflow rule
   *
   * @param rule - Workflow rule
   */
  addRule(rule: WorkflowRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule already exists: ${rule.id}`);
    }

    this.rules.set(rule.id, rule);

    logger.info('Workflow rule added', {
      id: rule.id,
      name: rule.name,
      trigger: rule.trigger,
    });
  }

  /**
   * Update a workflow rule
   *
   * @param id - Rule ID
   * @param updates - Rule updates
   */
  updateRule(id: string, updates: Partial<WorkflowRule>): void {
    const rule = this.rules.get(id);

    if (!rule) {
      throw new Error(`Rule not found: ${id}`);
    }

    const updated = { ...rule, ...updates };
    this.rules.set(id, updated);

    logger.info('Workflow rule updated', { id, name: rule.name });
  }

  /**
   * Remove a workflow rule
   *
   * @param id - Rule ID
   */
  removeRule(id: string): void {
    const rule = this.rules.get(id);

    if (!rule) {
      throw new Error(`Rule not found: ${id}`);
    }

    this.rules.delete(id);

    logger.info('Workflow rule removed', { id, name: rule.name });
  }

  /**
   * Get all rules
   */
  getAllRules(): WorkflowRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules for trigger
   *
   * @param trigger - Trigger type
   * @returns Array of matching rules
   */
  getRulesForTrigger(trigger: string): WorkflowRule[] {
    return Array.from(this.rules.values())
      .filter((rule) => rule.enabled && rule.trigger === trigger)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Execute workflow for entity
   *
   * @param trigger - Trigger type
   * @param entity - Entity that triggered workflow
   * @param metadata - Additional metadata
   * @returns Execution results
   */
  async execute(
    trigger: string,
    entity: any,
    metadata?: Record<string, any>
  ): Promise<WorkflowExecutionResult[]> {
    const context: WorkflowContext = {
      trigger,
      entity,
      entityType: this.getEntityType(trigger),
      entityId: entity.Id || entity.id,
      timestamp: new Date(),
      metadata,
    };

    logger.info('Executing workflow', {
      trigger,
      entityId: context.entityId,
      entityType: context.entityType,
    });

    const rules = this.getRulesForTrigger(trigger);
    const results: WorkflowExecutionResult[] = [];

    for (const rule of rules) {
      const result = await this.executeRule(rule, context);
      results.push(result);

      // Stop if rule matched and stopOnMatch is true
      if (result.matched && rule.stopOnMatch) {
        logger.info('Stopping workflow execution (stopOnMatch)', {
          ruleId: rule.id,
        });
        break;
      }
    }

    logger.info('Workflow execution complete', {
      trigger,
      rulesExecuted: results.length,
      matched: results.filter((r) => r.matched).length,
    });

    return results;
  }

  /**
   * Execute a single rule
   *
   * @param rule - Rule to execute
   * @param context - Execution context
   * @returns Execution result
   */
  private async executeRule(
    rule: WorkflowRule,
    context: WorkflowContext
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();

    logger.debug('Evaluating rule', { ruleId: rule.id, ruleName: rule.name });

    const result: WorkflowExecutionResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      actionsExecuted: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Evaluate conditions
      const matched = this.evaluateConditions(rule.conditions, context.entity);

      if (!matched) {
        result.duration = Date.now() - startTime;
        return result;
      }

      result.matched = true;

      logger.info('Rule matched, executing actions', {
        ruleId: rule.id,
        ruleName: rule.name,
        actionCount: rule.actions.length,
      });

      // Execute actions
      for (const action of rule.actions) {
        try {
          await this.executeAction(action, context);
          result.actionsExecuted++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Action ${action.type} failed: ${errorMessage}`);
          logger.error('Workflow action failed', {
            ruleId: rule.id,
            actionType: action.type,
            error: errorMessage,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Rule execution failed: ${errorMessage}`);
      logger.error('Workflow rule execution failed', {
        ruleId: rule.id,
        error: errorMessage,
      });
    }

    result.duration = Date.now() - startTime;

    return result;
  }

  /**
   * Evaluate conditions
   *
   * @param conditions - Conditions to evaluate
   * @param entity - Entity to evaluate against
   * @returns True if all conditions match
   */
  private evaluateConditions(conditions: WorkflowCondition[], entity: any): boolean {
    if (conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, entity)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate single condition
   *
   * @param condition - Condition to evaluate
   * @param entity - Entity to evaluate against
   * @returns True if condition matches
   */
  private evaluateCondition(condition: WorkflowCondition, entity: any): boolean {
    const fieldValue = this.getFieldValue(entity, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'startsWith':
        return String(fieldValue).startsWith(String(condition.value));
      case 'endsWith':
        return String(fieldValue).endsWith(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Get field value from entity (supports nested fields)
   *
   * @param entity - Entity object
   * @param field - Field path (e.g., "customer.name")
   * @returns Field value
   */
  private getFieldValue(entity: any, field: string): any {
    const parts = field.split('.');
    let value = entity;

    for (const part of parts) {
      if (value == null) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Execute workflow action
   *
   * @param action - Action to execute
   * @param context - Execution context
   */
  private async executeAction(action: WorkflowAction, context: WorkflowContext): Promise<void> {
    logger.debug('Executing action', { type: action.type });

    switch (action.type) {
      case 'approve':
        await this.handleApprove(context, action.notify);
        break;

      case 'reject':
        await this.handleReject(context, action.notify, action.reason);
        break;

      case 'categorize':
        await this.handleCategorize(context, action.account);
        break;

      case 'send_email':
        await this.handleSendEmail(action.to, action.subject, action.message);
        break;

      case 'broadcast_event':
        await this.handleBroadcastEvent(action.eventType, action.data);
        break;

      case 'webhook':
        await this.handleWebhook(action.url, action.method, action.data);
        break;

      default:
        logger.warn('Unknown action type', { type: (action as any).type });
    }
  }

  /**
   * Handle approve action
   */
  private async handleApprove(context: WorkflowContext, notify?: string): Promise<void> {
    logger.info('Approving entity', {
      entityType: context.entityType,
      entityId: context.entityId,
    });

    // Broadcast approval event
    await this.handleBroadcastEvent('entity:approved', {
      entityType: context.entityType,
      entityId: context.entityId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle reject action
   */
  private async handleReject(context: WorkflowContext, notify?: string, reason?: string): Promise<void> {
    logger.info('Rejecting entity', {
      entityType: context.entityType,
      entityId: context.entityId,
      reason,
    });

    // Broadcast rejection event
    await this.handleBroadcastEvent('entity:rejected', {
      entityType: context.entityType,
      entityId: context.entityId,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle categorize action
   */
  private async handleCategorize(context: WorkflowContext, account: string): Promise<void> {
    if (context.entityType === 'expense') {
      await this.expenseService.categorizeExpense(context.entityId, account);
      logger.info('Expense categorized', {
        expenseId: context.entityId,
        account,
      });
    }
  }

  /**
   * Handle send email action
   */
  private async handleSendEmail(to: string, subject: string, message: string): Promise<void> {
    logger.info('Sending email', { to, subject });
    // Email sending would be implemented here
  }

  /**
   * Handle broadcast event action
   */
  private async handleBroadcastEvent(eventType: string, data?: any): Promise<void> {
    try {
      const sse = getSSETransport();
      sse.broadcast({
        type: eventType as any,
        data: data || {},
      });

      logger.info('Event broadcast', { eventType });
    } catch (error) {
      logger.error('Failed to broadcast event', { eventType, error });
    }
  }

  /**
   * Handle webhook action
   */
  private async handleWebhook(url: string, method: 'GET' | 'POST', data?: any): Promise<void> {
    logger.info('Calling webhook', { url, method });

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      logger.info('Webhook call successful', { url, status: response.status });
    } catch (error) {
      logger.error('Webhook call failed', { url, error });
      throw error;
    }
  }

  /**
   * Get entity type from trigger
   */
  private getEntityType(trigger: string): string {
    const parts = trigger.split(':');
    return parts[0] || 'unknown';
  }
}

/**
 * Singleton instance
 */
export const workflowService = new WorkflowService();

/**
 * Example workflow rules
 */
export const exampleWorkflowRules: WorkflowRule[] = [
  {
    id: 'auto-approve-small-expenses',
    name: 'Auto-approve small expenses',
    description: 'Automatically approve expenses under $100 for office supplies',
    enabled: true,
    trigger: 'expense:submitted',
    conditions: [
      { field: 'TotalAmt', operator: 'lt', value: 100 },
      {
        field: 'Line[0].AccountBasedExpenseLineDetail.AccountRef.name',
        operator: 'in',
        value: ['Office Supplies', 'Meals'],
      },
    ],
    actions: [
      { type: 'approve', notify: 'submitter' },
      { type: 'broadcast_event', eventType: 'expense:auto_approved' },
    ],
    priority: 10,
  },
  {
    id: 'flag-large-invoices',
    name: 'Flag large invoices',
    description: 'Notify when invoices over $10,000 are created',
    enabled: true,
    trigger: 'invoice:created',
    conditions: [{ field: 'TotalAmt', operator: 'gte', value: 10000 }],
    actions: [
      {
        type: 'send_email',
        to: 'manager@company.com',
        subject: 'Large Invoice Alert',
        message: 'A new invoice over $10,000 has been created',
      },
      { type: 'broadcast_event', eventType: 'invoice:large_amount' },
    ],
    priority: 5,
  },
];
