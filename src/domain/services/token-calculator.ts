import { Price } from "../value-objects/price";
import { TokenCount } from "../value-objects/token-count";

/**
 * Domain service for converting between Euros and Tokens
 * Business rule: 1 token ≈ €4.50
 */
export class TokenCalculator {
  private static readonly EURO_PER_TOKEN = 4.5;

  /**
   * Calculate token price from Euro price
   * Rounds to nearest integer, minimum 1 token
   */
  static calculateTokenPrice(price: Price): TokenCount {
    const tokenValue = Math.max(
      1,
      Math.round(price.value / this.EURO_PER_TOKEN),
    );
    return TokenCount.create(tokenValue);
  }

  /**
   * Calculate Euro equivalent of tokens
   */
  static calculateEuroValue(tokens: TokenCount): Price {
    return Price.create(Math.abs(tokens.value) * this.EURO_PER_TOKEN);
  }

  /**
   * Get the conversion rate
   */
  static getConversionRate(): number {
    return this.EURO_PER_TOKEN;
  }
}
