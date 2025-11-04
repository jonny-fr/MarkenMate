import "server-only";
import { createWorker, type Worker } from "tesseract.js";
import { PriceParser } from "./price-parser";
import { TextNormalizer } from "./text-normalizer";
import type { ParsedItem } from "./pdf-parser";

/**
 * OCR Service for Scanned PDFs
 * Uses Tesseract.js with German language pack
 */

export class OcrService {
  private static worker: Worker | null = null;

  /**
   * Initialize OCR worker with German language
   */
  private static async getWorker(): Promise<Worker> {
    if (!this.worker) {
      this.worker = await createWorker("deu", 1, {
        // German language
        errorHandler: (err) => console.error("OCR Error:", err),
      });
    }
    return this.worker;
  }

  /**
   * Perform OCR on PDF buffer
   * Note: This is a simplified version. Full implementation would:
   * - Convert PDF pages to images
   * - Process each page separately
   * - Handle multi-column layouts
   */
  static async performOcr(buffer: Buffer): Promise<ParsedItem[]> {
    try {
      const worker = await this.getWorker();

      // In a real implementation, we would:
      // 1. Convert PDF to images (using pdf-lib or similar)
      // 2. Process each page
      // 3. Extract text with bounding boxes
      // For now, we'll recognize that the PDF is image-based

      // Convert buffer to image (simplified - assumes single page or first page)
      // This is a placeholder - real implementation would handle PDF->Image conversion
      const { data } = await worker.recognize(buffer);

      const text = data.text;

      // Extract items from OCR text
      return this.extractItemsFromOcrText(text);
    } catch (error) {
      throw new Error(
        `OCR failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract menu items from OCR text
   */
  private static extractItemsFromOcrText(text: string): ParsedItem[] {
    const items: ParsedItem[] = [];
    const lines = TextNormalizer.splitIntoLines(text);

    let currentCategory: string | undefined;

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      // Clean up OCR artifacts
      const cleaned = TextNormalizer.cleanOcrText(line);

      // Check for category
      if (TextNormalizer.isCategoryHeader(cleaned)) {
        currentCategory = cleaned;
        continue;
      }

      // Try to parse price
      const price = PriceParser.parse(cleaned);

      if (price && price.confidence >= 0.4) {
        // Lower threshold for OCR
        const dishName = TextNormalizer.extractDishName(cleaned);

        if (dishName.length > 2) {
          items.push({
            dishName,
            dishNameNormalized: TextNormalizer.toSearchForm(dishName),
            priceEur: price.value,
            priceConfidence: price.confidence * 0.8, // Reduce confidence for OCR
            category: currentCategory,
            rawText: line,
          });
        }
      }
    }

    return items;
  }

  /**
   * Cleanup worker
   */
  static async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
