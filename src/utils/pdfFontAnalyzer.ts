import { PDFDocument, PDFFont, PDFName, PDFDict, PDFHexString } from 'pdf-lib';

export interface FontAnalysisResult {
  hasToUnicodeCMap: boolean;
  fontType: string;
  encoding: string;
  isSymbolic: boolean;
  isGeorgianProblem: boolean;
  recommendedMapping: 'standard' | 'sylfaen' | 'bpg' | 'latin-extended' | 'ocr';
  confidence: number;
  diagnostics: string[];
}

export interface PDFEncodingAnalysis {
  fonts: FontAnalysisResult[];
  overallRecommendation: 'standard' | 'sylfaen' | 'bpg' | 'latin-extended' | 'ocr';
  confidence: number;
  hasEncodingIssues: boolean;
  georgianFontsDetected: boolean;
}

/**
 * Analyze PDF font dictionaries to detect encoding issues that affect Georgian text extraction
 */
export async function analyzeFonts(pdfDoc: PDFDocument): Promise<FontAnalysisResult[]> {
  const fontAnalysis: FontAnalysisResult[] = [];
  const diagnostics: string[] = [];

  // Get all font references from the PDF
  const catalog = pdfDoc.catalog;
  const pages = catalog.lookup(PDFName.of('Pages'), PDFDict);

  if (pages) {
    const pageRefs = await getAllPageRefs(pdfDoc);

    for (const pageRef of pageRefs) {
      const page = pdfDoc.context.lookup(pageRef, PDFDict);
      if (page) {
        const resources = page.lookup(PDFName.of('Resources'), PDFDict);
        if (resources) {
          const fonts = resources.lookup(PDFName.of('Font'), PDFDict);
          if (fonts) {
            const fontEntries = fonts.entries();
            for (const [fontName, fontRef] of fontEntries) {
              const fontDict = pdfDoc.context.lookup(fontRef, PDFDict);
              if (fontDict) {
                const analysis = analyzeFontDictionary(fontDict, fontName.decodeText(), diagnostics);
                fontAnalysis.push(analysis);
              }
            }
          }
        }
      }
    }
  }
  return fontAnalysis;
}

  

/**
 * Analyze individual font dictionary for encoding issues
 */
function analyzeFontDictionary(fontDict: PDFDict, fontName: string, diagnostics: string[]): FontAnalysisResult {
  const result: FontAnalysisResult = {
    hasToUnicodeCMap: false,
    fontType: 'Unknown',
    encoding: 'Unknown',
    isSymbolic: false,
    isGeorgianProblem: false,
    recommendedMapping: 'standard',
    confidence: 0.5,
    diagnostics: []
  };
  
  try {
    // Check font type
    const subtype = fontDict.lookup(PDFName.of('Subtype'));
    if (subtype) {
      result.fontType = subtype.toString();
    }
    
    // Check for ToUnicode CMap
    const toUnicode = fontDict.lookup(PDFName.of('ToUnicode'));
    result.hasToUnicodeCMap = !!toUnicode;
    
    // Check encoding
    const encoding = fontDict.lookup(PDFName.of('Encoding'));
    if (encoding) {
      result.encoding = encoding.toString();
    }
    
    // Check font descriptor for symbolic flag
    const fontDescriptor = fontDict.lookup(PDFName.of('FontDescriptor'), PDFDict);
    if (fontDescriptor) {
      const flags = fontDescriptor.lookup(PDFName.of('Flags'));
      if (flags && typeof flags.asNumber === 'function') {
        const flagValue = flags.asNumber();
        result.isSymbolic = (flagValue & 4) !== 0; // Bit 3 indicates symbolic
      }
      
      // Check font name for Georgian-problematic fonts
      const fontNameObj = fontDescriptor.lookup(PDFName.of('FontName'));
      if (fontNameObj) {
        const fontNameStr = fontNameObj.toString().toLowerCase();
        result.isGeorgianProblem = isGeorgianProblematicFont(fontNameStr);
      }
    }
    
    // Check base font name as well
    const baseFont = fontDict.lookup(PDFName.of('BaseFont'));
    if (baseFont) {
      const baseFontStr = baseFont.toString().toLowerCase();
      if (isGeorgianProblematicFont(baseFontStr)) {
        result.isGeorgianProblem = true;
      }
    }
    
    // Determine recommended mapping based on analysis
    const recommendation = determineRecommendedMapping(result, fontName);
    result.recommendedMapping = recommendation.mapping;
    result.confidence = recommendation.confidence;
    result.diagnostics = recommendation.diagnostics;
    
    diagnostics.push(...result.diagnostics);
    
  } catch (error) {
    result.diagnostics.push(`Font analysis error: ${error}`);
    result.confidence = 0.1;
  }
  
  return result;
}

/**
 * Check if font name indicates Georgian encoding problems
 */
function isGeorgianProblematicFont(fontName: string): boolean {
  const problematicPatterns = [
    'sylfaen',
    'bpg',
    'adigine',
    'georgian',
    'kartuli',
    'mhedruli',
    'mkhedruli',
    'nuskhuri',
    'parliament',
    'unicode-bmp',
    'unicodebmp'
  ];
  
  return problematicPatterns.some(pattern => fontName.includes(pattern));
}

/**
 * Determine recommended character mapping based on font analysis
 */
function determineRecommendedMapping(
  fontResult: FontAnalysisResult, 
  fontName: string
): { mapping: FontAnalysisResult['recommendedMapping']; confidence: number; diagnostics: string[] } {
  const diagnostics: string[] = [];
  let mapping: FontAnalysisResult['recommendedMapping'] = 'standard';
  let confidence = 0.5;
  
  // High confidence patterns
  if (fontResult.isGeorgianProblem) {
    const fontNameLower = fontName.toLowerCase();
    
    if (fontNameLower.includes('sylfaen')) {
      mapping = 'sylfaen';
      confidence = 0.9;
      diagnostics.push('Sylfaen font detected - using Sylfaen character mappings');
    } else if (fontNameLower.includes('bpg')) {
      mapping = 'bpg';
      confidence = 0.9;
      diagnostics.push('BPG font detected - using BPG character mappings');
    } else {
      mapping = 'latin-extended';
      confidence = 0.7;
      diagnostics.push('Georgian-problematic font detected - using Latin Extended mappings');
    }
  }
  
  // Check for missing ToUnicode CMap
  if (!fontResult.hasToUnicodeCMap) {
    if (mapping === 'standard') {
      mapping = 'latin-extended';
      confidence = Math.max(confidence, 0.6);
    }
    diagnostics.push('Missing ToUnicode CMap - may cause character mapping issues');
  }
  
  // Check for symbolic fonts
  if (fontResult.isSymbolic && mapping === 'standard') {
    mapping = 'latin-extended';
    confidence = Math.max(confidence, 0.6);
    diagnostics.push('Symbolic font detected - may need character mapping');
  }
  
  // Check encoding issues
  if (fontResult.encoding.includes('Identity') && !fontResult.hasToUnicodeCMap) {
    if (mapping === 'standard') {
      mapping = 'ocr';
      confidence = 0.8;
    }
    diagnostics.push('Identity encoding without ToUnicode CMap - recommend OCR');
  }
  
  return { mapping, confidence, diagnostics };
}

/**
 * Determine overall recommendation for the entire PDF
 */
function determineOverallRecommendation(
  fontAnalysis: FontAnalysisResult[], 
  diagnostics: string[]
): { 
  recommendation: PDFEncodingAnalysis['overallRecommendation']; 
  confidence: number; 
  hasIssues: boolean;
  georgianDetected: boolean;
} {
  if (fontAnalysis.length === 0) {
    return {
      recommendation: 'ocr',
      confidence: 0.3,
      hasIssues: true,
      georgianDetected: false
    };
  }
  
  const georgianFonts = fontAnalysis.filter(f => f.isGeorgianProblem);
  const hasGeorgianFonts = georgianFonts.length > 0;
  
  const hasEncodingIssues = fontAnalysis.some(f => 
    !f.hasToUnicodeCMap || 
    f.isSymbolic || 
    f.encoding.includes('Identity')
  );
  
  // Count mapping recommendations
  const mappingCounts = {
    standard: 0,
    sylfaen: 0,
    bpg: 0,
    'latin-extended': 0,
    ocr: 0
  };
  
  let totalConfidence = 0;
  for (const font of fontAnalysis) {
    mappingCounts[font.recommendedMapping]++;
    totalConfidence += font.confidence;
  }
  
  const avgConfidence = totalConfidence / fontAnalysis.length;
  
  // Determine primary recommendation
  let recommendation: PDFEncodingAnalysis['overallRecommendation'] = 'standard';
  let maxCount = mappingCounts.standard;
  
  for (const [mapping, count] of Object.entries(mappingCounts)) {
    if (count > maxCount) {
      maxCount = count;
      recommendation = mapping as PDFEncodingAnalysis['overallRecommendation'];
    }
  }
  
  // Override with Georgian-specific logic if Georgian fonts detected
  if (hasGeorgianFonts) {
    const georgianRecommendations = georgianFonts.map(f => f.recommendedMapping);
    const sylfaenCount = georgianRecommendations.filter(r => r === 'sylfaen').length;
    const bpgCount = georgianRecommendations.filter(r => r === 'bpg').length;
    
    if (sylfaenCount > 0) {
      recommendation = 'sylfaen';
    } else if (bpgCount > 0) {
      recommendation = 'bpg';
    } else {
      recommendation = 'latin-extended';
    }
  }
  
  return {
    recommendation,
    confidence: avgConfidence,
    hasIssues: hasEncodingIssues || hasGeorgianFonts,
    georgianDetected: hasGeorgianFonts
  };
}

/**
 * Get all page references from PDF document
 */
async function getAllPageRefs(pdfDoc: PDFDocument): Promise<any[]> {
  const pageRefs: any[] = [];
  
  try {
    const catalog = pdfDoc.catalog;
    const pages = catalog.lookup(PDFName.of('Pages'), PDFDict);
    
    if (pages) {
      const kids = pages.lookup(PDFName.of('Kids'));
      if (kids && Array.isArray(kids)) {
        for (const kid of kids) {
          pageRefs.push(kid);
        }
      }
    }
  } catch (error) {
    console.warn('Error getting page refs:', error);
  }
  
  return pageRefs;
}

/**
 * Simple quality assessment of extracted text for Georgian content
 */
export function assessGeorgianTextQuality(text: string): {
  quality: 'good' | 'poor' | 'garbled';
  confidence: number;
  georgianRatio: number;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for Georgian characters
  const georgianChars = text.match(/[\u10A0-\u10FF]/g) || [];
  const georgianRatio = georgianChars.length / text.length;
  
  // Check for garbled patterns (Latin Extended mixed with Georgian)
  const latinExtended = text.match(/[À-ÿ]/g) || [];
  const latinExtendedRatio = latinExtended.length / text.length;
  
  // Check for repeated nonsensical patterns
  const repeatedPatterns = text.match(/(.{5,})\1{2,}/g) || [];
  
  let quality: 'good' | 'poor' | 'garbled' = 'good';
  let confidence = 0.8;
  
  if (latinExtendedRatio > 0.1) {
    quality = 'garbled';
    confidence = 0.9;
    issues.push('High Latin Extended character ratio suggests encoding issues');
  }
  
  if (repeatedPatterns.length > 5) {
    quality = 'poor';
    confidence = Math.max(confidence, 0.7);
    issues.push('Repeated text patterns detected');
  }
  
  if (georgianRatio > 0 && georgianRatio < 0.3) {
    quality = 'poor';
    confidence = Math.max(confidence, 0.6);
    issues.push('Low Georgian character ratio in Georgian document');
  }
  
  // Check for specific garbled patterns we know about
  const knownGarbledPatterns = [
    'უანეაოჟ',
    'გკოელჟმჟგკღტკ',
    'დერატფანეოფკ',
    'ლშობიაპობის',
    'სავაპაუდო'
  ];
  
  const garbledMatches = knownGarbledPatterns.filter(pattern => text.includes(pattern));
  if (garbledMatches.length > 0) {
    quality = 'garbled';
    confidence = 0.95;
    issues.push(`Known garbled patterns detected: ${garbledMatches.join(', ')}`);
  }
  
  return {
    quality,
    confidence,
    georgianRatio,
    issues
  };
}

/**
 * Determine if Google Vision API should be used for text extraction
 * Based on Georgian content quality and encoding issues
 */
export function shouldUseGoogleVision(
  textQuality: ReturnType<typeof assessGeorgianTextQuality>,
  extractionMethod: string,
  fontAnalysis?: FontAnalysisResult[]
): {
  shouldUse: boolean;
  reason: string;
  confidence: number;
} {
  // Don't use if Google Vision is not the next logical step
  if (extractionMethod === 'ocr' || extractionMethod === 'google-vision') {
    return {
      shouldUse: false,
      reason: 'Already using advanced extraction method',
      confidence: 0
    };
  }

  // Primary trigger: Garbled Georgian text with high confidence
  if (textQuality.quality === 'garbled' && textQuality.confidence > 0.6) {
    return {
      shouldUse: true,
      reason: 'Garbled Georgian text detected with high confidence',
      confidence: textQuality.confidence
    };
  }

  // Secondary trigger: Poor quality Georgian text with encoding issues
  if (textQuality.quality === 'poor' && 
      textQuality.georgianRatio > 0.1 && 
      textQuality.confidence > 0.5) {
    
    // Check if font analysis suggests encoding problems
    const hasEncodingIssues = fontAnalysis?.some(font => 
      font.isGeorgianProblem || 
      !font.hasToUnicodeCMap ||
      font.recommendedMapping !== 'standard'
    );

    if (hasEncodingIssues) {
      return {
        shouldUse: true,
        reason: 'Poor Georgian text quality with font encoding issues',
        confidence: 0.8
      };
    }
  }

  // Tertiary trigger: "Good" quality text but with Georgian content and encoding artifacts
  if (textQuality.quality === 'good' && 
      textQuality.georgianRatio > 0.3 && 
      textQuality.issues.length > 0) {
    return {
      shouldUse: true,
      reason: 'Good quality text but Georgian encoding artifacts detected',
      confidence: 0.7
    };
  }

  // Quaternary trigger: High Latin Extended character ratio (mojibake indicator)
  const latinExtendedIssue = textQuality.issues.find(issue => 
    issue.includes('Latin Extended')
  );
  
  if (latinExtendedIssue && textQuality.confidence > 0.7) {
    return {
      shouldUse: true,
      reason: 'Strong Latin Extended encoding issues detected',
      confidence: 0.8
    };
  }

  // Don't use Google Vision for good quality text or non-Georgian content
  return {
    shouldUse: false,
    reason: textQuality.quality === 'good' 
      ? 'Text quality is already good' 
      : 'Insufficient Georgian content or confidence for premium extraction',
    confidence: 0
  };
}

/**
 * Check if text appears to contain Georgian content
 * Useful for filtering when to apply Georgian-specific processing
 */
export function hasGeorgianContent(text: string): boolean {
  // Check for Georgian Unicode characters
  const georgianChars = text.match(/[\u10A0-\u10FF]/g) || [];
  
  // Check for known Georgian garbled patterns
  const georgianGarbledPatterns = [
    'უანეაოჟ', 'გკოელჟმჟგკღტკ', 'დერატფანეოფკ', 'ლშობიაპობის',
    'სავაპაუდო', 'რაჭკეოფკ', 'ანამკზკ', 'ენჟგმჟბკოკ'
  ];
  
  const hasGarbledGeorgian = georgianGarbledPatterns.some(pattern => 
    text.includes(pattern)
  );

  // Check for Latin Extended characters that might be misencoded Georgian
  const latinExtendedChars = text.match(/[À-ÿ]/g) || [];
  const hasLatinExtended = latinExtendedChars.length > text.length * 0.05; // >5% threshold

  return georgianChars.length > 0 || hasGarbledGeorgian || hasLatinExtended;
}