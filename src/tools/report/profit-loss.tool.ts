import { BaseTool, type ToolMetadata } from '../base-tool.js';
import { z } from 'zod';
import type { QBOReport } from '../../types/index.js';
import { ReportService, type ReportParams } from '../../services/report.service.js';
import { logger } from '../../utils/logger.js';

// Create service instance
const reportService = new ReportService();

/**
 * Profit & Loss parameters schema
 */
const ProfitLossSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountingMethod: z.enum(['Cash', 'Accrual']).optional(),
  summarizeBy: z.enum(['Month', 'Quarter', 'Year', 'Total']).optional(),
});

type ProfitLossParams = z.infer<typeof ProfitLossSchema>;

/**
 * Profit & Loss Report Tool
 *
 * Generates a Profit & Loss (P&L) statement from QuickBooks.
 * Shows income, expenses, and net profit for a specified period.
 *
 * Features:
 * - Flexible date ranges (natural language supported)
 * - Cash or Accrual basis accounting
 * - Summarize by month, quarter, year, or total
 * - Cached for performance
 *
 * @example
 * ```typescript
 * const tool = new ProfitLossTool();
 * const result = await tool.execute({
 *   startDate: 'this month',
 *   endDate: 'today',
 *   accountingMethod: 'Accrual',
 *   summarizeBy: 'Month'
 * });
 * ```
 */
export class ProfitLossTool extends BaseTool<ProfitLossParams, QBOReport> {
  metadata: ToolMetadata = {
    name: 'get_profit_loss',
    description: 'Generate a Profit & Loss statement for a specified period',
    category: 'report',
    tags: ['reports', 'financials', 'profit-loss', 'income-statement'],
    examples: [
      {
        description: 'P&L for current month',
        params: {
          startDate: 'this month',
          endDate: 'today',
          accountingMethod: 'Accrual',
        },
      },
      {
        description: 'Year-to-date P&L by quarter',
        params: {
          startDate: 'this year',
          endDate: 'today',
          accountingMethod: 'Cash',
          summarizeBy: 'Quarter',
        },
      },
    ],
  };

  schema = ProfitLossSchema;

  /**
   * Execute the P&L report generation
   *
   * @param params - Validated report parameters
   * @param context - Execution context
   * @returns P&L report
   */
  protected async executeImpl(params: ProfitLossParams): Promise<QBOReport> {
    logger.info('Generating Profit & Loss report', params);

    try {
      const reportParams: ReportParams = {
        startDate: params.startDate,
        endDate: params.endDate,
        accountingMethod: params.accountingMethod,
        summarizeBy: params.summarizeBy,
      };

      const report = await reportService.getProfitAndLoss(reportParams);

      logger.info('P&L report generated successfully');

      return report;
    } catch (error) {
      logger.error('Failed to generate P&L report', { error });
      throw error;
    }
  }

  /**
   * Format P&L report for display
   *
   * @param report - P&L report
   * @returns Formatted text
   */
  protected override formatResultText(report: QBOReport): string {
    return reportService.formatReport(report);
  }
}

/**
 * Export default instance for convenience
 */
export default ProfitLossTool;
