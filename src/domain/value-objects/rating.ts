/**
 * Rating value object
 * Represents a restaurant rating (0-5)
 */
export class Rating {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static create(value: number): Rating {
    if (value < 0 || value > 5) {
      throw new Error("Rating must be between 0 and 5");
    }
    if (!Number.isFinite(value)) {
      throw new Error("Rating must be a finite number");
    }
    return new Rating(value);
  }

  static fromString(value: string): Rating {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`Cannot parse rating from: ${value}`);
    }
    return Rating.create(parsed);
  }

  static unrated(): Rating {
    return new Rating(0);
  }

  get value(): number {
    return this._value;
  }

  get stars(): number {
    return Math.round(this._value);
  }

  equals(other: Rating): boolean {
    return Math.abs(this._value - other._value) < 0.01;
  }

  toString(): string {
    return this._value.toFixed(2);
  }
}
