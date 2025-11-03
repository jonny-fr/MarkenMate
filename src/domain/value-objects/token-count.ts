/**
 * TokenCount value object
 * Represents a number of tokens (can be positive or negative)
 * Positive = lent to someone, Negative = borrowed from someone
 */
export class TokenCount {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static create(value: number): TokenCount {
    if (!Number.isInteger(value)) {
      throw new Error("Token count must be an integer");
    }
    if (!Number.isFinite(value)) {
      throw new Error("Token count must be finite");
    }
    return new TokenCount(value);
  }

  static zero(): TokenCount {
    return new TokenCount(0);
  }

  get value(): number {
    return this._value;
  }

  get isPositive(): boolean {
    return this._value > 0;
  }

  get isNegative(): boolean {
    return this._value < 0;
  }

  get isZero(): boolean {
    return this._value === 0;
  }

  get absoluteValue(): number {
    return Math.abs(this._value);
  }

  add(other: TokenCount): TokenCount {
    return TokenCount.create(this._value + other._value);
  }

  subtract(other: TokenCount): TokenCount {
    return TokenCount.create(this._value - other._value);
  }

  negate(): TokenCount {
    return TokenCount.create(-this._value);
  }

  equals(other: TokenCount): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }
}
