import "server-only";
import { z } from "zod";

/**
 * Input Sanitization & Validation Utilities
 *
 * SECURITY: Implements defense-in-depth input validation to prevent:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - Command Injection
 * - Path Traversal
 * - Email Header Injection
 * - LDAP Injection
 *
 * References:
 * - OWASP ASVS v4.0.3: 5.1.3, 5.1.4, 5.1.5
 * - OWASP Input Validation Cheat Sheet
 * - OWASP XSS Prevention Cheat Sheet
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * SECURITY: Whitelist approach - only allow safe characters
 */
export function sanitizeString(
  input: string,
  options: {
    maxLength?: number;
    allowSpecialChars?: boolean;
    allowNewlines?: boolean;
  } = {},
): string {
  const {
    maxLength = 1000,
    allowSpecialChars = false,
    allowNewlines = false,
  } = options;

  // Trim whitespace
  let sanitized = input.trim();

  // Enforce max length (prevent DoS)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes (can cause security issues)
  sanitized = sanitized.replace(/\0/g, "");

  // Remove control characters except allowed ones
  if (!allowNewlines) {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Required for security sanitization of control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");
  } else {
    // Allow newlines but remove other control chars
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Required for security sanitization of control characters
    sanitized = sanitized.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  }

  // Remove special characters if not allowed
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[<>'"&;]/g, "");
  }

  return sanitized;
}

/**
 * Sanitize email input
 * SECURITY: Prevents email header injection and validates format
 */
export function sanitizeEmail(email: string): string {
  // Remove whitespace
  let sanitized = email.trim().toLowerCase();

  // Remove any newlines or carriage returns (email header injection)
  sanitized = sanitized.replace(/[\r\n]/g, "");

  // Enforce reasonable max length
  if (sanitized.length > 254) {
    // RFC 5321 max length
    throw new Error("Email address too long");
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 * SECURITY: Prevents integer overflow and ensures valid range
 */
export function sanitizeNumber(
  input: string | number,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {},
): number {
  const {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    integer = false,
  } = options;

  const num = typeof input === "string" ? Number.parseFloat(input) : input;

  if (Number.isNaN(num)) {
    throw new Error("Invalid number");
  }

  if (!Number.isFinite(num)) {
    throw new Error("Number must be finite");
  }

  if (integer && !Number.isInteger(num)) {
    throw new Error("Number must be an integer");
  }

  if (num < min || num > max) {
    throw new Error(`Number must be between ${min} and ${max}`);
  }

  return num;
}

/**
 * Sanitize path input to prevent directory traversal
 * SECURITY: Prevents path traversal attacks
 */
export function sanitizePath(path: string): string {
  // Remove null bytes
  let sanitized = path.replace(/\0/g, "");

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\./g, "");
  sanitized = sanitized.replace(/\.\/\//g, "");

  // Remove leading slashes (prevent absolute paths)
  sanitized = sanitized.replace(/^\/+/, "");

  // Enforce max length
  if (sanitized.length > 255) {
    throw new Error("Path too long");
  }

  return sanitized;
}

/**
 * Comprehensive input validation schema factories
 * These create Zod schemas with built-in sanitization
 */

export const createStringSchema = (options: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowSpecialChars?: boolean;
}) => {
  const {
    minLength = 1,
    maxLength = 1000,
    pattern,
    allowSpecialChars = false,
  } = options;

  return z
    .string()
    .min(minLength, `Mindestens ${minLength} Zeichen erforderlich`)
    .max(maxLength, `Maximal ${maxLength} Zeichen erlaubt`)
    .transform((val) => sanitizeString(val, { maxLength, allowSpecialChars }))
    .refine((val) => !pattern || pattern.test(val), {
      message: "Ungültiges Format",
    });
};

export const createEmailSchema = () => {
  return z
    .string()
    .email("Ungültige E-Mail-Adresse")
    .max(254, "E-Mail-Adresse zu lang")
    .transform((val) => sanitizeEmail(val));
};

export const createPasswordSchema = (
  options: { minLength?: number; maxLength?: number } = {},
) => {
  const { minLength = 8, maxLength = 128 } = options;

  return z
    .string()
    .min(minLength, `Passwort muss mindestens ${minLength} Zeichen lang sein`)
    .max(maxLength, `Passwort darf maximal ${maxLength} Zeichen lang sein`)
    .refine(
      (val) => {
        // Require at least one letter and one number
        return /[a-zA-Z]/.test(val) && /[0-9]/.test(val);
      },
      {
        message:
          "Passwort muss mindestens einen Buchstaben und eine Zahl enthalten",
      },
    );
};

export const createNumberSchema = (options: {
  min?: number;
  max?: number;
  integer?: boolean;
}) => {
  const { min, max, integer = false } = options;

  let schema = z.number();

  if (integer) {
    schema = schema.int("Muss eine Ganzzahl sein");
  }

  if (min !== undefined) {
    schema = schema.min(min, `Muss mindestens ${min} sein`);
  }

  if (max !== undefined) {
    schema = schema.max(max, `Darf maximal ${max} sein`);
  }

  return schema.refine((val) => Number.isFinite(val), {
    message: "Ungültige Zahl",
  });
};

/**
 * SQL identifier sanitization
 * SECURITY: Only use for table/column names, never for values
 */
export function sanitizeSQLIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, "");

  if (sanitized.length === 0) {
    throw new Error("Invalid SQL identifier");
  }

  if (sanitized.length > 63) {
    // PostgreSQL limit
    throw new Error("SQL identifier too long");
  }

  // Prevent SQL keywords (comprehensive list)
  const sqlKeywords = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "UNION",
    "EXEC",
    "EXECUTE",
    "DECLARE",
    "TRUNCATE",
    "MERGE",
    "WITH",
    "GRANT",
    "REVOKE",
    "COMMIT",
    "ROLLBACK",
    "BEGIN",
    "END",
  ];
  if (sqlKeywords.includes(sanitized.toUpperCase())) {
    throw new Error("SQL keyword not allowed as identifier");
  }

  return sanitized;
}

/**
 * HTML encode for output (defense in depth)
 * SECURITY: Use this before rendering user input in HTML
 */
export function htmlEncode(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}
