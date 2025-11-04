import "server-only";
import { PriceParser } from "./price-parser";
import { TextNormalizer } from "./text-normalizer";

// Dynamic import for pdf-parse since it doesn't have proper ES module support
const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
  options?: { max?: number },
) => Promise<{
  numpages: number;
  text: string;
  info?: Record<string, unknown>;
}>;

/**
 * PDF Parser Service
 * Extracts text and structured data from PDF files
 */

export interface ParsedItem {
  dishName: string;
  dishNameNormalized: string;
  description?: string;
  priceEur?: number;
  priceConfidence?: number;
  category?: string;
  pageNumber?: number;
  rawText: string;
}

export interface ParseResult {
  items: ParsedItem[];
  isTextNative: boolean;
  totalPages: number;
  metadata?: Record<string, unknown>;
  warnings?: string[];
}

export class PdfParser {
  /**
   * Parse PDF and extract menu items
   */
  static async parse(buffer: Buffer): Promise<ParseResult> {
    const warnings: string[] = [];

    try {
      // Parse PDF using pdf-parse
      const data = await pdfParse(buffer);

      // Check if PDF has extractable text
      const hasText = data.text && data.text.trim().length > 0;
      const isTextNative = hasText && data.text.length > 100; // Reasonable threshold

      if (!isTextNative) {
        warnings.push(
          "PDF appears to be scanned or image-based. OCR fallback needed.",
        );
        // Return early - OCR will be handled separately
        return {
          items: [],
          isTextNative: false,
          totalPages: data.numpages,
          warnings,
        };
      }

      // Extract items from text
      const items = this.extractItems(data.text);

      return {
        items,
        isTextNative: true,
        totalPages: data.numpages,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          creator: data.info?.Creator,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract menu items from text
   * Simple line-by-line parsing with price detection
   */
  private static extractItems(text: string): ParsedItem[] {
    const items: ParsedItem[] = [];
    const lines = TextNormalizer.splitIntoLines(text);

    let currentCategory: string | undefined;
    let previousLine: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      // Check if this is a category header
      if (TextNormalizer.isCategoryHeader(line)) {
        currentCategory = line;
        continue;
      }

      // Try to parse price from line
      const price = PriceParser.parse(line);

      if (price && price.confidence >= 0.5) {
        // This line has a price, likely a menu item
        const dishName = TextNormalizer.extractDishName(line);

        if (dishName.length > 2) {
          // Valid dish name
          const item: ParsedItem = {
            dishName,
            dishNameNormalized: TextNormalizer.toSearchForm(dishName),
            priceEur: price.value,
            priceConfidence: price.confidence,
            category: currentCategory,
            rawText: line,
          };

          // Check if previous line might be a description
          if (
            previousLine &&
            TextNormalizer.looksLikeDescription(previousLine)
          ) {
            item.description = previousLine;
          }

          items.push(item);
        }
      } else if (line.length > 50 && TextNormalizer.looksLikeDescription(line)) {
        // Might be a description for next item
        previousLine = line;
      } else {
        previousLine = undefined;
      }
    }

    return items;
  }

  /**
   * Detect if PDF is text-native or requires OCR
   * Quick check without full parsing
   */
  static async isTextNative(buffer: Buffer): Promise<boolean> {
    try {
      const data = await pdfParse(buffer, {
        max: 1, // Only parse first page
      });

      return Boolean(data.text && data.text.trim().length > 100);
    } catch {
      return false;
    }
  }
}
