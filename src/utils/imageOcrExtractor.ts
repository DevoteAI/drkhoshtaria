import Tesseract from 'tesseract.js';

export interface ImageOcrResult {
  text: string;
  success: boolean;
  error?: string;
  confidence?: number;
  processingTime?: number;
}

/**
 * Extract text from standalone images using OCR
 * Supports Georgian, Russian, and English text recognition
 * Enhanced with detailed progress tracking for better UI/UX
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: {
    stage: string;
    stageDescription: string;
    percentage: number;
    timeEstimate?: number;
    method?: string;
  }) => void
): Promise<ImageOcrResult> {
  const startTime = Date.now();

  try {
    console.log('🔍 Starting image OCR text extraction:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Initial progress
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        stageDescription: 'Loading image for OCR analysis...',
        percentage: 5,
        method: 'ocr'
      });
    }

    // Calculate estimated processing time based on file size
    const estimatedTimeMs = estimateImageOcrProcessingTime(file.size);
    const estimatedTimeSeconds = Math.round(estimatedTimeMs / 1000);

    // Update progress with OCR start and time estimate
    if (onProgress) {
      onProgress({
        stage: 'extracting',
        stageDescription: `Starting OCR processing (~${estimatedTimeSeconds}s estimated)...`,
        percentage: 10,
        timeEstimate: estimatedTimeSeconds,
        method: 'ocr'
      });
    }

    // Enhance image for better OCR results
    if (onProgress) {
      onProgress({
        stage: 'extracting',
        stageDescription: 'Enhancing image quality for OCR...',
        percentage: 15,
        timeEstimate: estimatedTimeSeconds,
        method: 'ocr'
      });
    }

    const enhancedImage = await preprocessImageForOCR(file);
    
    console.log('🔄 Image preprocessed for OCR:', {
      fileName: file.name,
      originalSize: file.size,
      processedImageType: enhancedImage instanceof HTMLCanvasElement ? 'canvas' : typeof enhancedImage
    });

    // Perform OCR with optimized settings for Georgian text
    const ocrResult = await Tesseract.recognize(
      enhancedImage,
      'kat+eng+rus', // Prioritize Georgian, then English, then Russian
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            const ocrProgress = 20 + (m.progress * 75); // 20% to 95%
            
            onProgress({
              stage: 'extracting',
              stageDescription: `OCR processing image (${Math.round(m.progress * 100)}%)...`,
              percentage: Math.round(ocrProgress),
              method: 'ocr'
            });
          }
        },
        tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
        tessedit_ocr_engine_mode: '2', // LSTM engine only (more accurate)
        tessedit_char_whitelist: '', // Allow all characters
        preserve_interword_spaces: '1', // Preserve spacing
      }
    );

    const extractedText = ocrResult.data.text.trim();
    const confidence = ocrResult.data.confidence;

    // Apply Georgian character encoding fixes (same as PDF processing)
    const cleanedText = applyGeorgianEncodingFixes(extractedText);

    const processingTime = Date.now() - startTime;

    const result: ImageOcrResult = {
      text: cleanedText,
      success: true,
      confidence: confidence,
      processingTime
    };

    console.log('🎯 Image OCR text extraction completed:', {
      fileName: file.name,
      textLength: cleanedText.length,
      confidence: Math.round(confidence),
      processingTimeSeconds: Math.round(processingTime / 1000),
      preview: cleanedText.substring(0, 200) + '...'
    });

    // Final progress update
    if (onProgress) {
      onProgress({
        stage: 'complete',
        stageDescription: `OCR extraction completed (${Math.round(confidence)}% confidence)`,
        percentage: 100,
        method: 'ocr'
      });
    }

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ Image OCR text extraction failed:', {
      fileName: file.name,
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      processingTimeSeconds: Math.round(processingTime / 1000)
    });

    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime
    };
  }
}

/**
 * Convert File to data URL
 */
async function convertFileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('FileReader error: ' + reader.error?.message));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Preprocess image for better OCR accuracy
 * Applies contrast enhancement, noise reduction, and optimal sizing
 */
async function preprocessImageForOCR(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate optimal size for OCR (balance quality vs processing time)
        const maxDimension = 2400; // Increase for better quality
        const minDimension = 800;   // Minimum for readability
        
        let { width, height } = img;
        const aspectRatio = width / height;
        
        // Scale to optimal size
        if (Math.max(width, height) > maxDimension) {
          if (width > height) {
            width = maxDimension;
            height = width / aspectRatio;
          } else {
            height = maxDimension;
            width = height * aspectRatio;
          }
        } else if (Math.max(width, height) < minDimension) {
          if (width > height) {
            width = minDimension;
            height = width / aspectRatio;
          } else {
            height = minDimension;
            width = height * aspectRatio;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply image enhancements
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const enhancedData = enhanceImageForOCR(imageData);
        ctx.putImageData(enhancedData, 0, 0);

        console.log('✅ Image preprocessing completed:', {
          originalWidth: img.width,
          originalHeight: img.height,
          processedWidth: canvas.width,
          processedHeight: canvas.height,
          scaleFactor: Math.round((canvas.width / img.width) * 100) / 100
        });

        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Enhance image data for better OCR recognition
 * Applies contrast enhancement and noise reduction
 */
function enhanceImageForOCR(imageData: ImageData): ImageData {
  const data = imageData.data;
  
  // Calculate histogram for contrast enhancement
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
  }
  
  // Find min and max for contrast stretching
  let min = 0, max = 255;
  for (let i = 0; i < 256; i++) {
    if (histogram[i] > 0) {
      min = i;
      break;
    }
  }
  for (let i = 255; i >= 0; i--) {
    if (histogram[i] > 0) {
      max = i;
      break;
    }
  }
  
  const range = max - min;
  if (range === 0) return imageData;
  
  // Apply enhancements
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale with better OCR weights
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    
    // Contrast stretching
    let enhanced = Math.round(((gray - min) / range) * 255);
    enhanced = Math.max(0, Math.min(255, enhanced));
    
    // Additional contrast boost for text
    enhanced = Math.round(255 * Math.pow(enhanced / 255, 0.8));
    
    // Apply to all channels
    data[i] = enhanced;     // Red
    data[i + 1] = enhanced; // Green  
    data[i + 2] = enhanced; // Blue
    // Alpha channel remains unchanged
  }
  
  return imageData;
}

/**
 * Apply Georgian character encoding fixes and OCR cleanup
 */
function applyGeorgianEncodingFixes(text: string): string {
  let cleanedText = text;
  
  // Fix common Georgian OCR misrecognitions
  const georgianFixes = {
    // Common character confusions in Georgian OCR
    'იი': 'ი',    // Double i to single i
    'ლლ': 'ლ',    // Double l to single l
    'დდ': 'დ',    // Double d to single d
    'მმ': 'მ',    // Double m to single m
    'ნნ': 'ნ',    // Double n to single n
    'სსს': 'ს',   // Triple s to single s
    'თთ': 'თ',    // Double th to single th
    
    // Fix common symbol confusions
    '©': '',      // Remove copyright symbols
    '®': '',      // Remove registered symbols
    '™': '',      // Remove trademark symbols
    '§': '',      // Remove section symbols
    '£': '',      // Remove pound symbols
    'NaN': '',    // Remove NaN artifacts
    
    // Fix spacing around Georgian punctuation
    ' , ': ', ',  // Fix comma spacing
    ' . ': '. ',  // Fix period spacing
    ' : ': ': ',  // Fix colon spacing
    ' ; ': '; ',  // Fix semicolon spacing
  };
  
  // Apply Georgian character fixes
  for (const [wrong, correct] of Object.entries(georgianFixes)) {
    cleanedText = cleanedText.replace(new RegExp(escapeRegExp(wrong), 'g'), correct);
  }
  
  // Remove excessive punctuation and symbols
  cleanedText = cleanedText
    .replace(/[©®™§£]+/g, '') // Remove legal symbols
    .replace(/\s*[<>|]+\s*/g, ' ') // Remove arrow-like symbols
    .replace(/\s*[=]+\s*/g, ' ') // Remove multiple equals
    .replace(/\s*[%]+\s*/g, '%') // Normalize percent signs
    .replace(/\s*[&]+\s*/g, ' და ') // Replace & with Georgian "and"
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .trim();
  
  // Remove lines that are mostly garbled (more than 50% non-Georgian/Latin/Cyrillic)
  const lines = cleanedText.split('\n');
  const cleanLines = lines.filter(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length < 3) return false; // Remove very short lines
    
    // Count valid characters (Georgian, Latin, Cyrillic, numbers, common punctuation)
    const validChars = trimmedLine.match(/[ა-ჰა-ჿა-ჯa-zA-Zа-яё0-9\s.,;:()-]/g) || [];
    const validRatio = validChars.length / trimmedLine.length;
    
    return validRatio > 0.5; // Keep lines with >50% valid characters
  });
  
  return cleanLines.join('\n').trim();
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get estimated processing time for image OCR based on file size
 */
export function estimateImageOcrProcessingTime(fileSizeBytes: number): number {
  // Rough estimates: ~3-10 seconds depending on image size and complexity
  const baseMB = fileSizeBytes / (1024 * 1024);
  const baseTimePerMB = 3000; // 3 seconds per MB
  const maxTime = 15000; // Cap at 15 seconds
  
  return Math.min(Math.round(baseTimePerMB * Math.max(baseMB, 0.5)), maxTime);
}

/**
 * Check if a file is a supported image type for OCR
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') && [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff'
  ].includes(file.type.toLowerCase());
}