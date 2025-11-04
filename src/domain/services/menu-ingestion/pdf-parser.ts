import "server-only";
import { PriceParser } from "./price-parser";
import { TextNormalizer } from "./text-normalizer";

type PdfParseResult = {
  numpages: number;
  text: string;
  info?: Record<string, unknown>;
};

type PdfParseFn = (
  buffer: Buffer,
  options?: { max?: number },
) => Promise<PdfParseResult>;

type PdfParseTextResult = { text: string; total: number };
type PdfParseInfoResult = { info?: Record<string, unknown> };

type PdfParseConstructor = new (options: { data: Buffer }) => {
  getText: (options?: { first?: number }) => Promise<PdfParseTextResult>;
  getInfo: () => Promise<PdfParseInfoResult>;
  destroy?: () => Promise<void>;
};

interface GlobalWithRequire {
  require?: (id: string) => unknown;
}

/**
 * Attempt to resolve a callable pdf-parse export from the loaded module.
 */
function resolvePdfParseExport(moduleExport: unknown): PdfParseFn | null {
  if (typeof moduleExport === "function") {
    return moduleExport as PdfParseFn;
  }

  if (
    typeof moduleExport === "object" &&
    moduleExport !== null &&
    "default" in moduleExport &&
    typeof (moduleExport as Record<string, unknown>).default === "function"
  ) {
    return (moduleExport as { default: PdfParseFn }).default;
  }

  const pdfParseClass =
    extractPdfParseClass(moduleExport) ??
    extractPdfParseClass(
      typeof moduleExport === "object" &&
        moduleExport !== null &&
        "default" in moduleExport
        ? (moduleExport as Record<string, unknown>).default
        : null,
    );

  if (pdfParseClass) {
    return createPdfParseWrapper(pdfParseClass);
  }

  return null;
}

/**
 * Narrow a Module export that exposes a PDFParse class.
 */
function extractPdfParseClass(moduleExport: unknown): PdfParseConstructor | null {
  if (
    typeof moduleExport === "object" &&
    moduleExport !== null &&
    "PDFParse" in moduleExport &&
    typeof (moduleExport as Record<string, unknown>).PDFParse === "function"
  ) {
    return (moduleExport as { PDFParse: PdfParseConstructor }).PDFParse;
  }

  return null;
}

/**
 * Wrap the new PDFParse class API (>=2.x) with the legacy function signature we rely on.
 */
function createPdfParseWrapper(PdfParseClass: PdfParseConstructor): PdfParseFn {
  return async (buffer: Buffer, options?: { max?: number }) => {
    const parser = new PdfParseClass({ data: buffer });

    try {
      const textOptions =
        typeof options?.max === "number" && options.max > 0
          ? { first: options.max }
          : undefined;

      const [textResult, infoResult] = await Promise.all([
        parser.getText(textOptions),
        parser.getInfo(),
      ]);

      return {
        numpages: textResult.total,
        text: textResult.text,
        info: infoResult.info,
      };
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    }
  };
}

/**
 * Load pdf-parse dynamically to support both CommonJS and modern ESM builds and
 * to ensure compatibility across legacy and new library APIs.
 */
async function loadPdfParse(): Promise<PdfParseFn> {
  try {
    const pdfParseModule = await import("pdf-parse");
    const resolved = resolvePdfParseExport(pdfParseModule);

    if (resolved) {
      return resolved;
    }

    const globalRequire =
      (globalThis as GlobalWithRequire).require ??
      // biome-ignore lint/security/noGlobalEval: we only probe for CommonJS require at runtime
      (() => {
        try {
          return eval("require") as ((id: string) => unknown) | undefined;
        } catch {
          return undefined;
        }
      })();

    if (globalRequire) {
      const requiredModule = globalRequire("pdf-parse");
      const requiredResolved = resolvePdfParseExport(requiredModule);

      if (requiredResolved) {
        return requiredResolved;
      }
    }

    throw new Error("Failed to load pdf-parse: no valid export found");
  } catch (error) {
    throw new Error(
      `Failed to load pdf-parse library: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Cache the loaded function so we only resolve the module once.
let pdfParseCache: PdfParseFn | null = null;

async function getPdfParse(): Promise<PdfParseFn> {
  if (!pdfParseCache) {
    pdfParseCache = await loadPdfParse();
  }

  return pdfParseCache;
}

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
      const pdfParse = await getPdfParse();
      const data = await pdfParse(buffer);

      const hasText = data.text !== undefined && data.text.trim().length > 0;
      const isTextNative = hasText && data.text.length > 100;

      if (!isTextNative) {
        warnings.push(
          "PDF appears to be scanned or image-based. OCR fallback needed.",
        );

        return {
          items: [],
          isTextNative: false,
          totalPages: data.numpages,
          warnings,
        };
      }

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

      if (!line.trim()) {
        continue;
      }

      if (TextNormalizer.isCategoryHeader(line)) {
        currentCategory = line;
        continue;
      }

      const price = PriceParser.parse(line);

      if (price && price.confidence >= 0.5) {
        const dishName = TextNormalizer.extractDishName(line);

        if (dishName.length > 2) {
          const item: ParsedItem = {
            dishName,
            dishNameNormalized: TextNormalizer.toSearchForm(dishName),
            priceEur: price.value,
            priceConfidence: price.confidence,
            category: currentCategory,
            rawText: line,
          };

          if (
            previousLine &&
            TextNormalizer.looksLikeDescription(previousLine)
          ) {
            item.description = previousLine;
          }

          items.push(item);
        }
      } else if (
        line.length > 50 &&
        TextNormalizer.looksLikeDescription(line)
      ) {
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
      const pdfParse = await getPdfParse();
      const data = await pdfParse(buffer, {
        max: 1,
      });

      return Boolean(data.text && data.text.trim().length > 100);
    } catch {
      return false;
    }
  }
}

