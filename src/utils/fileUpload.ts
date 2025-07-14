import { Attachment, FlowiseUpload, FlowiseUploadType, DEFAULT_FILE_CONFIG, FileValidationConfig } from '../types/chat';
import { 
  extractTextFromPdf, 
  type PdfTextExtractionResult 
} from './pdfTextExtractor';
import { 
  extractTextFromImage, 
  isImageFile,
  type ImageOcrResult 
} from './imageOcrExtractor';

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Get estimated token count for text (rough approximation)
 * Useful for checking if text will fit within API limits
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for most languages
  // Georgian text might be slightly different, but this gives a good estimate
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limits if needed
 */
export function truncateTextForTokenLimit(text: string, maxTokens: number = 25000): string {
  const estimatedTokens = estimateTokenCount(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Calculate how much text to keep (leave some buffer)
  const maxChars = Math.floor(maxTokens * 3.5); // Conservative estimate
  const truncatedText = text.substring(0, maxChars);

  console.log('✂️ Text truncated to fit token limits:', {
    originalLength: text.length,
    truncatedLength: truncatedText.length,
    estimatedOriginalTokens: estimatedTokens,
    maxTokens
  });

  return truncatedText + '\n\n[Text truncated to fit token limits...]';
}


/**
 * Convert a file to base64 data URL format
 */
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('🔧 Converting file to base64:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        console.log('✅ Base64 conversion successful:', {
          fileName: file.name,
          resultLength: reader.result.length,
          preview: reader.result.substring(0, 100) + '...'
        });
        resolve(reader.result);
      } else {
        console.error('❌ Base64 conversion failed - no result');
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = () => {
      console.error('❌ FileReader error:', reader.error);
      reject(new Error('FileReader error: ' + reader.error?.message));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Determine the Flowise upload type based on file type
 */
export function getFlowiseUploadType(file: File): FlowiseUploadType {
  if (file.type.startsWith('image/')) {
    return 'image';
  } else if (file.type === 'application/pdf') {
    return 'pdf';
  } else {
    return 'document';
  }
}

/**
 * Validate a file against the configuration constraints
 */
export function validateFileForFlowise(
  file: File, 
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > config.maxFileSize) {
    const maxSizeMB = Math.round(config.maxFileSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    };
  }
  
  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not supported'
    };
  }
  
  return { isValid: true };
}

/**
 * Validate multiple files including count limit
 */
export function validateMultipleFiles(
  files: File[], 
  currentCount: number = 0,
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): { isValid: boolean; error?: string } {
  // Check total file count
  if (currentCount + files.length > config.maxFiles) {
    return {
      isValid: false,
      error: `Maximum ${config.maxFiles} files allowed`
    };
  }
  
  // Validate each file individually
  for (const file of files) {
    const validation = validateFileForFlowise(file, config);
    if (!validation.isValid) {
      return validation;
    }
  }
  
  return { isValid: true };
}

/**
 * Process file for upload with progress tracking
 */
export async function processFileForUpload(
  file: File, 
  onProgress?: (progress: Attachment['progressInfo']) => void
): Promise<Attachment> {
  const attachment: Attachment = {
    id: Math.random().toString(36).substring(2, 15),
    file,
    uploadType: getFlowiseUploadType(file),
    status: 'processing',
    base64Data: '',
    preview: URL.createObjectURL(file),
    progressInfo: {
      stage: 'analyzing',
      stageDescription: 'Analyzing file...',
      percentage: 0
    }
  };

  // Emit initial progress
  if (onProgress) {
    onProgress(attachment.progressInfo!);
  }

  try {
    console.log('🔄 Processing file for upload:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadType: attachment.uploadType
    });

    // Handle PDFs with text extraction
    if (isPdfFile(file)) {
      console.log('📄 PDF detected - extracting text instead of sending full file');
      
      // Update progress for PDF analysis
      attachment.progressInfo = {
        stage: 'extracting',
        stageDescription: 'Extracting text from PDF...',
        percentage: 10
      };
      if (onProgress) onProgress(attachment.progressInfo);
      
      try {
        const extractionResult = await extractTextFromPdf(file, (progressInfo) => {
          // Forward progress updates from PDF extractor
          attachment.progressInfo = progressInfo;
          if (onProgress) onProgress(progressInfo);
        });
        
        if (extractionResult.success) {
          const textContent = extractionResult.text.trim();
          
          if (textContent) {
            // Update progress for text processing
            attachment.progressInfo = {
              stage: 'complete',
              stageDescription: `${extractionResult.usedOCR ? 'OCR' : 'Text'} extraction completed`,
              percentage: 100,
              method: extractionResult.usedOCR ? 'ocr' : 'standard'
            };
            if (onProgress) onProgress(attachment.progressInfo);
            
            // PDF has extractable text content
            const processedText = truncateTextForTokenLimit(textContent, 25000);
            
            // Store the extracted text directly (NOT as base64) for Flowise
            attachment.base64Data = processedText; // Store as plain text, not base64
            attachment.status = 'ready';
            attachment.extractedText = processedText;
            attachment.pdfPageCount = extractionResult.pageCount;
            
            const logData: any = {
              fileName: file.name,
              textLength: processedText.length,
              pageCount: extractionResult.pageCount,
              estimatedTokens: estimateTokenCount(processedText)
            };
            
            if (extractionResult.usedOCR) {
              logData.extractionMethod = 'OCR';
              logData.ocrConfidence = Math.round(extractionResult.ocrConfidence || 0);
              logData.processingTimeSeconds = Math.round((extractionResult.processingTime || 0) / 1000);
            } else {
              logData.extractionMethod = 'Standard';
            }
            
            console.log('✅ PDF text extraction successful:', logData);
          } else {
            // PDF extraction succeeded but no text content found (likely scanned images, empty pages, etc.)
            attachment.progressInfo = {
              stage: 'complete',
              stageDescription: 'No text content found in PDF',
              percentage: 100
            };
            if (onProgress) onProgress(attachment.progressInfo);
            
            attachment.status = 'ready';
            attachment.extractedText = '';
            attachment.pdfPageCount = extractionResult.pageCount;
            attachment.base64Data = ''; // Empty text content
            
            const logData: any = {
              fileName: file.name,
              pageCount: extractionResult.pageCount,
              reason: 'PDF may contain only images, be empty, or have non-extractable text'
            };
            
            if (extractionResult.usedOCR) {
              logData.ocrAttempted = true;
              logData.ocrFailed = true;
              logData.processingTimeSeconds = Math.round((extractionResult.processingTime || 0) / 1000);
            }
            
            console.log('ℹ️ PDF processed successfully but no text content found:', logData);
          }
        } else {
          // Text extraction failed due to an error
          console.warn('⚠️ PDF text extraction failed:', extractionResult.error);
          attachment.status = 'ready';
          attachment.extractionError = extractionResult.error;
          attachment.base64Data = ''; // No content
          attachment.extractedText = '';
          attachment.progressInfo = {
            stage: 'complete',
            stageDescription: `Extraction failed: ${extractionResult.error}`,
            percentage: 100
          };
          if (onProgress) onProgress(attachment.progressInfo);
        }
      } catch (extractionError) {
        // Handle any unexpected errors during extraction
        console.error('❌ Unexpected error during PDF text extraction:', extractionError);
        attachment.status = 'ready';
        attachment.extractionError = extractionError instanceof Error ? extractionError.message : 'Unexpected extraction error';
        attachment.base64Data = '';
        attachment.extractedText = '';
        attachment.progressInfo = {
          stage: 'complete',
          stageDescription: `Error: ${extractionError instanceof Error ? extractionError.message : 'Unexpected error'}`,
          percentage: 100
        };
        if (onProgress) onProgress(attachment.progressInfo);
      }
    } 
    // Handle images with OCR + compression, and other files with direct conversion
    else {
      // For images, perform OCR text extraction first
      if (isImageFile(file)) {
        console.log('🖼️ Processing image file with OCR:', {
          fileName: file.name,
          originalSize: file.size,
          type: file.type
        });
        
        // Update progress for OCR analysis
        attachment.progressInfo = {
          stage: 'extracting',
          stageDescription: 'Extracting text from image...',
          percentage: 10
        };
        if (onProgress) onProgress(attachment.progressInfo);
        
        try {
          // Extract text using OCR first
          const ocrResult = await extractTextFromImage(file, (progressInfo) => {
            // Forward progress updates from OCR extractor (10% to 70%)
            const adjustedProgress = {
              ...progressInfo,
              percentage: 10 + (progressInfo.percentage * 0.6) // Scale 0-100% to 10-70%
            };
            attachment.progressInfo = adjustedProgress;
            if (onProgress) onProgress(adjustedProgress);
          });
          
          if (ocrResult.success && ocrResult.text.trim()) {
            // Store extracted text
            attachment.extractedText = ocrResult.text.trim();
            
            console.log('✅ Image OCR extraction successful:', {
              fileName: file.name,
              textLength: ocrResult.text.length,
              confidence: Math.round(ocrResult.confidence || 0),
              processingTimeSeconds: Math.round((ocrResult.processingTime || 0) / 1000)
            });
          } else {
            // OCR completed but no text found or failed
            const reason = ocrResult.error || 'No text content found in image';
            console.log('ℹ️ Image OCR completed but no text extracted:', {
              fileName: file.name,
              reason,
              success: ocrResult.success
            });
            attachment.extractedText = '';
          }
        } catch (ocrError) {
          console.warn('⚠️ Image OCR extraction failed:', {
            fileName: file.name,
            error: ocrError,
            message: ocrError instanceof Error ? ocrError.message : 'Unknown OCR error'
          });
          attachment.extractedText = '';
        }
        
        // Now handle image compression (70% to 90%)
        attachment.progressInfo = {
          stage: 'extracting', 
          stageDescription: 'Processing image file...',
          percentage: 70
        };
        if (onProgress) onProgress(attachment.progressInfo);
        
        // If image is larger than 2MB, compress it
        if (file.size > 2 * 1024 * 1024) {
          console.log('📐 Image is large, compressing for Flowise API...');
          
          attachment.progressInfo = {
            stage: 'extracting',
            stageDescription: 'Compressing large image...',
            percentage: 80
          };
          if (onProgress) onProgress(attachment.progressInfo);
          
          try {
            attachment.base64Data = await compressImageIfNeeded(file, 500); // 500KB limit
            console.log('✅ Image compressed successfully:', {
              fileName: file.name,
              originalSize: file.size,
              compressedLength: attachment.base64Data.length
            });
          } catch (compressionError) {
            console.warn('⚠️ Image compression failed, using original:', compressionError);
            attachment.base64Data = await convertFileToBase64(file);
          }
        } else {
          // Small image, use as-is
          attachment.base64Data = await convertFileToBase64(file);
        }
        
      } else {
        // Non-image files, use direct conversion
        attachment.progressInfo = {
          stage: 'extracting',
          stageDescription: 'Converting file...',
          percentage: 50
        };
        if (onProgress) onProgress(attachment.progressInfo);
        
        attachment.base64Data = await convertFileToBase64(file);
      }
      
      attachment.status = 'ready';
      
      // Complete progress
      const hasExtractedText = attachment.extractedText && attachment.extractedText.length > 0;
      attachment.progressInfo = {
        stage: 'complete',
        stageDescription: hasExtractedText ? 'Text extracted and file ready' : 'File ready',
        percentage: 100
      };
      if (onProgress) onProgress(attachment.progressInfo);
      
      console.log('✅ File processing completed:', {
        fileName: file.name,
        fileType: file.type,
        finalSize: attachment.base64Data.length,
        hasExtractedText: hasExtractedText,
        extractedTextLength: attachment.extractedText?.length || 0
      });
    }

  } catch (error) {
    console.error('❌ File processing failed:', {
      fileName: file.name,
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    attachment.status = 'error';
    attachment.error = error instanceof Error ? error.message : 'Unknown error occurred';
    attachment.progressInfo = {
      stage: 'complete',
      stageDescription: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      percentage: 100
    };
    if (onProgress) onProgress(attachment.progressInfo);
  }

  return attachment;
}

/**
 * Compress image if it's too large for Flowise API
 */
async function compressImageIfNeeded(file: File, maxSizeKB: number = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        const maxWidth = 1024;
        const maxHeight = 1024;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels until we get under the size limit
        const tryCompress = (quality: number): void => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Check if compressed size is acceptable or if we've reached minimum quality
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read compressed image'));
              reader.readAsDataURL(blob);
            } else {
              // Try with lower quality
              tryCompress(quality - 0.1);
            }
          }, file.type, quality);
        };
        
        tryCompress(0.8); // Start with 80% quality
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert attachment to Flowise upload format
 * Returns an array to support sending both text and file for images with OCR
 */
export function convertAttachmentToFlowiseUpload(attachment: Attachment): FlowiseUpload | FlowiseUpload[] {
  // For PDFs, ALWAYS send as text content (never as file upload)
  if (isPdfFile(attachment.file)) {
    if (attachment.extractedText) {
      console.log('📝 Converting PDF with extracted text to Flowise format:', {
        fileName: attachment.file.name,
        textLength: attachment.extractedText.length,
        pageCount: attachment.pdfPageCount,
        estimatedTokens: estimateTokenCount(attachment.extractedText)
      });
      
      // Send extracted text directly, not as file upload
      return {
        data: attachment.extractedText,
        type: 'text',
        name: `${attachment.file.name} (${attachment.extractedText.includes('(OCR)') ? 'OCR extracted text' : 'extracted text'})`,
        mime: 'text/plain'
      };
    } else if (attachment.extractionError) {
      // If text extraction failed, send error message as text
      console.warn('📝 PDF text extraction failed, sending error message as text:', {
        fileName: attachment.file.name,
        error: attachment.extractionError
      });
      
      return {
        data: `[Unable to extract text from PDF: ${attachment.file.name}. Error: ${attachment.extractionError}]`,
        type: 'text',
        name: `${attachment.file.name} (extraction failed)`,
        mime: 'text/plain'
      };
    } else {
      // PDF processed successfully but contains no extractable text
      console.log('📝 PDF contains no extractable text, sending descriptive message:', {
        fileName: attachment.file.name,
        pageCount: attachment.pdfPageCount
      });
      
      return {
        data: `[PDF file "${attachment.file.name}" (${attachment.pdfPageCount || 1} page${(attachment.pdfPageCount || 1) > 1 ? 's' : ''}) was processed successfully but contains no extractable text. This may be a scanned document, contain only images, or have text that cannot be extracted.]`,
        type: 'text',
        name: `${attachment.file.name} (no extractable text)`,
        mime: 'text/plain'
      };
    }
  }
  
  // For images with extracted text, send BOTH text and image
  if (isImageFile(attachment.file) && attachment.extractedText && attachment.extractedText.trim()) {
    console.log('🖼️ Converting image with extracted text to Flowise format:', {
      fileName: attachment.file.name,
      textLength: attachment.extractedText.length,
      imageSize: attachment.base64Data.length
    });
    
    const textUpload: FlowiseUpload = {
      data: attachment.extractedText,
      type: 'text',
      name: `${attachment.file.name} (extracted text)`,
      mime: 'text/plain'
    };
    
    const imageUpload: FlowiseUpload = {
      data: attachment.base64Data,
      type: 'file',
      name: attachment.file.name,
      mime: attachment.file.type || 'application/octet-stream'
    };
    
    return [textUpload, imageUpload];
  }
  
  // For images without text and other files, use direct file upload approach
  const base64Data = attachment.base64Data; // Keep the full data URL
  
  // For Flowise API:
  // - "file" = Direct image processing (correct for images)
  // - "audio" = Audio processing
  const flowiseType = attachment.file.type.startsWith('audio/') ? 'audio' : 'file';
  
  const flowiseUpload: FlowiseUpload = {
    data: base64Data,
    type: flowiseType,
    name: attachment.file.name,
    mime: attachment.file.type
  };
  
  console.log('🔄 Converting attachment to Flowise format:', {
    fileName: attachment.file.name,
    fileType: attachment.file.type,
    uploadType: attachment.uploadType,
    flowiseType: flowiseType,
    originalDataLength: attachment.base64Data.length,
    hasDataPrefix: attachment.base64Data.includes('data:'),
    hasExtractedText: !!attachment.extractedText,
    preview: `${attachment.file.name} (${attachment.file.type})`
  });
  
  return flowiseUpload;
}

/**
 * Process multiple files concurrently with progress tracking
 */
export async function processMultipleFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: Attachment['progressInfo']) => void
): Promise<Attachment[]> {
  const promises = files.map((file, index) => 
    processFileForUpload(file, onProgress ? (progress) => onProgress(index, progress) : undefined)
  );
  return Promise.all(promises);
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export function cleanupAttachment(attachment: Attachment): void {
  if (attachment.preview) {
    URL.revokeObjectURL(attachment.preview);
  }
}

/**
 * Clean up multiple attachments
 */
export function cleanupAttachments(attachments: Attachment[]): void {
  attachments.forEach(cleanupAttachment);
}