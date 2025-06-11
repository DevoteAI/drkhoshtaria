import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface OcrExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
  confidence?: number;
  processingTime?: number;
}

/**
 * Extract text from image-based PDFs using OCR
 * Supports Georgian, Russian, and English text recognition
 * Enhanced with detailed progress tracking for better UI/UX
 */
export async function extractTextFromPdfWithOCR(
  file: File, 
  onProgress?: (progress: { 
    stage: string; 
    stageDescription: string; 
    percentage: number; 
    currentPage?: number; 
    totalPages?: number;
    timeEstimate?: number;
    method?: string;
  }) => void
): Promise<OcrExtractionResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting OCR text extraction:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Initial progress
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        stageDescription: 'Loading PDF for OCR analysis...',
        percentage: 5,
        method: 'ocr'
      });
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true
    }).promise;

    console.log('📖 PDF loaded for OCR processing:', {
      pageCount: pdf.numPages,
      fileName: file.name
    });

    // Calculate estimated processing time
    const estimatedTimeMs = estimateOcrProcessingTime(file.size, pdf.numPages);
    const estimatedTimeSeconds = Math.round(estimatedTimeMs / 1000);

    // Update progress with OCR start and time estimate
    if (onProgress) {
      onProgress({
        stage: 'extracting',
        stageDescription: `Starting OCR processing (~${estimatedTimeSeconds}s estimated)...`,
        percentage: 10,
        totalPages: pdf.numPages,
        timeEstimate: estimatedTimeSeconds,
        method: 'ocr'
      });
    }

    let fullText = '';
    let totalConfidence = 0;
    let processedPages = 0;
    
    // Process each page with OCR
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        // Update progress for current page
        const pageProgress = 10 + ((pageNum - 1) / pdf.numPages) * 85; // 10% to 95%
        const remainingPages = pdf.numPages - pageNum + 1;
        const avgTimePerPage = (Date.now() - startTime) / Math.max(pageNum - 1, 1);
        const estimatedRemainingSeconds = Math.round((remainingPages * avgTimePerPage) / 1000);
        
        if (onProgress) {
          onProgress({
            stage: 'extracting',
            stageDescription: `Processing page ${pageNum} of ${pdf.numPages} (${estimatedRemainingSeconds}s remaining)...`,
            percentage: Math.round(pageProgress),
            currentPage: pageNum,
            totalPages: pdf.numPages,
            timeEstimate: estimatedRemainingSeconds,
            method: 'ocr'
          });
        }

        const page = await pdf.getPage(pageNum);
        
        // Get page dimensions and calculate optimal scale for OCR
        const originalViewport = page.getViewport({ scale: 1.0 });
        
        // Calculate optimal scale - balance quality vs memory usage
        const maxCanvasSize = 8192; // Max canvas dimension to prevent memory issues
        const minScale = 1.0; // Minimum scale for readability
        const maxScale = 3.0; // Maximum scale for quality
        
        let optimalScale = Math.min(
          maxScale,
          Math.max(
            minScale,
            Math.min(
              maxCanvasSize / originalViewport.width,
              maxCanvasSize / originalViewport.height
            )
          )
        );
        
        // Get page as canvas/image with optimized settings for OCR
        const viewport = page.getViewport({ scale: optimalScale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        console.log(`🖼️ Page ${pageNum} canvas setup:`, {
          pageNum,
          originalWidth: originalViewport.width,
          originalHeight: originalViewport.height,
          scale: optimalScale,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          canvasArea: canvas.width * canvas.height
        });
        
        // Check if canvas size is reasonable
        if (canvas.width * canvas.height > 50000000) { // 50M pixels limit
          console.warn(`⚠️ Canvas too large for page ${pageNum}, reducing scale`);
          optimalScale = Math.min(optimalScale, Math.sqrt(50000000 / (originalViewport.width * originalViewport.height)));
          const newViewport = page.getViewport({ scale: optimalScale });
          canvas.width = newViewport.width;
          canvas.height = newViewport.height;
          
          console.log(`🔧 Reduced canvas size for page ${pageNum}:`, {
            pageNum,
            newScale: optimalScale,
            newWidth: canvas.width,
            newHeight: canvas.height,
            newArea: canvas.width * canvas.height
          });
        }
        
        // Set up canvas for better OCR rendering
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render PDF page to canvas with optimized settings
        await page.render({
          canvasContext: context,
          viewport: page.getViewport({ scale: optimalScale })
        }).promise;
        
        console.log(`✅ Page ${pageNum} rendered successfully`);
        
        // Convert canvas to image data for OCR - use multiple fallback methods
        let imageForOCR: string | Blob;
        
        try {
          // First try: Convert to Blob (preferred by Tesseract)
          imageForOCR = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob && blob.size > 0) {
                resolve(blob);
              } else {
                reject(new Error(`Canvas toBlob returned ${blob ? 'empty blob' : 'null'}`));
              }
            }, 'image/png', 0.9); // High quality but not maximum to reduce size
          });
          
          console.log(`🔄 Image Blob prepared for OCR:`, {
            pageNum,
            blobSize: (imageForOCR as Blob).size,
            blobType: (imageForOCR as Blob).type
          });
          
        } catch (blobError) {
          // Fallback: Use data URL if blob conversion fails
          console.warn(`⚠️ Blob conversion failed for page ${pageNum}, using data URL fallback:`, blobError);
          
          try {
            imageForOCR = canvas.toDataURL('image/png', 0.9);
            
            // Validate data URL
            if (!imageForOCR || imageForOCR.length < 100 || !imageForOCR.startsWith('data:image/')) {
              throw new Error(`Invalid data URL generated: length=${imageForOCR?.length}, preview=${imageForOCR?.substring(0, 50)}`);
            }
            
            console.log(`🔄 Image Data URL prepared for OCR:`, {
              pageNum,
              dataUrlLength: imageForOCR.length,
              dataUrlPreview: imageForOCR.substring(0, 50) + '...'
            });
            
          } catch (dataUrlError) {
            console.error(`❌ Both blob and data URL conversion failed for page ${pageNum}:`, dataUrlError);
            throw new Error(`Canvas conversion failed: ${dataUrlError instanceof Error ? dataUrlError.message : 'Unknown error'}`);
          }
        }
        
        // Perform OCR with multi-language support and enhanced progress tracking
        const ocrResult = await Tesseract.recognize(
          imageForOCR,
          'eng+rus+kat', // English + Russian + Georgian
          {
            logger: (m) => {
              if (m.status === 'recognizing text' && onProgress) {
                const ocrPageProgress = 10 + ((pageNum - 1) / pdf.numPages) * 85 + (m.progress * (85 / pdf.numPages));
                
                onProgress({
                  stage: 'extracting',
                  stageDescription: `OCR processing page ${pageNum} of ${pdf.numPages} (${Math.round(m.progress * 100)}%)...`,
                  percentage: Math.round(ocrPageProgress),
                  currentPage: pageNum,
                  totalPages: pdf.numPages,
                  method: 'ocr'
                });
              }
            }
          }
        );
        
        const pageText = ocrResult.data.text.trim();
        const confidence = ocrResult.data.confidence;
        
        if (pageText) {
          fullText += `\n\n--- Page ${pageNum} (OCR) ---\n${pageText}`;
          totalConfidence += confidence;
          processedPages++;
        }
        
        console.log(`✅ OCR completed for page ${pageNum}:`, {
          pageNum,
          textLength: pageText.length,
          confidence: Math.round(confidence),
          preview: pageText.substring(0, 100) + '...'
        });
        
      } catch (pageError) {
        console.warn(`⚠️ OCR failed for page ${pageNum}:`, {
          pageNum,
          error: pageError,
          message: pageError instanceof Error ? pageError.message : 'Unknown OCR error'
        });
        // Continue with other pages
      }
    }

    // Clean up the extracted text
    const cleanedText = fullText
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();

    const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;
    const processingTime = Date.now() - startTime;

    const result: OcrExtractionResult = {
      text: cleanedText,
      pageCount: pdf.numPages,
      success: true,
      confidence: averageConfidence,
      processingTime
    };

    console.log('🎯 OCR text extraction completed:', {
      fileName: file.name,
      totalTextLength: cleanedText.length,
      pageCount: pdf.numPages,
      processedPages,
      averageConfidence: Math.round(averageConfidence),
      processingTimeSeconds: Math.round(processingTime / 1000),
      preview: cleanedText.substring(0, 200) + '...'
    });

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ OCR text extraction failed:', {
      fileName: file.name,
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeSeconds: Math.round(processingTime / 1000)
    });

    return {
      text: '',
      pageCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime
    };
  }
}

/**
 * Check if a PDF likely needs OCR (no extractable text but has content)
 */
export function shouldUseOCR(
  standardExtractionResult: { text: string; pageCount: number; success: boolean },
  hasTextOperators: boolean
): boolean {
  return (
    standardExtractionResult.success && // Standard extraction worked
    standardExtractionResult.text.trim().length === 0 && // But no text found
    !hasTextOperators && // No text operators in PDF
    standardExtractionResult.pageCount > 0 // Has pages to process
  );
}

/**
 * Get estimated processing time for OCR based on file size and page count
 */
export function estimateOcrProcessingTime(fileSizeBytes: number, pageCount: number): number {
  // Rough estimates: ~5-15 seconds per page depending on complexity and size
  const baseTimePerPage = 8000; // 8 seconds per page
  const sizeMultiplier = Math.min(fileSizeBytes / (1024 * 1024), 3); // Up to 3x for large files
  
  return Math.round(baseTimePerPage * pageCount * sizeMultiplier);
} 