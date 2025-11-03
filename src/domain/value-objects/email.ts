/**
 * Email value object
 * Represents a validated email address
 */
export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): Email {
    if (!Email.isValid(value)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    return new Email(value.toLowerCase().trim());
  }

  static isValid(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
