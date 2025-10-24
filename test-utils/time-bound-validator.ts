/**
 * Time-Bound Validator
 *
 * Purpose: Validate time-boundedness of objectives and key results
 *
 * Acceptable Formats:
 * - Quarterly: "by Q1 2024", "by end of Q2 2024"
 * - Monthly: "by March 2024", "by end of January 2025"
 * - Half-year: "by H1 2024", "by end of H2 2025"
 *
 * Unacceptable Formats:
 * - No timeframe: "Achieve 40% MAU"
 * - Vague: "soon", "eventually", "next quarter" (without year)
 * - Past dates: "by Q1 2023" (when current is 2024)
 */

export interface TimeBoundValidation {
  isValid: boolean;
  format: 'quarterly' | 'monthly' | 'half-year' | null;
  parsedDate: {
    quarter?: number;
    month?: number;
    half?: number;
    year?: number;
  } | null;
  issues: string[];
}

export class TimeBoundValidator {
  /**
   * Validate time-boundedness of text (objective or key result)
   */
  validateTimeBound(text: string): TimeBoundValidation {
    const result: TimeBoundValidation = {
      isValid: false,
      format: null,
      parsedDate: null,
      issues: []
    };

    // Pattern 1: Quarterly (Q1-Q4 + year)
    const quarterMatch = text.match(/by\s+(end\s+of\s+)?Q([1-4])\s+(\d{4})/i);
    if (quarterMatch) {
      const quarter = parseInt(quarterMatch[2]);
      const year = parseInt(quarterMatch[3]);
      if (this.isValidFutureDate('quarter', quarter, year)) {
        result.isValid = true;
        result.format = 'quarterly';
        result.parsedDate = { quarter, year };
        return result;
      } else {
        result.issues.push('Date appears to be in the past');
      }
    }

    // Pattern 2: Monthly (Month name + year)
    const monthMatch = text.match(/by\s+(end\s+of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (monthMatch) {
      const month = this.monthNameToNumber(monthMatch[2]);
      const year = parseInt(monthMatch[3]);
      if (this.isValidFutureDate('month', month, year)) {
        result.isValid = true;
        result.format = 'monthly';
        result.parsedDate = { month, year };
        return result;
      } else {
        result.issues.push('Date appears to be in the past');
      }
    }

    // Pattern 3: Half-year (H1/H2 + year)
    const halfYearMatch = text.match(/by\s+(end\s+of\s+)?H([12])\s+(\d{4})/i);
    if (halfYearMatch) {
      const half = parseInt(halfYearMatch[2]);
      const year = parseInt(halfYearMatch[3]);
      if (this.isValidFutureDate('half', half, year)) {
        result.isValid = true;
        result.format = 'half-year';
        result.parsedDate = { half, year };
        return result;
      } else {
        result.issues.push('Date appears to be in the past');
      }
    }

    // Pattern 4: Detect vague timeframes
    const vaguePatterns = [
      { pattern: /\b(soon|eventually|sometime|later)\b/i, name: 'vague term' },
      { pattern: /\b(next quarter|this quarter|this year)\b/i, name: 'relative without year' }
    ];

    for (const { pattern, name } of vaguePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.issues.push(`Vague timeframe detected: "${match[0]}"`);
      }
    }

    // If no valid format found
    if (!result.isValid && result.issues.length === 0) {
      result.issues.push('No timeframe detected');
    }

    return result;
  }

  /**
   * Check if date is in the future (or current period)
   */
  private isValidFutureDate(type: 'quarter' | 'month' | 'half', period: number, year: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

    // Future year is always valid
    if (year > currentYear) return true;

    // Past year is never valid
    if (year < currentYear) return false;

    // Current year - check period
    if (type === 'quarter') {
      return period >= currentQuarter;
    } else if (type === 'month') {
      return period >= currentMonth;
    } else if (type === 'half') {
      const currentHalf = currentMonth <= 6 ? 1 : 2;
      return period >= currentHalf;
    }

    return false;
  }

  /**
   * Convert month name to number (1-12)
   */
  private monthNameToNumber(monthName: string): number {
    const months: Record<string, number> = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    return months[monthName.toLowerCase()] || 0;
  }

  /**
   * Get a human-readable description of the timeframe
   */
  getTimeframeDescription(validation: TimeBoundValidation): string {
    if (!validation.isValid) {
      return validation.issues.join(', ');
    }

    const { format, parsedDate } = validation;
    if (!parsedDate) return 'Unknown timeframe';

    if (format === 'quarterly') {
      return `Q${parsedDate.quarter} ${parsedDate.year}`;
    } else if (format === 'monthly') {
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[parsedDate.month!]} ${parsedDate.year}`;
    } else if (format === 'half-year') {
      return `H${parsedDate.half} ${parsedDate.year}`;
    }

    return 'Unknown timeframe';
  }
}
