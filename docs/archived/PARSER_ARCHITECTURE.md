# Menu PDF Parser Architecture

## Overview

The Menu PDF Parser is a multi-stage pipeline that extracts structured menu data from PDF files. It supports both text-native PDFs and scanned documents, with special handling for German locale and currency formats.

## Architecture Diagram

```
┌─────────────────┐
│  PDF Upload     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validation     │ ← File size, type, signature checks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Hash & Store   │ ← SHA-256 hash, deduplication
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PDF Analysis   │ ← Detect text-native vs scanned
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│  Text  │  │  OCR   │
│Extract │  │(Tesser)│
└───┬────┘  └───┬────┘
    │           │
    └─────┬─────┘
          │
          ▼
   ┌──────────────┐
   │ Text         │
   │ Normalization│ ← Umlauts, whitespace, etc.
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Structure    │ ← Categories, sections
   │ Detection    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Price        │ ← German EUR parsing
   │ Extraction   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Item         │ ← Group name + price + desc
   │ Grouping     │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Staging DB   │ ← menu_parse_item table
   └──────────────┘
```

## Components

### 1. PDF Validator (`pdf-validator.ts`)

**Purpose**: Security and integrity checks before processing

**Responsibilities**:
- File size validation (max 50MB)
- MIME type verification
- Magic number (file signature) validation
- Filename sanitization
- Path traversal prevention

**Security Features**:
- Rejects files >50MB
- Validates PDF signature (`%PDF`)
- Checks for EOF marker
- Sanitizes filenames to prevent injection

**Output**: `ValidationResult` with success/error/warnings

### 2. PDF Parser (`pdf-parser.ts`)

**Purpose**: Extract raw text from text-native PDFs

**Technology**: `pdf-parse` library

**Algorithm**:
1. Parse PDF structure using pdf-parse
2. Extract text content
3. Determine if text-native (>100 chars threshold)
4. Split text into lines
5. Identify categories and sections
6. Match prices with dish names
7. Group related items

**Limitations**:
- Simple line-by-line parsing
- No advanced table detection
- Assumes standard left-to-right layout

### 3. OCR Service (`ocr-service.ts`)

**Purpose**: Extract text from scanned/image-based PDFs

**Technology**: Tesseract.js with German language pack

**Process**:
1. Detect that PDF is image-based
2. Initialize Tesseract worker with `deu` language
3. Process PDF pages as images
4. Extract text with bounding boxes
5. Clean up OCR artifacts
6. Apply same parsing logic as text extraction

**Note**: Currently simplified; full implementation would include PDF-to-image conversion per page.

### 4. Price Parser (`price-parser.ts`)

**Purpose**: Extract and normalize German EUR prices

**Supported Formats**:
- `8,50` (comma decimal)
- `8,50 €`
- `€ 8,50`
- `8.50` (dot decimal, also accepted)
- `8 €` (whole numbers)
- `8,50 EUR`

**Algorithm**:
1. Apply regex patterns for various formats
2. Parse major and minor units
3. Compute confidence score (0.0-1.0)
4. Sanity check (€1-€1000 range)
5. Boost confidence if currency symbol present

**Confidence Factors**:
- Format match quality: 0.7-0.95
- Currency symbol present: +0.1
- Out of range: ×0.5
- OCR source: ×0.8

### 5. Text Normalizer (`text-normalizer.ts`)

**Purpose**: Clean and standardize German text

**Operations**:
- Whitespace normalization
- Remove soft hyphens and zero-width chars
- Unicode NFC normalization (for umlauts)
- Category detection
- Dish name extraction
- Description detection

**German Support**:
- Preserves: ä, ö, ü, ß
- Category detection: "Hauptgerichte", "Getränke", "Desserts", etc.
- Handles compound words

### 6. Menu Parser Orchestrator (`menu-parser-orchestrator.ts`)

**Purpose**: Main coordinator for the entire pipeline

**Workflow**:
1. **Validate** → PdfValidator
2. **Hash** → SHA-256 for deduplication
3. **Check Duplicates** → Query DB by hash
4. **Store** → Create batch record
5. **Parse** → PdfParser or OcrService
6. **Store Items** → Insert to staging DB
7. **Update Status** → PARSED or PARSE_FAILED

**Error Handling**:
- Transactional updates
- Status tracking at each stage
- Error messages stored in batch
- Warnings collected and logged

## Data Flow

### Database Schema

#### `menu_parse_batch`
- Tracks upload and parsing lifecycle
- Stores metadata, status, logs
- References uploader and approver admins
- Links to assigned restaurant

#### `menu_parse_item`
- Staging area for parsed dishes
- Stores original + normalized data
- Tracks confidence scores
- Records page numbers and bounding boxes
- Action state (PENDING/ACCEPT/EDIT/REJECT)

#### `menu_item`
- Production menu table
- Populated during publish phase
- Upsert logic based on dish name

### Parsing Pipeline States

```
UPLOADED → PARSING → PARSED → CHANGES_PROPOSED → APPROVED → PUBLISHING → PUBLISHED
                 ↓
            PARSE_FAILED
```

## German Locale Support

### Price Parsing

German EUR format uses comma as decimal separator:
- `8,50 €` (standard)
- `€12,50` (alternative)

Parser accepts both comma and dot, converts to standard `numeric` type.

### Text Normalization

- **Umlauts**: ä, ö, ü preserved using Unicode NFC
- **Eszett**: ß handled correctly
- **Compound Words**: Recognized as single tokens
- **Category Names**: German menu sections detected

### OCR Language

Tesseract uses `deu` language pack for German-specific character recognition.

## Performance Considerations

### Text-Native PDFs
- **Speed**: Fast (< 1 second for typical menu)
- **Accuracy**: High (95%+ for well-formatted PDFs)
- **Memory**: Low (~10MB per PDF)

### Scanned PDFs
- **Speed**: Slow (10-30 seconds depending on pages)
- **Accuracy**: Medium (70-90% depending on scan quality)
- **Memory**: High (~50-100MB during OCR)

### Optimizations
- Single-threaded OCR (resource-constrained)
- Lazy loading of OCR worker
- Batch database inserts
- Indexed hash lookups for deduplication

## Error Handling

### Validation Errors
- File too large → User notification
- Invalid PDF → Reject immediately
- Corrupted file → Error logged

### Parsing Errors
- Empty text → Try OCR fallback
- No prices found → Warning, accept zero items
- Low confidence → Warning, flag for review

### OCR Errors
- Worker failure → Logged, batch marked PARSE_FAILED
- Timeout → Graceful degradation
- Low quality → Lower confidence scores

## Security Architecture

### Input Validation
- **File Size**: Hard limit at 50MB
- **MIME Type**: Verified against whitelist
- **Magic Numbers**: Checked for genuine PDFs
- **Filename**: Sanitized to prevent injection

### Isolation
- **Server-Only**: All parsing done server-side
- **No Client Upload**: Files never touch client storage
- **Sandboxed**: OCR runs in isolated worker

### Audit Trail
- Every upload logged with user ID
- Parse results and errors logged
- Approval/rejection logged
- Full traceability

### Data Minimization
- No PII extracted or stored
- Only menu data retained
- Original PDFs stored for reference but not exposed

## Extensibility

### Adding Language Support
1. Add language pack to Tesseract
2. Extend category detection patterns
3. Add locale-specific price formats
4. Update text normalizer

### Adding Table Detection
1. Integrate pdfplumber table extraction
2. Map table cells to item fields
3. Handle multi-column layouts
4. Preserve spatial relationships

### Adding AI/ML
1. Train model on menu datasets
2. Improve category classification
3. Better price-to-item matching
4. Confidence calibration

## Testing Strategy

### Unit Tests
- PDF validator edge cases
- Price parser with various formats
- Text normalizer with umlauts
- Duplicate detection

### Integration Tests
- Full pipeline with sample PDFs
- Text-native vs scanned
- German vs other locales
- Error conditions

### Performance Tests
- Large PDFs (100+ pages)
- OCR throughput
- Database insert performance
- Concurrent uploads

## Known Limitations

1. **Table Detection**: Limited to line-by-line parsing
2. **Multi-Column**: May not handle complex layouts
3. **Handwritten**: No support for handwritten menus
4. **Price Ranges**: "€8-12" not handled (extracts first)
5. **Grouped Pricing**: "All items €8" not associated automatically
6. **Language**: Optimized for German only
7. **Images**: Dish images not extracted

## Future Improvements

1. **Advanced Layout Analysis**: Use pdfplumber for tables
2. **ML-Based Classification**: Train model for categories
3. **Multi-Language**: Support English, French, etc.
4. **Real-Time Preview**: Show parsing results before upload
5. **Incremental Updates**: Update only changed items
6. **Duplicate Dish Detection**: Match similar dish names
7. **Price History**: Track price changes over time
8. **Batch Operations**: Bulk approve/reject

## References

- pdf-parse: https://www.npmjs.com/package/pdf-parse
- Tesseract.js: https://tesseract.projectnaptha.com/
- German Locale (de-DE): https://www.npmjs.com/package/intl
- Unicode NFC Normalization: https://unicode.org/reports/tr15/
