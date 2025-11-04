import "server-only";

/**
 * German Text Normalizer
 * Handles German-specific text normalization (Umlauts, ß, etc.)
 */

export class TextNormalizer {
  /**
   * Normalize German text for comparison and matching
   * Preserves Umlauts and ß in the output
   */
  static normalize(text: string): string {
    if (!text) return "";

    // Trim and collapse whitespace
    let normalized = text.trim().replace(/\s+/g, " ");

    // Remove soft hyphens and zero-width characters
    normalized = normalized.replace(/\u00AD/g, ""); // soft hyphen
    normalized = normalized.replace(/\u200B/g, ""); // zero-width space
    normalized = normalized.replace(/\u200C/g, ""); // zero-width non-joiner
    normalized = normalized.replace(/\u200D/g, ""); // zero-width joiner

    // Normalize Unicode to composed form (NFC)
    // This ensures consistent representation of accented characters
    normalized = normalized.normalize("NFC");

    return normalized;
  }

  /**
   * Create a search-friendly version (lowercase, trimmed)
   * Used for matching and deduplication
   */
  static toSearchForm(text: string): string {
    return this.normalize(text).toLowerCase();
  }

  /**
   * Extract dish name from menu line
   * Removes leading numbers, bullets, and trailing prices
   */
  static extractDishName(line: string): string {
    let name = this.normalize(line);

    // Remove leading numbers (e.g., "1. ", "12) ")
    name = name.replace(/^\d+[.)]\s*/, "");

    // Remove leading bullets or markers
    name = name.replace(/^[•\-*]\s*/, "");

    // Remove trailing price patterns (e.g., "8,50 €", "€ 12.50")
    name = name.replace(/\s*(?:€\s*)?\d{1,6}[,.]\d{2}\s*(?:€|EUR)?\s*$/i, "");
    name = name.replace(/\s*(?:€\s*)?\d{1,6}\s*(?:€|EUR)\s*$/i, "");

    return name.trim();
  }

  /**
   * Detect if text is likely a category header
   * Common German menu categories
   */
  static isCategoryHeader(line: string): boolean {
    const normalized = this.toSearchForm(line);

    const categoryPatterns = [
      /^vorspeisen?$/,
      /^hauptgerichte?$/,
      /^hauptspeisen?$/,
      /^beilagen?$/,
      /^salate?$/,
      /^suppen?$/,
      /^desserts?$/,
      /^nachspeisen?$/,
      /^nachtische?$/,
      /^getränke?$/,
      /^drinks?$/,
      /^pizza$/,
      /^pasta$/,
      /^fisch$/,
      /^fleisch$/,
      /^vegetarisch$/,
      /^vegan$/,
      /^alkoholfreie?\s+getränke$/,
      /^alkoholische?\s+getränke$/,
      /^warme?\s+getränke$/,
      /^kalt?e?\s+getränke$/,
    ];

    return categoryPatterns.some((pattern) => pattern.test(normalized));
  }

  /**
   * Split text into potential menu items
   * Handles line breaks and separators
   */
  static splitIntoLines(text: string): string[] {
    // Split by newlines, keeping only non-empty lines
    return text
      .split(/[\r\n]+/)
      .map((line) => this.normalize(line))
      .filter((line) => line.length > 0);
  }

  /**
   * Check if line looks like a description (longer text, no price)
   */
  static looksLikeDescription(line: string): boolean {
    const normalized = this.normalize(line);

    // Descriptions are usually longer
    if (normalized.length < 20) {
      return false;
    }

    // Descriptions typically don't start with numbers
    if (/^\d+[.)]/.test(normalized)) {
      return false;
    }

    // Descriptions don't have obvious price patterns
    if (/\d{1,6}[,.]\d{2}\s*€/.test(normalized)) {
      return false;
    }

    return true;
  }

  /**
   * Clean up OCR artifacts and common errors
   */
  static cleanOcrText(text: string): string {
    let cleaned = this.normalize(text);

    // Common OCR errors in German
    const replacements: Record<string, string> = {
      // Letter confusions
      "0": "O", // Context-dependent, be careful
      "1": "I", // Context-dependent
      "l": "I", // Context-dependent
      // Preserve German special characters
      "ae": "ä",
      "oe": "ö",
      "ue": "ü",
      "ss": "ß",
    };

    // Only apply selective replacements that make sense
    // This is a simplified version; real OCR cleanup would be more sophisticated

    return cleaned;
  }
}
