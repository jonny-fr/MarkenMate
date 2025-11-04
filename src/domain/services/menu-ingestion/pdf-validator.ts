import "server-only";

/**
 * PDF Validation Service
 * Validates uploaded PDF files for security and integrity
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ["application/pdf"];
const PDF_MAGIC_NUMBERS = [
  Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export class PdfValidator {
  /**
   * Validate PDF file before processing
   * SECURITY: Input validation to prevent malicious uploads
   */
  static async validate(
    file: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<ValidationResult> {
    const warnings: string[] = [];

    // Check file size
    if (file.length === 0) {
      return { isValid: false, error: "File is empty" };
    }

    if (file.length > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      };
    }

    // Check filename
    if (!filename || filename.trim() === "") {
      return { isValid: false, error: "Filename is required" };
    }

    // Sanitize filename - remove path traversal attempts
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (sanitizedFilename !== filename) {
      warnings.push("Filename was sanitized to remove special characters");
    }

    // Check file extension
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return { isValid: false, error: "File must be a PDF" };
    }

    // Check MIME type if provided
    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        isValid: false,
        error: `Invalid MIME type: ${mimeType}. Expected: application/pdf`,
      };
    }

    // Check magic numbers (file signature)
    const hasPdfMagicNumber = PDF_MAGIC_NUMBERS.some((magic) =>
      file.subarray(0, magic.length).equals(magic),
    );

    if (!hasPdfMagicNumber) {
      return {
        isValid: false,
        error: "File does not appear to be a valid PDF (invalid file signature)",
      };
    }

    // Check for PDF trailer (basic structure validation)
    const pdfString = file.toString("latin1");
    if (!pdfString.includes("%%EOF")) {
      warnings.push(
        "PDF file may be corrupted (missing EOF marker). Parsing may fail.",
      );
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    // Remove directory traversal attempts and special characters
    const basename = filename.split(/[/\\]/).pop() || "unknown";
    return basename.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  /**
   * Generate safe storage path
   */
  static generateStoragePath(
    sanitizedFilename: string,
    hash: string,
  ): string {
    // Use hash to prevent collisions and organize files
    const prefix = hash.substring(0, 2);
    const timestamp = Date.now();
    return `menu-pdfs/${prefix}/${timestamp}_${hash.substring(0, 8)}_${sanitizedFilename}`;
  }
}
