import "server-only";

/**
 * German-locale EUR Price Parser
 * Handles German price formats with comma decimal separators
 */

export interface ParsedPrice {
  value: number; // Normalized to number (e.g., 8.50)
  confidence: number; // 0.0 to 1.0
  rawText: string;
  format: string; // e.g., "8,50 €", "€ 12,50"
}

export class PriceParser {
  /**
   * Parse German EUR price formats
   * Accepts: 8,50 | €8,50 | 8,50€ | 8.50 | € 12,50 | 12,50 EUR etc.
   */
  static parse(text: string): ParsedPrice | null {
    if (!text || typeof text !== "string") {
      return null;
    }

    const trimmed = text.trim();

    // Price pattern for German locale
    // Matches: optional € symbol, digits with optional comma/dot separator, optional € or EUR suffix
    const patterns = [
      // With comma (German standard): 8,50 | 8,50 € | € 8,50
      /(?:€\s*)?(\d{1,6}),(\d{2})\s*(?:€|EUR)?/i,
      // With dot (also accepted): 8.50 | 8.50 € | € 8.50
      /(?:€\s*)?(\d{1,6})\.(\d{2})\s*(?:€|EUR)?/i,
      // Whole numbers: 8 € | € 8
      /(?:€\s*)?(\d{1,6})\s*(?:€|EUR)/i,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        let euros = 0;
        let cents = 0;
        let confidence = 0.8;

        if (match[2] !== undefined) {
          // Has decimal part
          euros = Number.parseInt(match[1], 10);
          cents = Number.parseInt(match[2], 10);
          confidence = 0.95;
        } else {
          // Whole number only
          euros = Number.parseInt(match[1], 10);
          cents = 0;
          confidence = 0.7;
        }

        // Sanity check
        if (Number.isNaN(euros) || Number.isNaN(cents)) {
          continue;
        }

        if (euros < 0 || euros > 10000 || cents < 0 || cents > 99) {
          // Out of reasonable range
          confidence *= 0.5;
        }

        const value = euros + cents / 100;

        // Increase confidence if currency symbol is present
        if (trimmed.includes("€") || trimmed.toUpperCase().includes("EUR")) {
          confidence = Math.min(1.0, confidence + 0.1);
        }

        return {
          value,
          confidence,
          rawText: trimmed,
          format: trimmed,
        };
      }
    }

    return null;
  }

  /**
   * Format price to German locale string
   */
  static format(value: number): string {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  /**
   * Batch parse prices from text
   * Extracts all price-like patterns
   */
  static extractPrices(text: string): ParsedPrice[] {
    const prices: ParsedPrice[] = [];

    // Split by newlines and common separators
    const lines = text.split(/[\n\r]+/);

    for (const line of lines) {
      const price = this.parse(line);
      if (price && price.confidence >= 0.5) {
        prices.push(price);
      }
    }

    return prices;
  }

  /**
   * Validate price is within reasonable bounds for menu items
   */
  static isReasonableMenuPrice(value: number): boolean {
    return value >= 0.5 && value <= 1000;
  }
}
