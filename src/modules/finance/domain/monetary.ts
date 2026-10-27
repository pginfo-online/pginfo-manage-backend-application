/**
 * Monetary utilities for Indian Rupee (INR) transactions.
 * All monetary values in the database and API are represented
 * as exact integer paise (1 INR = 100 paise).
 */
export class Monetary {
  /**
   * Converts rupees to integer paise.
   * e.g. 1500.50 INR -> 150050 paise
   */
  static toPaise(rupees: number): number {
    return Math.round(rupees * 100);
  }

  /**
   * Converts paise to rupees as float (used for display formatting only).
   * e.g. 150050 paise -> 1500.50 INR
   */
  static toRupees(paise: number): number {
    return paise / 100;
  }

  /**
   * Formats paise into an Indian Rupee string (e.g. "₹12,500.00").
   */
  static formatINR(paise: number): string {
    const rupees = this.toRupees(paise);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(rupees);
  }

  /**
   * Calculates late fee given base amount and daily fee percentage or fixed daily fee.
   * Rounded to nearest paise.
   */
  static calculateLateFee(dailyFeePaise: number, overdueDays: number): number {
    if (overdueDays <= 0) return 0;
    return Math.round(dailyFeePaise * overdueDays);
  }
}
