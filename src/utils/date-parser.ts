/**
 * Natural language date parser for accounting queries
 */

import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subQuarters,
  subYears,
  addDays,
  isValid,
} from 'date-fns';

export class DateParser {
  /**
   * Parse natural language date string to ISO date
   */
  public static parse(input: string): string {
    if (!input) {
      return format(new Date(), 'yyyy-MM-dd');
    }

    const normalized = input.toLowerCase().trim();
    const today = new Date();

    // Check for relative dates
    if (normalized === 'today') {
      return format(today, 'yyyy-MM-dd');
    }

    if (normalized === 'yesterday') {
      return format(addDays(today, -1), 'yyyy-MM-dd');
    }

    if (normalized === 'tomorrow') {
      return format(addDays(today, 1), 'yyyy-MM-dd');
    }

    // Month-based patterns
    if (normalized === 'this month' || normalized === 'current month') {
      return format(startOfMonth(today), 'yyyy-MM-dd');
    }

    if (normalized === 'last month' || normalized === 'previous month') {
      return format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
    }

    if (normalized === 'next month') {
      return format(startOfMonth(addDays(today, 30)), 'yyyy-MM-dd');
    }

    // Quarter-based patterns
    const quarterMatch = normalized.match(/q([1-4])\s*(\d{4})?/);
    if (quarterMatch) {
      const quarter = parseInt(quarterMatch[1]!);
      const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : today.getFullYear();
      const date = new Date(year, (quarter - 1) * 3, 1);
      return format(startOfQuarter(date), 'yyyy-MM-dd');
    }

    if (normalized === 'this quarter' || normalized === 'current quarter') {
      return format(startOfQuarter(today), 'yyyy-MM-dd');
    }

    if (normalized === 'last quarter' || normalized === 'previous quarter') {
      return format(startOfQuarter(subQuarters(today, 1)), 'yyyy-MM-dd');
    }

    // Year-based patterns
    if (normalized === 'this year' || normalized === 'current year') {
      return format(startOfYear(today), 'yyyy-MM-dd');
    }

    if (normalized === 'last year' || normalized === 'previous year') {
      return format(startOfYear(subYears(today, 1)), 'yyyy-MM-dd');
    }

    if (normalized === 'year to date' || normalized === 'ytd') {
      return format(startOfYear(today), 'yyyy-MM-dd');
    }

    // Fiscal year patterns (assuming fiscal year = calendar year for now)
    if (normalized.includes('fiscal year') || normalized.includes('fy')) {
      const fyMatch = normalized.match(/(?:fiscal year|fy)\s*(\d{4})/);
      if (fyMatch) {
        const year = parseInt(fyMatch[1]!);
        return format(new Date(year, 0, 1), 'yyyy-MM-dd');
      }
      return format(startOfYear(today), 'yyyy-MM-dd');
    }

    // Month name patterns
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];

    for (let i = 0; i < monthNames.length; i++) {
      if (normalized.includes(monthNames[i]!)) {
        const yearMatch = normalized.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]!) : today.getFullYear();
        return format(new Date(year, i, 1), 'yyyy-MM-dd');
      }
    }

    // Try standard date formats
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'MM-dd-yyyy',
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'MMM dd, yyyy',
      'MMMM dd, yyyy',
    ];

    for (const fmt of formats) {
      try {
        const parsed = parse(input, fmt, new Date());
        if (isValid(parsed)) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch {
        // Continue to next format
      }
    }

    // If nothing matches, return the original input
    // QuickBooks might understand it better
    return input;
  }

  /**
   * Parse date range from natural language
   */
  public static parseRange(input: string): { start: string; end: string } {
    const normalized = input.toLowerCase().trim();
    const today = new Date();

    // Common ranges
    if (normalized === 'this month' || normalized === 'current month') {
      return {
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'last month' || normalized === 'previous month') {
      const lastMonth = subMonths(today, 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'this quarter' || normalized === 'current quarter') {
      return {
        start: format(startOfQuarter(today), 'yyyy-MM-dd'),
        end: format(endOfQuarter(today), 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'last quarter' || normalized === 'previous quarter') {
      const lastQuarter = subQuarters(today, 1);
      return {
        start: format(startOfQuarter(lastQuarter), 'yyyy-MM-dd'),
        end: format(endOfQuarter(lastQuarter), 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'this year' || normalized === 'current year') {
      return {
        start: format(startOfYear(today), 'yyyy-MM-dd'),
        end: format(endOfYear(today), 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'last year' || normalized === 'previous year') {
      const lastYear = subYears(today, 1);
      return {
        start: format(startOfYear(lastYear), 'yyyy-MM-dd'),
        end: format(endOfYear(lastYear), 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'year to date' || normalized === 'ytd') {
      return {
        start: format(startOfYear(today), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'month to date' || normalized === 'mtd') {
      return {
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    }

    if (normalized === 'quarter to date' || normalized === 'qtd') {
      return {
        start: format(startOfQuarter(today), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    }

    // Last N days/months/years
    const lastNMatch = normalized.match(/last (\d+) (days?|months?|years?)/);
    if (lastNMatch) {
      const n = parseInt(lastNMatch[1]!);
      const unit = lastNMatch[2]!;

      let start: Date;
      if (unit.startsWith('day')) {
        start = addDays(today, -n);
      } else if (unit.startsWith('month')) {
        start = subMonths(today, n);
      } else {
        start = subYears(today, n);
      }

      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    }

    // Quarter patterns (e.g., "Q1 2024")
    const quarterMatch = normalized.match(/q([1-4])\s*(\d{4})?/);
    if (quarterMatch) {
      const quarter = parseInt(quarterMatch[1]!);
      const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : today.getFullYear();
      const date = new Date(year, (quarter - 1) * 3, 1);
      return {
        start: format(startOfQuarter(date), 'yyyy-MM-dd'),
        end: format(endOfQuarter(date), 'yyyy-MM-dd'),
      };
    }

    // Default to current month
    return {
      start: format(startOfMonth(today), 'yyyy-MM-dd'),
      end: format(endOfMonth(today), 'yyyy-MM-dd'),
    };
  }

  /**
   * Get fiscal year dates (customize based on company settings)
   */
  public static getFiscalYear(
    year?: number,
    fiscalYearStart: number = 1,
  ): {
    start: string;
    end: string;
  } {
    const targetYear = year || new Date().getFullYear();
    const start = new Date(targetYear, fiscalYearStart - 1, 1);
    const end = new Date(targetYear + 1, fiscalYearStart - 1, 0);

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  }

  /**
   * Format date for display
   */
  public static formatDisplay(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return isValid(d) ? format(d, formatStr) : String(date);
  }

  /**
   * Calculate days between dates
   */
  public static daysBetween(start: string | Date, end: string | Date): number {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if date is overdue
   */
  public static isOverdue(date: string | Date): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d < new Date();
  }

  /**
   * Add business days to a date (excluding weekends)
   */
  public static addBusinessDays(date: string | Date, days: number): string {
    let current = typeof date === 'string' ? new Date(date) : new Date(date);
    let remaining = Math.abs(days);
    const direction = days > 0 ? 1 : -1;

    while (remaining > 0) {
      current = addDays(current, direction);
      const dayOfWeek = current.getDay();

      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        remaining--;
      }
    }

    return format(current, 'yyyy-MM-dd');
  }
}
