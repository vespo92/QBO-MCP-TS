/**
 * Report Service
 *
 * Handles all QuickBooks reporting operations including:
 * - Profit & Loss statements
 * - Balance Sheet reports
 * - Cash Flow statements
 * - Custom report generation
 * - Report scheduling and export
 */

import { QBOApiClient } from '../api/client.js';
import type { QBOReport } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { cache } from './cache.js';
import { queue } from './queue.js';
import { parseDateString } from '../utils/date-parser.js';

export interface ReportParams {
  startDate?: string;
  endDate?: string;
  accountingMethod?: 'Cash' | 'Accrual';
  summarizeBy?: 'Month' | 'Quarter' | 'Year' | 'Total';
  customerId?: string;
  vendorId?: string;
}

export interface CustomReportDefinition {
  name: string;
  type: 'summary' | 'detail' | 'comparison';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  groupBy?: string[];
  sortBy?: string[];
}

export class ReportService {
  private client: QBOApiClient;
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(client?: QBOApiClient) {
    this.client = client || new QBOApiClient();
  }

  /**
   * Get Profit & Loss report
   *
   * @param params - Report parameters
   * @returns P&L report
   */
  async getProfitAndLoss(params: ReportParams = {}): Promise<QBOReport> {
    const cacheKey = `report:pl:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOReport>(cacheKey);
    if (cached) {
      logger.info('Returning cached P&L report');
      return cached;
    }

    logger.info('Generating Profit & Loss report', params);

    // Build query parameters
    const queryParams = this.buildReportParams(params);

    // Fetch report
    const report = await queue.add(() =>
      this.client.get<QBOReport>(`/reports/ProfitAndLoss?${queryParams}`)
    );

    // Cache result
    await cache.set(cacheKey, report, this.CACHE_TTL);

    logger.info('P&L report generated successfully');

    return report;
  }

  /**
   * Get Balance Sheet report
   *
   * @param params - Report parameters
   * @returns Balance sheet report
   */
  async getBalanceSheet(params: ReportParams = {}): Promise<QBOReport> {
    const cacheKey = `report:bs:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOReport>(cacheKey);
    if (cached) {
      logger.info('Returning cached Balance Sheet report');
      return cached;
    }

    logger.info('Generating Balance Sheet report', params);

    // Build query parameters
    const queryParams = this.buildReportParams(params);

    // Fetch report
    const report = await queue.add(() =>
      this.client.get<QBOReport>(`/reports/BalanceSheet?${queryParams}`)
    );

    // Cache result
    await cache.set(cacheKey, report, this.CACHE_TTL);

    logger.info('Balance Sheet report generated successfully');

    return report;
  }

  /**
   * Get Cash Flow report
   *
   * @param params - Report parameters
   * @returns Cash flow report
   */
  async getCashFlow(params: ReportParams = {}): Promise<QBOReport> {
    const cacheKey = `report:cf:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOReport>(cacheKey);
    if (cached) {
      logger.info('Returning cached Cash Flow report');
      return cached;
    }

    logger.info('Generating Cash Flow report', params);

    // Build query parameters
    const queryParams = this.buildReportParams(params);

    // Fetch report
    const report = await queue.add(() =>
      this.client.get<QBOReport>(`/reports/CashFlow?${queryParams}`)
    );

    // Cache result
    await cache.set(cacheKey, report, this.CACHE_TTL);

    logger.info('Cash Flow report generated successfully');

    return report;
  }

  /**
   * Get Accounts Receivable Aging report
   *
   * @param params - Report parameters
   * @returns AR aging report
   */
  async getARAgingSummary(params: ReportParams = {}): Promise<QBOReport> {
    const cacheKey = `report:ar-aging:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOReport>(cacheKey);
    if (cached) {
      logger.info('Returning cached AR Aging report');
      return cached;
    }

    logger.info('Generating AR Aging report', params);

    // Build query parameters
    const queryParams = this.buildReportParams(params);

    // Fetch report
    const report = await queue.add(() =>
      this.client.get<QBOReport>(`/reports/AgedReceivables?${queryParams}`)
    );

    // Cache result
    await cache.set(cacheKey, report, this.CACHE_TTL);

    logger.info('AR Aging report generated successfully');

    return report;
  }

  /**
   * Get Accounts Payable Aging report
   *
   * @param params - Report parameters
   * @returns AP aging report
   */
  async getAPAgingSummary(params: ReportParams = {}): Promise<QBOReport> {
    const cacheKey = `report:ap-aging:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOReport>(cacheKey);
    if (cached) {
      logger.info('Returning cached AP Aging report');
      return cached;
    }

    logger.info('Generating AP Aging report', params);

    // Build query parameters
    const queryParams = this.buildReportParams(params);

    // Fetch report
    const report = await queue.add(() =>
      this.client.get<QBOReport>(`/reports/AgedPayables?${queryParams}`)
    );

    // Cache result
    await cache.set(cacheKey, report, this.CACHE_TTL);

    logger.info('AP Aging report generated successfully');

    return report;
  }

  /**
   * Get Transaction List report
   *
   * @param params - Report parameters
   * @returns Transaction list
   */
  async getTransactionList(params: ReportParams = {}): Promise<QBOReport> {
    const cacheKey = `report:txn-list:${JSON.stringify(params)}`;

    // Check cache
    const cached = await cache.get<QBOReport>(cacheKey);
    if (cached) {
      logger.info('Returning cached Transaction List');
      return cached;
    }

    logger.info('Generating Transaction List', params);

    // Build query parameters
    const queryParams = this.buildReportParams(params);

    // Fetch report
    const report = await queue.add(() =>
      this.client.get<QBOReport>(`/reports/TransactionList?${queryParams}`)
    );

    // Cache result
    await cache.set(cacheKey, report, this.CACHE_TTL);

    logger.info('Transaction List generated successfully');

    return report;
  }

  /**
   * Export report to PDF
   *
   * @param reportName - Report name (e.g., 'ProfitAndLoss')
   * @param params - Report parameters
   * @returns PDF buffer
   */
  async exportToPDF(reportName: string, params: ReportParams = {}): Promise<Buffer> {
    logger.info('Exporting report to PDF', { reportName });

    const queryParams = this.buildReportParams(params);

    const pdf = await queue.add(() =>
      this.client.downloadPDF(`/reports/${reportName}?${queryParams}&pdf=true`)
    );

    logger.info('Report exported to PDF successfully');

    return pdf;
  }

  /**
   * Build report query parameters
   *
   * @param params - Report parameters
   * @returns URL query string
   */
  private buildReportParams(params: ReportParams): string {
    const queryParts: string[] = [];

    if (params.startDate) {
      const date = parseDateString(params.startDate);
      queryParts.push(`start_date=${date}`);
    }

    if (params.endDate) {
      const date = parseDateString(params.endDate);
      queryParts.push(`end_date=${date}`);
    }

    if (params.accountingMethod) {
      queryParts.push(`accounting_method=${params.accountingMethod}`);
    }

    if (params.summarizeBy) {
      queryParts.push(`summarize_column_by=${params.summarizeBy}`);
    }

    if (params.customerId) {
      queryParts.push(`customer=${params.customerId}`);
    }

    if (params.vendorId) {
      queryParts.push(`vendor=${params.vendorId}`);
    }

    return queryParts.join('&');
  }

  /**
   * Format report data for display
   *
   * @param report - QuickBooks report
   * @returns Formatted report text
   */
  formatReport(report: QBOReport): string {
    let output = '';

    // Header
    output += `${report.Header.ReportName}\n`;
    output += `Period: ${report.Header.StartPeriod || 'N/A'} to ${report.Header.EndPeriod || 'N/A'}\n`;
    output += `Basis: ${report.Header.ReportBasis || 'N/A'}\n`;
    output += `Currency: ${report.Header.Currency || 'USD'}\n\n`;

    // Rows
    if (report.Rows?.Row) {
      output += this.formatRows(report.Rows.Row, 0);
    }

    return output;
  }

  /**
   * Recursively format report rows
   *
   * @param rows - Report rows
   * @param indent - Indentation level
   * @returns Formatted rows
   */
  private formatRows(rows: any[], indent: number): string {
    let output = '';
    const indentStr = '  '.repeat(indent);

    for (const row of rows) {
      if (row.type === 'Section' && row.Header) {
        output += `\n${indentStr}${row.Header.ColData?.[0]?.value || ''}\n`;
        if (row.Rows?.Row) {
          output += this.formatRows(row.Rows.Row, indent + 1);
        }
      } else if (row.type === 'Data' && row.ColData) {
        const values = row.ColData.map((col: any) => col.value || '0.00');
        output += `${indentStr}${values.join(' | ')}\n`;
      }
    }

    return output;
  }

  /**
   * Get available reports
   *
   * @returns List of available report names
   */
  getAvailableReports(): string[] {
    return [
      'ProfitAndLoss',
      'ProfitAndLossDetail',
      'BalanceSheet',
      'CashFlow',
      'AgedReceivables',
      'AgedPayables',
      'TransactionList',
      'GeneralLedger',
      'TrialBalance',
      'CustomerBalance',
      'CustomerIncome',
      'VendorBalance',
      'VendorExpenses',
      'SalesByCustomer',
      'SalesByProduct',
      'ExpensesByVendor',
    ];
  }
}

/**
 * Singleton instance
 */
export const reportService = new ReportService();
