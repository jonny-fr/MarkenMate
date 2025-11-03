/**
 * Price value object
 * Represents a monetary value with validation
 */
export class Price {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static create(value: number): Price {
    if (value < 0) {
      throw new Error("Price cannot be negative");
    }
    if (!Number.isFinite(value)) {
      throw new Error("Price must be a finite number");
    }
    return new Price(value);
  }

  static fromString(value: string): Price {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`Cannot parse price from: ${value}`);
    }
    return Price.create(parsed);
  }

  get value(): number {
    return this._value;
  }

  /**
   * Format as Euro string (e.g., "€12,50")
   */
  toEuroString(): string {
    return `€${this._value.toFixed(2).replace(".", ",")}`;
  }

  /**
   * Add two prices together
   */
  add(other: Price): Price {
    return Price.create(this._value + other._value);
  }

  /**
   * Multiply price by a factor
   */
  multiply(factor: number): Price {
    return Price.create(this._value * factor);
  }

  equals(other: Price): boolean {
    return Math.abs(this._value - other._value) < 0.001;
  }

  isGreaterThan(other: Price): boolean {
    return this._value > other._value;
  }

  toString(): string {
    return this._value.toFixed(2);
  }
}
