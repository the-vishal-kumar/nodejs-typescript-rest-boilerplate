/**
 * Money arrives and leaves as JSON numbers with at most two decimals, but all
 * arithmetic runs on integer cents so no floating-point error can creep in.
 */
export default class Money {
  static toCents = (amount: number): number => Math.round(amount * 100);

  static fromCents = (cents: number): number => cents / 100;

  /**
   * Splits `amount` into `tenure` instalments: all equal except the last,
   * which absorbs the remainder, so they add up exactly
   * (10000 over 3 is 3333.33, 3333.33, 3333.34).
   */
  static split = (amount: number, tenure: number): number[] => {
    const total = Money.toCents(amount);
    const base = Math.floor(total / tenure);
    const last = total - base * (tenure - 1);
    return [...new Array<number>(tenure - 1).fill(base), last].map(Money.fromCents);
  };

  static add = (a: number, b: number): number => Money.fromCents(Money.toCents(a) + Money.toCents(b));

  static subtract = (a: number, b: number): number => Money.fromCents(Money.toCents(a) - Money.toCents(b));
}
