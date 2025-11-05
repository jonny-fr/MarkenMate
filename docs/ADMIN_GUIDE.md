# Admin Guide: Menu PDF Ingestion System

## Overview

The Menu PDF Ingestion System allows administrators to upload restaurant menus as PDF files, which are automatically parsed and reviewed before being published to the application. The system supports both text-native PDFs and scanned documents (via OCR).

## Features

- **PDF Upload**: Drag-and-drop or file browser upload for PDF menus
- **Automatic Parsing**: Extract dish names, prices, categories, and descriptions
- **German Locale Support**: Recognizes German EUR formats (e.g., 8,50 €) and preserves Umlauts (ä, ö, ü, ß)
- **OCR Fallback**: Automatically uses OCR for scanned PDFs
- **Review Workflow**: Review and approve/reject parsed items before publishing
- **Restaurant Assignment**: Assign menus to existing restaurants or create new ones
- **Duplicate Handling**: Detects duplicates by file hash
- **Audit Logging**: All operations are logged for compliance

## How to Use

### 1. Upload a Menu PDF

1. Navigate to **Admin Panel** → **Menü-Uploads**
2. Click or drag-and-drop a PDF file into the upload area
3. Wait for the upload and parsing to complete
4. The batch will appear in the "Recent Uploads" list

#### Supported PDF Formats

- Text-native PDFs (preferred for accuracy)
- Scanned PDFs (OCR will be applied automatically)
- Maximum file size: 50MB

### 2. Review Parsed Items

1. Click the **Review** button next to a batch in the uploads list
2. Review the batch information:
   - Filename and size
   - Parse method (text or OCR)
   - Number of items found
   - Any warnings or errors

### 3. Assign Restaurant

Before approving a batch, you must assign it to a restaurant:

1. In the **Restaurant Assignment** section, select an existing restaurant from the dropdown
2. Click **Assign** to link the batch to the restaurant
3. Alternatively, click **New Restaurant** to create a new restaurant inline

#### Creating a New Restaurant

1. Click **New Restaurant**
2. Fill in the required fields:
   - **Restaurant Name**: e.g., "Pizzeria Roma"
   - **Location**: Full address
   - **Cuisine Type**: e.g., "Italian", "Chinese"
   - **Phone Number** (optional)
3. Click **Create Restaurant**
4. The new restaurant will be automatically selected

### 4. Review Menu Items

Review each parsed item in the table:

- **Dish Name**: The name extracted from the PDF
- **Price**: Price in EUR (German format)
- **Category**: Detected category (if available)
- **Confidence**: Parser confidence score (higher is better)
- **Description**: Additional text found near the item

For each item, choose an action:

- **✓ Accept**: Include this item in the menu
- **✎ Edit**: Modify the item (future feature)
- **✗ Reject**: Exclude this item from the menu

### 5. Approve and Publish

Once you've reviewed all items:

1. Click **Approve & Publish** to publish accepted items to the menu
2. The system will:
   - Insert new menu items
   - Update existing items (matched by dish name)
   - Log all changes in the audit log
3. The batch status will change to **PUBLISHED**

### 6. Reject a Batch

If the parsing quality is poor or the menu is incorrect:

1. Click **Reject Batch**
2. Provide a reason for rejection
3. The batch will be marked as **REJECTED**

## Batch Statuses

| Status | Description |
|--------|-------------|
| **UPLOADED** | PDF uploaded, awaiting parsing |
| **PARSING** | Currently being parsed |
| **PARSED** | Parsing complete, ready for review |
| **PARSE_FAILED** | Parsing failed (see error message) |
| **CHANGES_PROPOSED** | Restaurant assigned, awaiting approval |
| **APPROVED** | Approved by admin, awaiting publish |
| **PUBLISHING** | Currently publishing to menu |
| **PUBLISHED** | Successfully published to menu |
| **REJECTED** | Rejected by admin |

## Best Practices

### For Best Parsing Results

1. **Use Text-Native PDFs**: These parse more accurately than scanned PDFs
2. **Clear Formatting**: PDFs with clear structure and consistent pricing format
3. **German Format**: Ensure prices use comma decimal separator (8,50 €)
4. **Standard Layout**: Single or two-column layouts work best

### Quality Assurance

1. **Review All Items**: Don't approve without reviewing each item
2. **Check Prices**: Verify that prices parsed correctly (watch confidence scores)
3. **Verify Categories**: Ensure categories make sense for your menu structure
4. **Spot-Check**: Compare a few items against the original PDF

### Security

1. **Admin Only**: This feature is restricted to admin users
2. **Audit Trail**: All uploads, approvals, and rejections are logged
3. **File Validation**: PDFs are validated before processing
4. **Duplicate Detection**: Duplicate files are rejected automatically

## Troubleshooting

### Parsing Failed

**Problem**: Batch status shows PARSE_FAILED

**Solutions**:
- Check the error message in the batch detail view
- Verify the PDF is not corrupted
- Ensure the PDF is not password-protected
- Try a different PDF or re-export from the source

### Low Confidence Scores

**Problem**: Price confidence scores are low (<70%)

**Solutions**:
- Use text-native PDFs instead of scans
- Manually review items with low confidence
- Reject items that appear incorrect

### Wrong Prices

**Problem**: Prices are parsed incorrectly

**Solutions**:
- Check that the PDF uses standard German format (comma decimal)
- Look for unusual formatting (e.g., price ranges, "ab €8,50")
- Reject items with incorrect prices
- Consider manual entry for problematic items

### OCR Quality Issues

**Problem**: Scanned PDF parsing is poor

**Solutions**:
- Use higher quality scans (300+ DPI recommended)
- Ensure the scan is straight and well-lit
- Try obtaining a text-native PDF instead
- Consider manual entry for critical items

## Limitations

- **OCR Accuracy**: Scanned PDFs may have lower accuracy
- **Complex Layouts**: Multi-column or table-heavy menus may not parse perfectly
- **Language**: Optimized for German; other languages may have lower accuracy
- **File Size**: Maximum 50MB per PDF
- **Manual Editing**: In-app editing of items is not yet available (approve/reject only)

## Support

For issues or questions:

1. Check the error message in the batch detail view
2. Review the parse log for warnings
3. Contact the system administrator
4. Report bugs or feature requests through your issue tracking system

## Security & Compliance

- **RBAC**: Only admin users can access this feature
- **Audit Logs**: All operations are logged with timestamps and user IDs
- **File Storage**: PDFs are stored securely with hash-based deduplication
- **Data Protection**: No PII is stored in the parsing process
- **GDPR Compliance**: System follows GDPR principles for data handling

## API Reference

For developers integrating with the system:

- **Upload**: `POST /api/admin/menu-upload`
- **Assign Restaurant**: `POST /api/admin/menu-batches/[id]/assign`
- **Approve**: `POST /api/admin/menu-batches/[id]/approve`
- **Reject**: `POST /api/admin/menu-batches/[id]/reject`
- **Create Restaurant**: `POST /api/admin/restaurants`

All endpoints require admin authentication and return JSON responses.
