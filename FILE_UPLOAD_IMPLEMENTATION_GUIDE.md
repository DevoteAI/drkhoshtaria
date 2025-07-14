# File Upload and Processing Implementation Guide

This guide provides comprehensive instructions for replicating the multi-format file upload and processing system with Flowise API integration.

## Overview

The system implements a sophisticated file processing pipeline that:
- Extracts text from PDFs (with OCR fallback for scanned documents)
- Compresses large images for optimal API performance
- Handles multiple file types with a unified processing approach
- Integrates seamlessly with Flowise AI backend

## Architecture Components

### 1. PDF Text Extraction (`pdfTextExtractor.ts`)

**Purpose**: Extract text from PDF files using PDF.js with automatic OCR fallback for image-based PDFs.

**Key Features**:
- Uses PDF.js for standard text extraction
- Automatic detection of image-based PDFs
- OCR fallback using Tesseract.js
- Multi-language support (Georgian, Russian, English)
- Character encoding fixes for special fonts (e.g., Sylfaen)
- Progress tracking with detailed stage information

**Implementation Details**:

```typescript
// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Main extraction function
export async function extractTextFromPdf(
  file: File, 
  onProgress?: (progress: ProgressInfo) => void
): Promise<PdfTextExtractionResult>
```

**Critical Logic**:
1. Load PDF with enhanced Unicode support
2. Extract text from each page using getTextContent()
3. Apply character encoding fixes for Georgian/Russian text
4. If no text found, check for text operators
5. Fall back to OCR if needed
6. Truncate text to fit API token limits (25,000 tokens)

### 2. OCR Processing (`ocrExtractor.ts`)

**Purpose**: Extract text from image-based PDFs using optical character recognition.

**Key Features**:
- Converts PDF pages to images using canvas
- Optimizes image resolution for OCR accuracy
- Multi-language OCR (English, Russian, Georgian)
- Progress tracking with time estimates
- Memory-efficient processing

**Implementation Details**:

```typescript
export async function extractTextFromPdfWithOCR(
  file: File, 
  onProgress?: (progress: ProgressInfo) => void
): Promise<OcrExtractionResult>
```

**Processing Steps**:
1. Load PDF and determine optimal scale
2. Render each page to canvas
3. Convert canvas to image blob/data URL
4. Run Tesseract OCR with language pack 'eng+rus+kat'
5. Aggregate text from all pages
6. Calculate confidence scores

### 3. Unified File Upload Pipeline (`fileUpload.ts`)

**Purpose**: Central processing hub for all file types with intelligent routing.

**Key Features**:
- File type detection and validation
- Automatic routing: PDFs → text extraction, Images → compression, Others → direct upload
- Progress tracking across all processing stages
- Error handling with graceful fallbacks

**Core Functions**:

```typescript
export async function processFileForUpload(
  file: File, 
  onProgress?: (progress: ProgressInfo) => void
): Promise<Attachment>
```

**Processing Flow**:
1. **PDFs**: Extract text → Store as plain text (not base64)
2. **Images > 2MB**: Compress to max 500KB while maintaining quality
3. **Other files**: Convert to base64 data URL

### 4. Flowise API Integration (`chat.ts`)

**Purpose**: Handle communication with Flowise AI backend with proper attachment formatting.

**Key Implementation**:

```typescript
export async function fetchAIResponse(
  message: string,
  sessionId: string,
  attachments: Attachment[] = []
): Promise<ChatApiResponse>
```

**Critical Logic**:
1. Separate text content from file uploads
2. Append extracted PDF text directly to the question
3. Send images/audio as file uploads with base64 data
4. Handle various HTTP error codes gracefully

## Georgian Text Extraction with Sylfaen Font

### Understanding the Challenge

Georgian PDFs using Sylfaen font often have character encoding issues where Georgian characters are mapped incorrectly. For example:
- "მშობიარობის" appears as "ლქოთპსოთპთ"
- "სავარაუდო" appears as "სავაპასდო"
- "ფეტომეტრია" appears as "ტეპოლეპთა"

### Character Mapping Solution

The system implements a comprehensive character mapping system to fix these encoding issues:

```typescript
// Character mappings for Sylfaen Georgian font
const sylfaenGeorgianMappings = {
  // Characters that change (based on actual document analysis)
  'ნ': 'მ',   // მ→ნ (reversed for decoding)
  'ძ': 'შ',   // შ→ძ (reversed for decoding)
  'ჟ': 'ო',   // ო→ჟ (reversed for decoding)
  'კ': 'ი',   // ი→კ (reversed for decoding)
  'ტ': 'რ',   // რ→ტ (reversed for decoding)
  // ... more mappings
};

// Word-level mappings for medical terms
const specificWordMappings = {
  'ლქოთპსოთპთ': 'მშობიარობის',     // pregnancy
  'სავაპასდო': 'სავარაუდო',         // estimated
  'ტეპოლეპთა': 'ფეტომეტრია',       // fetometry
  'თავთს': 'თავის',                 // head (genitive)
  'ბთპაპთეპალსპთ': 'ბიპარიეტალური', // biparietal
  // ... extensive medical terminology mappings
};
```

### Implementation Strategy

1. **Pattern Detection**: First detect if text contains Sylfaen encoding patterns
2. **Word-Level Mapping**: Apply word mappings first (most reliable)
3. **Character-Level Mapping**: Apply character mappings for remaining text
4. **Latin Extended Handling**: Convert Latin Extended characters to Georgian

```typescript
function fixMultiLanguageEncoding(text: string): string {
  // Detect language and encoding patterns
  if (hasSylfaenGeorgianPatterns(text)) {
    // Apply word mappings first
    for (const [incorrect, correct] of Object.entries(specificWordMappings)) {
      text = text.replace(new RegExp(incorrect, 'g'), correct);
    }
    
    // Apply character mappings if needed
    // Only apply to text that still has encoding issues
  }
  
  return text;
}
```

## Image Processing and Sending to Flowise

### Image Compression Strategy

Large images are automatically compressed to optimize API performance:

```typescript
async function compressImageIfNeeded(file: File, maxSizeKB: number = 500): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  // Calculate optimal dimensions
  const maxWidth = 1024;
  const maxHeight = 1024;
  
  // Resize maintaining aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }
  
  // Try different quality levels until size is acceptable
  const tryCompress = (quality: number): void => {
    canvas.toBlob((blob) => {
      if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
        // Convert to base64 data URL
        const reader = new FileReader();
        reader.readAsDataURL(blob);
      } else {
        tryCompress(quality - 0.1);
      }
    }, file.type, quality);
  };
  
  tryCompress(0.8); // Start with 80% quality
}
```

### Sending Images to Flowise

Images are sent as base64 data URLs in the uploads array:

```typescript
// For images and other files
const flowiseUpload: FlowiseUpload = {
  data: base64DataUrl,  // Full data URL including "data:image/png;base64,..."
  type: 'file',         // Always 'file' for images
  name: file.name,
  mime: file.type       // e.g., 'image/png'
};

// API request structure
const requestBody = {
  question: userMessage,
  uploads: [flowiseUpload],  // Array of file uploads
  overrideConfig: { sessionId }
};
```

## Implementation Instructions

### Step 1: Set Up Dependencies

```bash
npm install pdfjs-dist tesseract.js
```

### Step 2: Configure PDF.js Worker

Copy the PDF.js worker file to your public directory:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/
```

### Step 3: Configure PDF.js for Georgian Text

```typescript
// Load PDF with enhanced Georgian support
const pdf = await pdfjsLib.getDocument({ 
  data: arrayBuffer,
  useSystemFonts: true,        // Better support for Georgian fonts
  disableFontFace: false,      // Allow custom font faces (Sylfaen)
  fontExtraProperties: true,   // Extract font properties
  cMapPacked: true,
  disableRange: false,         // Allow full font range for Unicode
  disableStream: false,        // Enable streaming for font loading
  disableAutoFetch: false,     // Allow automatic font fetching
  isOffscreenCanvasSupported: false // Avoid canvas issues with fonts
}).promise;
```

### Step 4: Implement Sylfaen Pattern Detection

```typescript
function hasSylfaenGeorgianPatterns(text: string): boolean {
  const sylfaenPatterns = [
    // Common problematic words in medical documents
    /ლქოთპსოთპთ/g,              // "მშობიარობის"
    /სავაპასდო/g,               // "სავარაუდო"
    /ტეპოლეპთა/g,              // "ფეტომეტრია"
    /ბთპაპთეპალსპთ/g,          // "ბიპარიეტალური"
    /გაპქელოწეპთლობა/g,        // "გარშემოწერილობა"
    
    // Latin Extended patterns (Georgian encoded as Latin)
    /ÌØÏÁÉÀÒÏÁÉÓ/g,            // "მშობიარობის" in Latin Extended
    /ÓÀÝÀÒÏ/g,                 // "სავარაუდო" in Latin Extended
    /ÔÄÔÏÌÄÔÒÉÀ/g,             // "ფეტომეტრია" in Latin Extended
    
    // General patterns that indicate encoding issues
    /[äöüÄÖÜ]/g,               // Sylfaen diacritics
    /[À-ÿ]{3,}/g,              // 3+ consecutive Latin Extended chars
    /[ა-ჰ][À-ÿ]/g,             // Georgian followed by Latin Extended
  ];
  
  return sylfaenPatterns.some(pattern => pattern.test(text));
}
```

### Step 5: Complete Georgian Text Processing

The system handles three types of Georgian encoding issues:

1. **Direct Character Substitution**: Where Georgian characters are replaced with other Georgian characters
2. **Latin Extended Encoding**: Where Georgian text appears as Latin Extended characters (À-ÿ)
3. **Mixed Encoding**: Where proper Georgian is mixed with incorrectly encoded characters

```typescript
// Apply fixes in this order:
// 1. Word-level mappings (most accurate)
// 2. Latin Extended to Georgian conversion
// 3. Character-level mappings (if needed)

function processGeorgianText(text: string): string {
  // Step 1: Apply word mappings
  let processed = applyWordMappings(text);
  
  // Step 2: Convert Latin Extended to Georgian
  processed = convertLatinExtendedToGeorgian(processed);
  
  // Step 3: Clean up any remaining artifacts
  processed = cleanupEncodingArtifacts(processed);
  
  return processed;
}
```

### Step 6: Image Handling for Flowise

#### Complete Image Processing Flow:

```typescript
// In processFileForUpload function
if (file.type.startsWith('image/')) {
  // Check if compression is needed
  if (file.size > 2 * 1024 * 1024) { // 2MB threshold
    // Compress large images
    attachment.base64Data = await compressImageIfNeeded(file, 500); // 500KB target
  } else {
    // Small images - convert directly
    attachment.base64Data = await convertFileToBase64(file);
  }
  
  attachment.status = 'ready';
}
```

#### Image Format for Flowise API:

```typescript
// The Flowise API expects images in this exact format:
{
  data: "data:image/png;base64,iVBORw0KGgoAAAANS...", // Full data URL
  type: "file",    // MUST be "file" for images
  name: "image.png",
  mime: "image/png"
}
```

#### Important Notes for Image Handling:

1. **Always include the data URL prefix** (e.g., `data:image/png;base64,`)
2. **Use type: "file"** for all images (not "image")
3. **Compression is automatic** for images > 2MB
4. **Maximum compressed size** is 500KB for optimal performance
5. **Supported formats**: JPEG, PNG, GIF, WebP

### Step 7: Type Definitions

Create comprehensive types for the system:

```typescript
export interface Attachment {
  id: string;
  file: File;
  base64Data: string;
  uploadType: 'image' | 'pdf' | 'document';
  status: 'processing' | 'ready' | 'error';
  preview?: string;
  error?: string;
  extractedText?: string;
  pdfPageCount?: number;
  extractionError?: string;
  progressInfo?: {
    stage: 'analyzing' | 'extracting' | 'ocr' | 'complete';
    stageDescription: string;
    percentage?: number;
    estimatedTimeRemaining?: string;
    currentPage?: number;
    totalPages?: number;
    method?: 'standard' | 'ocr';
  };
}

export interface FlowiseUpload {
  data: string;
  type: string; // 'text' | 'file' | 'audio'
  name: string;
  mime: string;
}
```

### Step 4: Implement PDF Text Extraction

Key implementation points:
1. Load PDF with Unicode support enabled
2. Implement character encoding fixes for your target languages
3. Detect image-based PDFs by checking for text operators
4. Implement progress callbacks for UI updates

### Step 5: Implement OCR Fallback

Critical considerations:
1. Calculate optimal canvas scale (balance quality vs memory)
2. Handle canvas size limits (max 8192x8192 pixels)
3. Configure Tesseract with appropriate language packs
4. Implement robust error handling for canvas conversion

### Step 6: Create Unified Processing Pipeline

Processing logic by file type:
- **PDFs**: Always extract text, never send as file
- **Images > 2MB**: Compress using canvas with quality stepping
- **Audio files**: Send as direct file upload
- **Other documents**: Convert to base64

### Step 7: Integrate with Flowise API

API request formatting:
```typescript
const requestBody: FlowiseRequest = {
  question: message + extractedTextContent,
  uploads: fileUploads, // Only images, audio, etc.
  overrideConfig: { sessionId }
};
```

### Step 8: Implement Progress Tracking

Provide detailed progress information:
```typescript
onProgress({
  stage: 'extracting',
  stageDescription: `Processing page ${current} of ${total}...`,
  percentage: Math.round(progress),
  currentPage: current,
  totalPages: total,
  method: 'ocr',
  estimatedTimeRemaining: `${seconds}s`
});
```

## Best Practices

1. **Memory Management**:
   - Clean up object URLs after use
   - Limit canvas sizes for OCR
   - Process files sequentially for large batches

2. **Error Handling**:
   - Graceful fallbacks at each stage
   - User-friendly error messages
   - Continue processing other files on individual failures

3. **Performance Optimization**:
   - Compress large images before upload
   - Truncate text to API token limits
   - Use Web Workers for heavy processing (if needed)

4. **User Experience**:
   - Detailed progress tracking
   - Time estimates for long operations
   - Clear status indicators

## Testing Recommendations

1. Test with various PDF types:
   - Standard text PDFs
   - Scanned/image-based PDFs
   - Mixed content PDFs
   - Multi-language documents

2. Test image compression:
   - Large high-resolution images
   - Various image formats
   - Quality vs size trade-offs

3. Test error scenarios:
   - Network failures
   - Invalid file formats
   - API timeout handling

## Security Considerations

1. Validate file types and sizes on both client and server
2. Sanitize extracted text content
3. Implement rate limiting for API requests
4. Use HTTPS for all API communications

## Practical Examples

### Example 1: Processing a Georgian Medical PDF

```typescript
// User uploads a medical PDF with Sylfaen font encoding issues
const pdfFile = new File([...], "medical-report.pdf", { type: "application/pdf" });

// Process the file
const attachment = await processFileForUpload(pdfFile, (progress) => {
  console.log(`${progress.stage}: ${progress.stageDescription} - ${progress.percentage}%`);
});

// Result: attachment.extractedText contains properly decoded Georgian text
// Original: "ლქოთპსოთპთ სავაპასდო"
// Fixed: "მშობიარობის სავარაუდო"

// Send to Flowise - PDF text is appended to the question
const response = await fetchAIResponse(
  "Please analyze this medical report",
  sessionId,
  [attachment]
);
// The API receives: "Please analyze this medical report\n\n--- Content from medical-report.pdf (extracted text) ---\nმშობიარობის სავარაუდო..."
```

### Example 2: Processing Multiple Images

```typescript
// User uploads multiple images
const images = [
  new File([...], "xray1.jpg", { type: "image/jpeg" }), // 5MB
  new File([...], "scan.png", { type: "image/png" })    // 800KB
];

// Process all images
const attachments = await processMultipleFiles(images);

// First image (5MB) is compressed to ~500KB
// Second image (800KB) is sent as-is

// Send to Flowise
const response = await fetchAIResponse(
  "Please analyze these medical images",
  sessionId,
  attachments
);

// API request body:
{
  question: "Please analyze these medical images",
  uploads: [
    {
      data: "data:image/jpeg;base64,/9j/4AAQSkZJRg...", // Compressed
      type: "file",
      name: "xray1.jpg",
      mime: "image/jpeg"
    },
    {
      data: "data:image/png;base64,iVBORw0KGgoAAAANS...", // Original
      type: "file", 
      name: "scan.png",
      mime: "image/png"
    }
  ],
  overrideConfig: { sessionId: "..." }
}
```

### Example 3: Mixed Content Upload

```typescript
// User uploads PDF and images together
const files = [
  new File([...], "report.pdf", { type: "application/pdf" }),
  new File([...], "photo.jpg", { type: "image/jpeg" })
];

const attachments = await processMultipleFiles(files);

// Send to Flowise
const response = await fetchAIResponse(
  "Analyze the report and image",
  sessionId,
  attachments
);

// Result: PDF text is in the question, image is in uploads
{
  question: "Analyze the report and image\n\n--- Content from report.pdf (extracted text) ---\n[Georgian text content]",
  uploads: [{
    data: "data:image/jpeg;base64,...",
    type: "file",
    name: "photo.jpg",
    mime: "image/jpeg"
  }]
}
```

## Common Pitfalls and Solutions

### Georgian Text Issues

**Problem**: Georgian text appears garbled after extraction
**Solution**: Ensure all three encoding fix methods are applied in order:
1. Word mappings (most reliable)
2. Latin Extended conversion
3. Character mappings (last resort)

### Image Size Issues

**Problem**: Large images fail to upload
**Solution**: Implement progressive compression:
```typescript
// Start at 80% quality and reduce until size is acceptable
let quality = 0.8;
while (blob.size > maxSize && quality > 0.1) {
  quality -= 0.1;
  // Recompress at lower quality
}
```

### PDF OCR Performance

**Problem**: OCR takes too long for large PDFs
**Solution**: 
1. Show time estimates to users
2. Process pages sequentially (not in parallel) to avoid memory issues
3. Consider page limits for very large documents

This implementation provides a robust, user-friendly file upload system that intelligently processes different file types and integrates seamlessly with AI backends.