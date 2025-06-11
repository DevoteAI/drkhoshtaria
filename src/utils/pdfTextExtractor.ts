import * as pdfjsLib from 'pdfjs-dist';
import { shouldUseOCR, extractTextFromPdfWithOCR, estimateOcrProcessingTime } from './ocrExtractor';

// Set the worker source to use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PdfTextExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
  usedOCR?: boolean;
  ocrConfidence?: number;
  processingTime?: number;
}

/**
 * Extract text content from a PDF file using PDF.js
 * Properly handles Georgian text and other Unicode characters
 */
export async function extractTextFromPdf(
  file: File, 
  onProgress?: (progress: { 
    stage: 'analyzing' | 'extracting' | 'ocr' | 'complete';
    stageDescription: string;
    percentage?: number;
    estimatedTimeRemaining?: string;
    currentPage?: number;
    totalPages?: number;
    method?: 'standard' | 'ocr';
  }) => void
): Promise<PdfTextExtractionResult> {
  try {
    console.log('📄 Starting PDF text extraction:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Initial progress
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        stageDescription: 'Loading PDF document...',
        percentage: 5
      });
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document with enhanced options for Georgian text
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true, // Better support for Georgian fonts
      disableFontFace: false, // Allow custom font faces
      fontExtraProperties: true, // Extract additional font properties
      verbosity: 0 // Reduce console noise
    }).promise;

    console.log('📖 PDF loaded successfully:', {
      pageCount: pdf.numPages,
      fileName: file.name,
      fingerprint: pdf.fingerprints?.[0] || 'unknown'
    });

    // Progress update after loading
    if (onProgress) {
      onProgress({
        stage: 'extracting',
        stageDescription: `Extracting text from ${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}...`,
        percentage: 15,
        totalPages: pdf.numPages
      });
    }

    let fullText = '';
    let totalItemsProcessed = 0;
    let totalItemsWithText = 0;
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        // Update progress for each page
        if (onProgress) {
          const pageProgress = 15 + (pageNum / pdf.numPages) * 60; // 15% to 75%
          onProgress({
            stage: 'extracting',
            stageDescription: `Processing page ${pageNum} of ${pdf.numPages}...`,
            percentage: Math.round(pageProgress),
            currentPage: pageNum,
            totalPages: pdf.numPages,
            method: 'standard'
          });
        }

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent({
          includeMarkedContent: true // Include semantic structure
        });
        
        console.log(`📝 Page ${pageNum} text content analysis:`, {
          pageNum,
          totalItems: textContent.items.length,
          itemTypes: textContent.items.map(item => ({
            hasStr: 'str' in item,
            strLength: 'str' in item ? item.str?.length || 0 : 0,
            hasTransform: 'transform' in item,
            hasDir: 'dir' in item
          }))
        });
        
        // Process text items with proper Georgian character handling
        const pageTextItems: string[] = [];
        
        for (const item of textContent.items) {
          totalItemsProcessed++;
          
          if ('str' in item && item.str) {
            let text = item.str;
            
            // Log original text for debugging
            if (text.trim()) {
              console.log(`🔍 Found text item:`, {
                pageNum,
                originalText: text.substring(0, 100),
                textLength: text.length,
                hasUnicode: /[\u0080-\uFFFF]/.test(text),
                hasGeorgian: /[\u10A0-\u10FF]/.test(text),
                hasRussian: /[\u0400-\u04FF]/.test(text),
                hasEncodedChars: /[À-ÿ]/.test(text)
              });
            }
            
            // Fix common character encoding issues for Georgian, Russian, and English text
            text = fixMultiLanguageEncoding(text);
            
            // Clean up the text
            text = text.trim();
            
            if (text) {
              pageTextItems.push(text);
              totalItemsWithText++;
            }
          } else {
            // Log items without text for debugging
            console.log(`ℹ️ Non-text item found:`, {
              pageNum,
              itemType: typeof item,
              hasStr: 'str' in item,
              keys: Object.keys(item)
            });
          }
        }
        
        // Combine text items with appropriate spacing
        const pageText = pageTextItems.join(' ').trim();
        
        if (pageText) {
          fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
        }
        
        console.log(`📝 Page ${pageNum} extraction summary:`, {
          pageNum,
          pageTextLength: pageText.length,
          itemsProcessed: textContent.items.length,
          itemsWithText: pageTextItems.length,
          hasGeorgianChars: /[\u10A0-\u10FF]/.test(pageText),
          hasRussianChars: /[\u0400-\u04FF]/.test(pageText),
          hasEncodedChars: /[À-ÿ]/.test(pageText),
          preview: pageText.substring(0, 100) + '...'
        });
        
      } catch (pageError) {
        console.warn(`⚠️ Error extracting text from page ${pageNum}:`, {
          pageNum,
          error: pageError,
          message: pageError instanceof Error ? pageError.message : 'Unknown page error'
        });
        // Continue with other pages even if one fails
      }
    }

    // Clean up the extracted text
    const cleanedText = fullText
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    const result: PdfTextExtractionResult = {
      text: cleanedText,
      pageCount: pdf.numPages,
      success: true
    };

    // Final progress update for standard extraction
    if (onProgress) {
      onProgress({
        stage: 'complete',
        stageDescription: cleanedText.length > 0 ? 'Text extraction completed' : 'No text content found',
        percentage: cleanedText.length > 0 ? 85 : 75, // Leave room for OCR if needed
        method: 'standard'
      });
    }

    console.log('✅ PDF text extraction completed:', {
      fileName: file.name,
      totalTextLength: cleanedText.length,
      pageCount: pdf.numPages,
      totalItemsProcessed,
      totalItemsWithText,
      extractionEfficiency: totalItemsProcessed > 0 ? (totalItemsWithText / totalItemsProcessed * 100).toFixed(1) + '%' : '0%',
      hasGeorgianChars: /[\u10A0-\u10FF]/.test(cleanedText),
      hasRussianChars: /[\u0400-\u04FF]/.test(cleanedText),
      hasEncodedChars: /[À-ÿ]/.test(cleanedText),
      preview: cleanedText.substring(0, 200) + '...',
      isEmpty: cleanedText.length === 0
    });

    // If no text was extracted, try alternative extraction methods
    if (cleanedText.length === 0 && pdf.numPages > 0) {
      console.warn('🔍 No text extracted with standard method, analyzing PDF structure...');
      
      let hasTextOperators = false;
      
      try {
        // Try to get more detailed page analysis
        const firstPage = await pdf.getPage(1);
        const operatorList = await firstPage.getOperatorList();
        
        hasTextOperators = operatorList.fnArray.some(op => 
          typeof op === 'number' && (
            op === 49 || // showText
            op === 50 || // showSpacedText  
            op === 51 || // nextLineShowText
            op === 52    // nextLineSetSpacingShowText
          )
        );
        
        console.log('🔬 PDF structure analysis:', {
          fileName: file.name,
          operatorCount: operatorList.fnArray.length,
          operators: operatorList.fnArray.slice(0, 10), // First 10 operators
          hasTextOperators
        });
        
      } catch (analysisError) {
        console.warn('⚠️ Could not analyze PDF structure:', analysisError);
      }
      
      // Check if we should try OCR
      if (shouldUseOCR({ text: cleanedText, pageCount: pdf.numPages, success: true }, hasTextOperators)) {
        console.log('🔍 PDF appears to be image-based, attempting OCR extraction...');
        
        const estimatedTime = estimateOcrProcessingTime(file.size, pdf.numPages);
        console.log(`⏱️ Estimated OCR processing time: ~${Math.round(estimatedTime / 1000)} seconds`);
        
        // Progress update for OCR start
        if (onProgress) {
          onProgress({
            stage: 'ocr',
            stageDescription: 'No standard text found. Starting OCR analysis...',
            percentage: 80,
            estimatedTimeRemaining: `~${Math.round(estimatedTime / 1000)}s`,
            method: 'ocr'
          });
        }
        
        try {
          const ocrResult = await extractTextFromPdfWithOCR(file, (ocrProgress) => {
            if (onProgress) {
              onProgress({
                stage: 'ocr',
                stageDescription: ocrProgress.stageDescription,
                percentage: ocrProgress.percentage,
                currentPage: ocrProgress.currentPage,
                totalPages: ocrProgress.totalPages,
                estimatedTimeRemaining: ocrProgress.timeEstimate ? `${ocrProgress.timeEstimate}s` : undefined,
                method: 'ocr'
              });
            }
          });
          
          if (ocrResult.success && ocrResult.text.trim()) {
            console.log('🎯 OCR extraction successful, using OCR results');
            
            // Final progress update
            if (onProgress) {
              onProgress({
                stage: 'complete',
                stageDescription: 'OCR text extraction completed',
                percentage: 100,
                method: 'ocr'
              });
            }
            
            return {
              text: ocrResult.text,
              pageCount: ocrResult.pageCount,
              success: true,
              usedOCR: true,
              ocrConfidence: ocrResult.confidence,
              processingTime: ocrResult.processingTime
            };
          } else {
            console.warn('⚠️ OCR extraction failed or found no text:', ocrResult.error);
          }
          
        } catch (ocrError) {
          console.error('❌ OCR extraction error:', ocrError);
        }
      }
    }

    return result;

  } catch (error) {
    console.error('❌ PDF text extraction failed:', {
      fileName: file.name,
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      text: '',
      pageCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fix common character encoding issues for Georgian, Russian, and English text
 */
function fixMultiLanguageEncoding(text: string): string {
  // Common Georgian character mappings for encoding issues
  const georgianMappings: { [key: string]: string } = {
    // Fix common Latin-to-Georgian character substitutions
    'À': 'ა', 'Á': 'ბ', 'Â': 'გ', 'Ã': 'დ', 'Ä': 'ე', 'Å': 'ვ', 'Æ': 'ზ', 'Ç': 'თ',
    'È': 'ი', 'É': 'კ', 'Ê': 'ლ', 'Ë': 'მ', 'Ì': 'ნ', 'Í': 'ო', 'Î': 'პ', 'Ï': 'ჟ',
    'Ð': 'რ', 'Ñ': 'ს', 'Ò': 'ტ', 'Ó': 'უ', 'Ô': 'ფ', 'Õ': 'ქ', 'Ö': 'ღ', '×': 'ყ',
    'Ø': 'შ', 'Ù': 'ჩ', 'Ú': 'ც', 'Û': 'ძ', 'Ü': 'წ', 'Ý': 'ჭ', 'Þ': 'ხ', 'ß': 'ჯ',
    'à': 'ჰ',
    
    // Additional common substitutions
    'Š': 'შ', 'š': 'შ',
    'Ž': 'ჟ', 'ž': 'ჟ',
    'Č': 'ჩ', 'č': 'ჩ',
    'Đ': 'დ', 'đ': 'დ'
  };
  
  // Common Russian character mappings for encoding issues
  const russianMappings: { [key: string]: string } = {
    // Cyrillic uppercase letters
    'À': 'А', 'Á': 'Б', 'Â': 'В', 'Ã': 'Г', 'Ä': 'Д', 'Å': 'Е', 'Æ': 'Ж', 'Ç': 'З',
    'È': 'И', 'É': 'Й', 'Ê': 'К', 'Ë': 'Л', 'Ì': 'М', 'Í': 'Н', 'Î': 'О', 'Ï': 'П',
    'Ð': 'Р', 'Ñ': 'С', 'Ò': 'Т', 'Ó': 'У', 'Ô': 'Ф', 'Õ': 'Х', 'Ö': 'Ц', '×': 'Ч',
    'Ø': 'Ш', 'Ù': 'Щ', 'Ú': 'Ъ', 'Û': 'Ы', 'Ü': 'Ь', 'Ý': 'Э', 'Þ': 'Ю', 'ß': 'Я',
    
    // Cyrillic lowercase letters
    'à': 'а', 'á': 'б', 'â': 'в', 'ã': 'г', 'ä': 'д', 'å': 'е', 'æ': 'ж', 'ç': 'з',
    'è': 'и', 'é': 'й', 'ê': 'к', 'ë': 'л', 'ì': 'м', 'í': 'н', 'î': 'о', 'ï': 'п',
    'ð': 'р', 'ñ': 'с', 'ò': 'т', 'ó': 'у', 'ô': 'ф', 'õ': 'х', 'ö': 'ц', '÷': 'ч',
    'ø': 'ш', 'ù': 'щ', 'ú': 'ъ', 'û': 'ы', 'ü': 'ь', 'ý': 'э', 'þ': 'ю', 'ÿ': 'я',
    
    // Special Cyrillic characters
    'Ё': 'Ё', 'ё': 'ё'
  };
  
  // Detect the language and apply appropriate mappings
  const detectedLanguage = detectTextLanguage(text);
  let fixedText = text;
  
  if (detectedLanguage === 'georgian') {
    // Apply Georgian character mappings
    for (const [latin, georgian] of Object.entries(georgianMappings)) {
      fixedText = fixedText.replace(new RegExp(latin, 'g'), georgian);
    }
    
    console.log('🔄 Applied Georgian character mapping:', {
      original: text.substring(0, 50),
      fixed: fixedText.substring(0, 50),
      language: 'Georgian'
    });
  } else if (detectedLanguage === 'russian') {
    // Apply Russian character mappings
    for (const [latin, russian] of Object.entries(russianMappings)) {
      fixedText = fixedText.replace(new RegExp(latin, 'g'), russian);
    }
    
    console.log('🔄 Applied Russian character mapping:', {
      original: text.substring(0, 50),
      fixed: fixedText.substring(0, 50),
      language: 'Russian'
    });
  } else if (detectedLanguage === 'mixed') {
    // For mixed text, try both mappings but be more conservative
    // First check if it looks more Georgian or Russian
    const georgianLikeCount = (text.match(/[ÀÂÉÓÔÕÖ×ØÙ]/g) || []).length;
    const russianLikeCount = (text.match(/[àáâãäåæçèéêëìíîï]/g) || []).length;
    
    if (georgianLikeCount > russianLikeCount) {
      // Apply Georgian mappings
      for (const [latin, georgian] of Object.entries(georgianMappings)) {
        fixedText = fixedText.replace(new RegExp(latin, 'g'), georgian);
      }
      console.log('🔄 Applied Georgian character mapping (mixed text):', {
        original: text.substring(0, 50),
        fixed: fixedText.substring(0, 50),
        language: 'Mixed (Georgian priority)'
      });
    } else {
      // Apply Russian mappings
      for (const [latin, russian] of Object.entries(russianMappings)) {
        fixedText = fixedText.replace(new RegExp(latin, 'g'), russian);
      }
      console.log('🔄 Applied Russian character mapping (mixed text):', {
        original: text.substring(0, 50),
        fixed: fixedText.substring(0, 50),
        language: 'Mixed (Russian priority)'
      });
    }
  }
  // For English text, no mappings needed - it should already be correct
  
  return fixedText;
}

/**
 * Detect the primary language of the text based on character patterns
 */
function detectTextLanguage(text: string): 'georgian' | 'russian' | 'english' | 'mixed' {
  // Check for existing proper Unicode characters
  const hasGeorgian = /[\u10A0-\u10FF]/.test(text);
  const hasRussian = /[\u0400-\u04FF]/.test(text);
  const hasEnglish = /[A-Za-z]/.test(text);
  
  // If we already have proper Unicode characters, no conversion needed
  if (hasGeorgian && !hasRussian) return 'georgian';
  if (hasRussian && !hasGeorgian) return 'russian';
  if (hasEnglish && !hasGeorgian && !hasRussian) return 'english';
  if ((hasGeorgian || hasRussian) && hasEnglish) return 'mixed';
  
  // Check for encoding issues - look for Latin characters that might be encoded text
  const hasEncodedText = /[À-ÿ]/.test(text);
  if (!hasEncodedText) return 'english'; // Likely clean English text
  
  // Analyze patterns to determine likely language
  // Georgian pattern indicators (common Georgian character combinations when encoded)
  const georgianPatterns = [
    /ÀÌÄÀÍÏ/g, // "ამდანო" pattern
    /ÂÉÍÄÊÏËÏÂÉ/g, // "გინეკოლოგი" pattern
    /ÃÄÐÀÒÔÀÌÄÍÔÉ/g, // "დეპარტამენტი" pattern
    /ÓÀØÀÒÈÅÄËÏ/g, // "საქართველო" pattern
    /[ÀÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß]/g // Georgian-like uppercase
  ];
  
  // Russian pattern indicators
  const russianPatterns = [
    /[àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/g, // Russian-like lowercase
    /ÐÎÑÑÈÉÑÊÀŸ/g, // "РОССИЙСКАЯ" pattern
    /ÔÅÄÅÐÀÖÈŸ/g, // "ФЕДЕРАЦИЯ" pattern
    /ÎÁËÀÑÒÜ/g // "ОБЛАСТЬ" pattern
  ];
  
  const georgianMatches = georgianPatterns.reduce((sum, pattern) => sum + (text.match(pattern) || []).length, 0);
  const russianMatches = russianPatterns.reduce((sum, pattern) => sum + (text.match(pattern) || []).length, 0);
  
  if (georgianMatches > russianMatches && georgianMatches > 0) return 'georgian';
  if (russianMatches > georgianMatches && russianMatches > 0) return 'russian';
  if (georgianMatches > 0 && russianMatches > 0) return 'mixed';
  
  // Default fallback - if we can't determine, assume it needs Georgian mapping
  // (since this was the original issue)
  return hasEncodedText ? 'georgian' : 'english';
}

/**
 * Check if a file is a PDF
 */
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