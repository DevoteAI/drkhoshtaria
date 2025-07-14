import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { shouldUseOCR, extractTextFromPdfWithOCR, estimateOcrProcessingTime } from './ocrExtractor';
import { analyzeFonts, FontAnalysisResult, assessGeorgianTextQuality, shouldUseGoogleVision, hasGeorgianContent } from './pdfFontAnalyzer';
import { extractTextWithGoogleVision, isGoogleVisionAvailable } from './googleVisionExtractor';

// Set the worker source to use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PdfTextExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
  usedOCR?: boolean;
  usedGoogleVision?: boolean;
  ocrConfidence?: number;
  processingTime?: number;
  fontAnalysis?: FontAnalysisResult[];
}

export async function extractTextFromPdf(
  file: File, 
  onProgress?: (progress: {
    stage: 'analyzing' | 'extracting' | 'ocr' | 'complete';
    stageDescription: string;
    percentage?: number;
    estimatedTimeRemaining?: string;
    currentPage?: number;
    totalPages?: number;
    method?: 'standard' | 'ocr' | 'sylfaen' | 'bpg' | 'google-vision';
  }) => void
): Promise<PdfTextExtractionResult> {
  const startTime = Date.now();
  try {
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        stageDescription: 'Loading and analyzing PDF fonts...',
        percentage: 5
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const fontAnalysis = await analyzeFonts(pdfDoc);
    console.log('Font Analysis:', JSON.stringify(fontAnalysis, null, 2));

    let fullText = '';
    let extractionMethod: 'standard' | 'ocr' | 'google-vision' = 'standard';

    if (onProgress) {
      onProgress({
        stage: 'extracting',
        stageDescription: 'Using standard extraction method...',
        percentage: 15,
        method: 'standard',
      });
    }

    const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfjsDoc.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      // DIAGNOSTIC: Check text content quality before processing
      const rawItems = textContent.items.filter(item => 'str' in item && item.str.trim().length > 0);
      console.log(`📄 Page ${i}: Found ${rawItems.length} text items`);
      
      // Advanced text extraction with position-based deduplication
      let pageText = extractUniqueTextItems(rawItems);
      console.log(`📄 Page ${i}: Text length after deduplication: ${pageText.length} chars`);

      // Simple Unicode normalization only (no character mapping)
      pageText = pageText.normalize('NFKC');
      
      fullText += `\n\n--- Page ${i} ---\n${pageText}`;
    }

    let cleanedText = fullText.trim();
    
    console.log(`🔄 Original text length: ${cleanedText.length} characters`);
    
    // ULTRA-AGGRESSIVE: Remove the exact repetitive pattern you showed
    cleanedText = ultraAggressiveDedupe(cleanedText);
    
    console.log(`✅ Final text length: ${cleanedText.length} characters`);

    // Google Vision API Fallback (for problematic Georgian PDFs)
    const textQuality = assessGeorgianTextQuality(cleanedText);
    const googleVisionDecision = shouldUseGoogleVision(textQuality, extractionMethod, fontAnalysis);
    
    console.log(`📊 Text quality assessment:`, textQuality);
    console.log(`🤖 Google Vision decision:`, googleVisionDecision);

    if (googleVisionDecision.shouldUse && isGoogleVisionAvailable() && hasGeorgianContent(cleanedText)) {
        if (onProgress) {
            onProgress({
                stage: 'ocr',
                stageDescription: `${googleVisionDecision.reason}. Using Google Vision API...`,
                percentage: 70,
                method: 'google-vision',
            });
        }

        console.log(`🚀 Attempting Google Vision extraction: ${googleVisionDecision.reason}`);
        
        const googleVisionResult = await extractTextWithGoogleVision(file, onProgress ? (p) => {
            onProgress({
                ...p,
                stage: 'ocr',
                method: 'google-vision',
            });
        } : undefined);

        if (googleVisionResult.success && googleVisionResult.text.trim().length > cleanedText.length * 0.8) {
            console.log(`✅ Google Vision extraction successful, text length: ${googleVisionResult.text.length}`);
            cleanedText = googleVisionResult.text;
            extractionMethod = 'google-vision';
            
            // Re-assess quality after Google Vision
            const improvedQuality = assessGeorgianTextQuality(cleanedText);
            console.log(`📈 Improved text quality:`, improvedQuality);
        } else {
            console.log(`⚠️ Google Vision extraction failed or quality not improved, falling back to OCR`);
        }
    }

    // Tesseract OCR Fallback (final option)
    if (shouldUseOCR({ text: cleanedText, pageCount: numPages, success: true }) && extractionMethod !== 'google-vision') {
        if (onProgress) {
            onProgress({
                stage: 'ocr',
                stageDescription: 'Standard extraction quality is low. Falling back to OCR...',
                percentage: 75,
                method: 'ocr',
            });
        }
        const ocrResult = await extractTextFromPdfWithOCR(file, onProgress ? (p) => {
            onProgress({
                ...p,
                stage: 'ocr',
                method: 'ocr',
            });
        } : undefined);

        if (ocrResult.success && ocrResult.text.trim().length > cleanedText.length) {
            cleanedText = ocrResult.text;
            extractionMethod = 'ocr';
        }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    if (onProgress) {
        onProgress({
            stage: 'complete',
            stageDescription: 'Extraction complete.',
            percentage: 100,
            method: extractionMethod,
        });
    }

    return {
      text: cleanedText,
      pageCount: numPages,
      success: true,
      usedOCR: extractionMethod === 'ocr',
      usedGoogleVision: extractionMethod === 'google-vision',
      processingTime,
      fontAnalysis,
    };

  } catch (error) {
    console.error('Error during PDF text extraction:', error);
    const endTime = Date.now();
    return {
      text: '',
      pageCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: endTime - startTime,
    };
  }
}


function extractUniqueTextItems(rawItems: any[]): string {
  // Position-based deduplication to handle overlapping text items in PDFs
  const positionMap = new Map<string, string>();
  const threshold = 5; // pixels - items within 5px are considered duplicates
  
  for (const item of rawItems) {
    if (!('str' in item) || !item.str.trim()) continue;
    
    const text = item.str.trim();
    const x = Math.round((item.transform?.[4] || 0) / threshold) * threshold;
    const y = Math.round((item.transform?.[5] || 0) / threshold) * threshold;
    const positionKey = `${x},${y}`;
    
    // If this position already has text, choose the longer/more complete one
    const existingText = positionMap.get(positionKey) || '';
    if (text.length > existingText.length) {
      positionMap.set(positionKey, text);
    }
  }
  
  // Sort by Y position (top to bottom), then X position (left to right)
  const sortedItems = Array.from(positionMap.entries())
    .map(([pos, text]) => {
      const [x, y] = pos.split(',').map(Number);
      return { x, y, text };
    })
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > threshold) return b.y - a.y; // Top to bottom
      return a.x - b.x; // Left to right
    });
  
  const extractedText = sortedItems.map(item => item.text).join(' ');
  console.log(`🔍 Position-based dedup: ${rawItems.length} items → ${sortedItems.length} unique positions`);
  
  return extractedText;
}

function ultraAggressiveDedupe(text: string): string {
  console.log('🚀 Starting ultra-aggressive deduplication...');
  
  // Simple line-by-line exact duplicate removal
  const lines = text.split('\n');
  const uniqueLines: string[] = [];
  const seenLines = new Set<string>();
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !seenLines.has(trimmed)) {
      seenLines.add(trimmed);
      uniqueLines.push(line);
    }
  }
  
  const finalText = uniqueLines.join('\n');
  const reduction = Math.round((1 - finalText.length / text.length) * 100);
  
  console.log(`📊 Ultra-aggressive dedup: ${text.length} → ${finalText.length} chars (${reduction}% reduction)`);
  console.log(`📊 Removed ${lines.length - uniqueLines.length} duplicate lines`);
  
  return finalText;
}

function removeBlockDuplicates(text: string): string {
  // Ultra-aggressive deduplication for medical forms with massive repetition
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // First, identify and remove the most common repetitive blocks
  const blockCounts = new Map<string, number>();
  const blockSize = 8; // Larger blocks to catch medical measurement patterns
  
  // Count all block patterns
  for (let i = 0; i <= lines.length - blockSize; i++) {
    const block = lines.slice(i, i + blockSize);
    const blockText = block.join(' ');
    
    // Create a normalized signature for medical blocks
    const signature = blockText
      .replace(/\d+/g, 'NUM') // Replace all numbers
      .replace(/\d{2}\.\d{2}\.\d{2,4}წ/g, 'DATE') // Replace Georgian dates
      .replace(/ნნ/g, 'MM') // Replace measurement units
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
    
    if (signature.length > 50) { // Only consider substantial blocks
      blockCounts.set(signature, (blockCounts.get(signature) || 0) + 1);
    }
  }
  
  // Find the most repeated blocks (likely the problem patterns)
  const repetitiveBlocks = Array.from(blockCounts.entries())
    .filter(([signature, count]) => count > 3) // Appears more than 3 times
    .map(([signature]) => signature);
  
  console.log(`🔍 Found ${repetitiveBlocks.length} repetitive block patterns`);
  
  // Now rebuild the text, keeping only first occurrence of repetitive blocks
  const keptLines: string[] = [];
  const seenSignatures = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this position starts a repetitive block
    let isStartOfRepetitiveBlock = false;
    let blockLength = 0;
    
    for (const repetitiveSignature of repetitiveBlocks) {
      for (let size = 6; size <= 12; size++) { // Try different block sizes
        if (i + size <= lines.length) {
          const currentBlock = lines.slice(i, i + size);
          const currentSignature = currentBlock.join(' ')
            .replace(/\d+/g, 'NUM')
            .replace(/\d{2}\.\d{2}\.\d{2,4}წ/g, 'DATE')
            .replace(/NN|នន|ნო/g, 'MM')
            .replace(/\s+/g, ' ')
            .toLowerCase()
            .trim();
          
          if (currentSignature === repetitiveSignature) {
            if (seenSignatures.has(currentSignature)) {
              // Skip this repetitive block
              isStartOfRepetitiveBlock = true;
              blockLength = size;
              console.log(`🗑️ Skipping repetitive block at line ${i}`);
              break;
            } else {
              // First occurrence, keep it
              seenSignatures.add(currentSignature);
              break;
            }
          }
        }
      }
      if (isStartOfRepetitiveBlock) break;
    }
    
    if (isStartOfRepetitiveBlock) {
      // Skip the entire repetitive block
      i += blockLength - 1; // -1 because the loop will increment
    } else {
      // Keep this line
      keptLines.push(line);
    }
  }
  
  console.log(`📊 Block deduplication: ${lines.length} → ${keptLines.length} lines (${Math.round((1 - keptLines.length/lines.length) * 100)}% reduction)`);
  
  return keptLines.join('\n');
}

function removeMedicalPatternRepetition(text: string): string {
  // Target the specific repetitive medical measurement pattern
  const originalLength = text.length;
  
  // Pattern 1: Remove repeated medical measurement blocks
  const medicalBlockPattern = /მშობიარობის\s+სავარაუდო\s+ვადა[–-]\s*\d{2}\.\d{2}\.\d{2,4}წ\s+ფეტომეტრია\s+BPD.*?ნორმალური\s+განვითარების\./gs;
  
  let cleanedText = text;
  const matches = Array.from(text.matchAll(medicalBlockPattern));
  
  if (matches.length > 1) {
    console.log(`🔍 Found ${matches.length} repetitive medical measurement blocks`);
    
    // Keep only the first occurrence
    const firstMatch = matches[0];
    const firstBlock = firstMatch[0];
    
    // Replace all occurrences with just the first one
    cleanedText = text.replace(medicalBlockPattern, '').trim();
    cleanedText = firstBlock + '\n\n' + cleanedText;
  }
  
  // Pattern 2: Remove repeated fetometry lines
  const fetometryPattern = /ფეტომეტრია\s+BPD\s+თავის\s+ბიპარიეტალური\s+ზომა\s+\d+\s+ננ.*?FW\s+სავარაუდო\s+მასა\s+\d+\s+გ/gs;
  const fetometryMatches = Array.from(cleanedText.matchAll(fetometryPattern));
  
  if (fetometryMatches.length > 1) {
    console.log(`🔍 Found ${fetometryMatches.length} repetitive fetometry blocks`);
    const firstFetometry = fetometryMatches[0][0];
    cleanedText = cleanedText.replace(fetometryPattern, '');
    cleanedText = cleanedText + '\n\n' + firstFetometry;
  }
  
  // Pattern 3: Simple line-by-line exact duplicate removal
  const lines = cleanedText.split('\n');
  const uniqueLines: string[] = [];
  const seenExactLines = new Set<string>();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0) {
      if (!seenExactLines.has(trimmedLine)) {
        seenExactLines.add(trimmedLine);
        uniqueLines.push(line);
      }
    }
  }
  
  const finalText = uniqueLines.join('\n');
  const reductionPercentage = Math.round((1 - finalText.length / originalLength) * 100);
  
  console.log(`📊 Medical pattern removal: ${originalLength} → ${finalText.length} chars (${reductionPercentage}% reduction)`);
  
  return finalText;
}

function deduplicateExtractedText(text: string): string {
  // Medical forms have legitimate repetition patterns, so we need smarter deduplication
  const lines = text.split('\n');
  const processedLines: string[] = [];
  const exactDuplicates = new Set<string>();
  const semanticDuplicates = new Set<string>();
  
  // First pass: remove exact duplicates and page markers
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip page markers completely
    if (trimmedLine.match(/^--- Page \d+ ---$/)) {
      continue;
    }
    
    // Skip empty lines
    if (trimmedLine.length === 0) {
      continue;
    }
    
    // Track exact duplicates but allow first occurrence
    if (!exactDuplicates.has(trimmedLine)) {
      exactDuplicates.add(trimmedLine);
      processedLines.push(trimmedLine);
    }
  }
  
  // Second pass: reduce semantic duplicates while preserving medical form structure
  const finalLines: string[] = [];
  const medicalKeywords = [
    'სამედიცინო', 'პაციენტი', 'დიაგნოზი', 'ანალიზი', 'განკურნება', 'თარიღი',
    'გამოკვლევა', 'ექიმი', 'კლინიკა', 'სპეციალისტი', 'რეკომენდაცია',
    'სამეანო', 'გინეკოლოგიური', 'დეპარტამენტი', 'საქართველო', 'თბილისი',
    'ღია', 'გული', 'ჰოსპიტალი', 'პაციენტის', 'ასაკი', 'მშობიარობის',
    'ექოსკოპიური', 'ფეტომეტრია', 'ანალიზი', 'BPD', 'HC', 'AC', 'FL'
  ];
  
  for (const line of processedLines) {
    // Always preserve lines with medical keywords (these are likely important content)
    const hasMedicalContent = medicalKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasMedicalContent) {
      finalLines.push(line);
      continue;
    }
    
    // For non-medical lines, check for semantic similarity
    const words = line.split(' ').filter(w => w.length > 2);
    if (words.length < 2) {
      finalLines.push(line);
      continue;
    }
    
    // Create semantic signature (first 3 meaningful words)
    const semanticSignature = words
      .filter(w => !/^\d+$/.test(w) && w.length > 2)
      .slice(0, 3)
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, ''); // Remove punctuation
    
    // Only skip if we've seen this exact semantic pattern AND it's not critical info
    if (!semanticDuplicates.has(semanticSignature) || semanticSignature.length < 8) {
      semanticDuplicates.add(semanticSignature);
      finalLines.push(line);
    }
  }
  
  // Final cleanup: remove lines that are just numbers/dates/single words (often artifacts)
  const cleanedLines = finalLines.filter(line => {
    const trimmed = line.trim();
    // Keep lines that have medical relevance or are substantial content
    return trimmed.length > 8 || 
           /[აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ]/.test(trimmed) ||
           medicalKeywords.some(keyword => trimmed.toLowerCase().includes(keyword.toLowerCase()));
  });
  
  console.log(`📊 Deduplication stats: ${lines.length} → ${cleanedLines.length} lines (${Math.round((1 - cleanedLines.length/lines.length) * 100)}% reduction)`);
  
  return cleanedLines.join('\n');
}