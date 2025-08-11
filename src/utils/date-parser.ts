/**
 * Natural language date parser for accounting queries
 * Using native Date methods instead of date-fns
 */

export class DateParser {
  /**
   * Format date to yyyy-MM-dd
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Add days to a date
   */
  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add months to a date
   */
  private static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Add years to a date
   */
  private static addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Get start of month
   */
  private static startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get end of month
   */
  private static endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * Get start of quarter
   */
  private static startOfQuarter(date: Date): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
  }

  /**
   * Get end of quarter
   */
  private static endOfQuarter(date: Date): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), (quarter + 1) * 3, 0);
  }

  /**
   * Get start of year
   */
  private static startOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1);
  }

  /**
   * Get end of year
   */
  private static endOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 11, 31);
  }

  /**
   * Check if date is valid
   */
  private static isValid(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Parse natural language date string to ISO date
   */
  public static parse(input: string): string {
    if (!input) {
      return this.formatDate(new Date());
    }

    const normalized = input.toLowerCase().trim();
    const today = new Date();

    // Check for relative dates
    if (normalized === 'today') {
      return this.formatDate(today);
    }

    if (normalized === 'yesterday') {
      return this.formatDate(this.addDays(today, -1));
    }

    if (normalized === 'tomorrow') {
      return this.formatDate(this.addDays(today, 1));
    }

    // Month-based patterns
    if (normalized === 'this month' || normalized === 'current month') {
      return this.formatDate(this.startOfMonth(today));
    }

    if (normalized === 'last month' || normalized === 'previous month') {
      return this.formatDate(this.startOfMonth(this.addMonths(today, -1)));
    }

    if (normalized === 'next month') {
      return this.formatDate(this.startOfMonth(this.addMonths(today, 1)));
    }

    // Quarter-based patterns
    const quarterMatch = normalized.match(/q([1-4])\s*(\d{4})?/);
    if (quarterMatch) {
      const quarter = parseInt(quarterMatch[1]!);
      const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : today.getFullYear();
      const date = new Date(year, (quarter - 1) * 3, 1);
      return this.formatDate(this.startOfQuarter(date));
    }

    if (normalized === 'this quarter' || normalized === 'current quarter') {
      return this.formatDate(this.startOfQuarter(today));
    }

    if (normalized === 'last quarter' || normalized === 'previous quarter') {
      const lastQuarter = new Date(today);
      lastQuarter.setMonth(lastQuarter.getMonth() - 3);
      return this.formatDate(this.startOfQuarter(lastQuarter));
    }

    // Year-based patterns
    if (normalized === 'this year' || normalized === 'current year') {
      return this.formatDate(this.startOfYear(today));
    }

    if (normalized === 'last year' || normalized === 'previous year') {
      return this.formatDate(this.startOfYear(this.addYears(today, -1)));
    }

    if (normalized === 'year to date' || normalized === 'ytd') {
      return this.formatDate(this.startOfYear(today));
    }

    // Fiscal year patterns (assuming fiscal year = calendar year for now)
    if (normalized.includes('fiscal year') || normalized.includes('fy')) {
      const fyMatch = normalized.match(/(?:fiscal year|fy)\s*(\d{4})/);
      if (fyMatch) {
        const year = parseInt(fyMatch[1]!);
        return this.formatDate(new Date(year, 0, 1));
      }
      return this.formatDate(this.startOfYear(today));
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
        return this.formatDate(new Date(year, i, 1));
      }
    }

    // Try standard date formats
    const datePatterns = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-MM-dd
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/dd/yyyy
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-dd-yyyy
    ];

    for (const pattern of datePatterns) {
      const match = input.match(pattern);
      if (match) {
        let date: Date;
        if (pattern === datePatterns[0]) {
          // yyyy-MM-dd
          date = new Date(parseInt(match[1]!), parseInt(match[2]!) - 1, parseInt(match[3]!));
        } else {
          // MM/dd/yyyy or MM-dd-yyyy
          date = new Date(parseInt(match[3]!), parseInt(match[1]!) - 1, parseInt(match[2]!));
        }
        if (this.isValid(date)) {
          return this.formatDate(date);
        }
      }
    }

    // Try parsing as native Date
    const parsed = new Date(input);
    if (this.isValid(parsed)) {
      return this.formatDate(parsed);
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
        start: this.formatDate(this.startOfMonth(today)),
        end: this.formatDate(this.endOfMonth(today)),
      };
    }

    if (normalized === 'last month' || normalized === 'previous month') {
      const lastMonth = this.addMonths(today, -1);
      return {
        start: this.formatDate(this.startOfMonth(lastMonth)),
        end: this.formatDate(this.endOfMonth(lastMonth)),
      };
    }

    if (normalized === 'this quarter' || normalized === 'current quarter') {
      return {
        start: this.formatDate(this.startOfQuarter(today)),
        end: this.formatDate(this.endOfQuarter(today)),
      };
    }

    if (normalized === 'last quarter' || normalized === 'previous quarter') {
      const lastQuarter = this.addMonths(today, -3);
      return {
        start: this.formatDate(this.startOfQuarter(lastQuarter)),
        end: this.formatDate(this.endOfQuarter(lastQuarter)),
      };
    }

    if (normalized === 'this year' || normalized === 'current year') {
      return {
        start: this.formatDate(this.startOfYear(today)),
        end: this.formatDate(this.endOfYear(today)),
      };
    }

    if (normalized === 'last year' || normalized === 'previous year') {
      const lastYear = this.addYears(today, -1);
      return {
        start: this.formatDate(this.startOfYear(lastYear)),
        end: this.formatDate(this.endOfYear(lastYear)),
      };
    }

    if (normalized === 'year to date' || normalized === 'ytd') {
      return {
        start: this.formatDate(this.startOfYear(today)),
        end: this.formatDate(today),
      };
    }

    if (normalized === 'month to date' || normalized === 'mtd') {
      return {
        start: this.formatDate(this.startOfMonth(today)),
        end: this.formatDate(today),
      };
    }

    if (normalized === 'quarter to date' || normalized === 'qtd') {
      return {
        start: this.formatDate(this.startOfQuarter(today)),
        end: this.formatDate(today),
      };
    }

    // Last N days/months/years
    const lastNMatch = normalized.match(/last (\d+) (days?|months?|years?)/);
    if (lastNMatch) {
      const n = parseInt(lastNMatch[1]!);
      const unit = lastNMatch[2]!;

      let start: Date;
      if (unit.startsWith('day')) {
        start = this.addDays(today, -n);
      } else if (unit.startsWith('month')) {
        start = this.addMonths(today, -n);
      } else {
        start = this.addYears(today, -n);
      }

      return {
        start: this.formatDate(start),
        end: this.formatDate(today),
      };
    }

    // Quarter patterns (e.g., "Q1 2024")
    const quarterMatch = normalized.match(/q([1-4])\s*(\d{4})?/);
    if (quarterMatch) {
      const quarter = parseInt(quarterMatch[1]!);
      const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : today.getFullYear();
      const date = new Date(year, (quarter - 1) * 3, 1);
      return {
        start: this.formatDate(this.startOfQuarter(date)),
        end: this.formatDate(this.endOfQuarter(date)),
      };
    }

    // Default to current month
    return {
      start: this.formatDate(this.startOfMonth(today)),
      end: this.formatDate(this.endOfMonth(today)),
    };
  }

  /**
   * Get fiscal year dates (customize based on company settings)
   */
  public static getFiscalYear(
    year?: number,
    fiscalYearStart: number = 1,
  ): { start: string; end: string } {
    const targetYear = year || new Date().getFullYear();
    const start = new Date(targetYear, fiscalYearStart - 1, 1);
    const end = new Date(targetYear + 1, fiscalYearStart - 1, 0);

    return {
      start: this.formatDate(start),
      end: this.formatDate(end),
    };
  }

  /**
   * Format date for display
   */
  public static formatDisplay(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!this.isValid(d)) return String(date);

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthName = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();

    // Default format: "MMM dd, yyyy"
    if (formatStr === 'MMM dd, yyyy') {
      return `${monthName} ${day}, ${year}`;
    }

    // For other formats, just return ISO date
    return this.formatDate(d);
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
      current = this.addDays(current, direction);
      const dayOfWeek = current.getDay();

      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        remaining--;
      }
    }

    return this.formatDate(current);
  }
}
