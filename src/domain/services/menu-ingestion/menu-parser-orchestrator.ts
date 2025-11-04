import "server-only";
import { createHash } from "node:crypto";
import { PdfValidator } from "./pdf-validator";
import { PdfParser, type ParsedItem } from "./pdf-parser";
import { OcrService } from "./ocr-service";
import { db } from "@/db";
import { menuParseBatch, menuParseItem } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Menu Parser Orchestrator
 * Main service for orchestrating PDF upload, parsing, and staging
 */

export interface UploadResult {
  batchId: number;
  status: string;
  message: string;
  warnings?: string[];
}

export interface ParseOptions {
  adminId: string;
  filename: string;
  buffer: Buffer;
  mimeType?: string;
}

export class MenuParserOrchestrator {
  /**
   * Upload and parse PDF menu
   * Main entry point for the ingestion pipeline
   */
  static async uploadAndParse(options: ParseOptions): Promise<UploadResult> {
    const { adminId, filename, buffer, mimeType } = options;

    try {
      // Step 1: Validate PDF
      const validation = await PdfValidator.validate(
        buffer,
        filename,
        mimeType,
      );
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.error}`);
      }

      // Step 2: Compute hash for deduplication
      const fileHash = this.computeHash(buffer);

      // Check for duplicate uploads
      const existing = await db
        .select()
        .from(menuParseBatch)
        .where(eq(menuParseBatch.fileHash, fileHash))
        .limit(1);

      if (existing.length > 0) {
        return {
          batchId: existing[0].id,
          status: "DUPLICATE",
          message: "This PDF has already been uploaded",
          warnings: ["Duplicate file detected"],
        };
      }

      // Step 3: Store file (in production, this would write to S3/storage)
      const sanitizedFilename = PdfValidator.sanitizeFilename(filename);
      const storagePath = PdfValidator.generateStoragePath(
        sanitizedFilename,
        fileHash,
      );

      // Step 4: Create batch record
      const [batch] = await db
        .insert(menuParseBatch)
        .values({
          uploadedByAdminId: adminId,
          filename: sanitizedFilename,
          fileHash,
          fileSize: buffer.length,
          filePath: storagePath,
          status: "PARSING",
        })
        .returning();

      // Step 5: Parse PDF
      try {
        const parseResult = await this.parseMenu(buffer, batch.id);

        // Update batch with results
        await db
          .update(menuParseBatch)
          .set({
            status: "PARSED",
            isTextNative: parseResult.isTextNative,
            parseLog: JSON.stringify({
              totalPages: parseResult.totalPages,
              itemsFound: parseResult.items.length,
              warnings: parseResult.warnings,
              metadata: parseResult.metadata,
            }),
          })
          .where(eq(menuParseBatch.id, batch.id));

        return {
          batchId: batch.id,
          status: "PARSED",
          message: `Successfully parsed ${parseResult.items.length} menu items`,
          warnings: [
            ...(validation.warnings || []),
            ...(parseResult.warnings || []),
          ],
        };
      } catch (parseError) {
        // Update batch with error
        await db
          .update(menuParseBatch)
          .set({
            status: "PARSE_FAILED",
            errorMessage:
              parseError instanceof Error
                ? parseError.message
                : "Unknown parse error",
          })
          .where(eq(menuParseBatch.id, batch.id));

        throw parseError;
      }
    } catch (error) {
      throw new Error(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Parse menu from PDF buffer
   */
  private static async parseMenu(
    buffer: Buffer,
    batchId: number,
  ): Promise<{
    items: ParsedItem[];
    isTextNative: boolean;
    totalPages: number;
    warnings?: string[];
    metadata?: Record<string, unknown>;
  }> {
    // Try text extraction first
    const parseResult = await PdfParser.parse(buffer);

    let items = parseResult.items;

    // If no text extracted, try OCR
    if (!parseResult.isTextNative || items.length === 0) {
      try {
        items = await OcrService.performOcr(buffer);
        parseResult.isTextNative = false;
        parseResult.warnings = parseResult.warnings || [];
        parseResult.warnings.push("Used OCR for text extraction");
      } catch (ocrError) {
        parseResult.warnings = parseResult.warnings || [];
        parseResult.warnings.push(
          `OCR failed: ${ocrError instanceof Error ? ocrError.message : "Unknown error"}`,
        );
      }
    }

    // Store parsed items in database
    if (items.length > 0) {
      // Only insert items that have a price
      const validItems = items.filter(
        (item): item is typeof item & { priceEur: number } =>
          item.priceEur !== undefined,
      );

      if (validItems.length > 0) {
        await db.insert(menuParseItem).values(
          validItems.map((item) => ({
            batchId,
            dishName: item.dishName,
            dishNameNormalized: item.dishNameNormalized,
            description: item.description || null,
            priceEur: item.priceEur.toString(),
            priceConfidence:
              item.priceConfidence !== undefined
                ? item.priceConfidence.toString()
                : null,
            category: item.category || null,
            pageNumber: item.pageNumber || 1,
            rawText: item.rawText,
            action: "PENDING" as const,
          })),
        );
      }
    }

    return parseResult;
  }

  /**
   * Compute SHA-256 hash of file
   */
  private static computeHash(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
  }
}
