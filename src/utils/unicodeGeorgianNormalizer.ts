/**
 * Modern Unicode-based Georgian text normalization utility
 * Replaces extensive character mapping with standard Unicode normalization
 */

export interface TextNormalizationResult {
  originalText: string;
  normalizedText: string;
  confidence: number;
  method: 'unicode_nfc' | 'unicode_nfd' | 'char_mapping' | 'none';
  hasGeorgianChars: boolean;
  detectedEncoding: string;
}

/**
 * Georgian Unicode block ranges
 */
const GEORGIAN_UNICODE_RANGES = [
  { start: 0x10A0, end: 0x10FF, name: 'Georgian' },           // Ⴀ-ჿ
  { start: 0x2D00, end: 0x2D2F, name: 'Georgian Supplement' } // ⴀ-ⴟ
];

/**
 * Detect if text contains Georgian characters
 */
function hasGeorgianCharacters(text: string): boolean {
  return GEORGIAN_UNICODE_RANGES.some(range => {
    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i);
      if (codePoint && codePoint >= range.start && codePoint <= range.end) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Calculate confidence score for normalization result
 */
function calculateConfidence(original: string, normalized: string): number {
  if (original === normalized) return 0.3; // No change needed
  
  const georgianInOriginal = hasGeorgianCharacters(original);
  const georgianInNormalized = hasGeorgianCharacters(normalized);
  
  if (!georgianInOriginal && georgianInNormalized) return 0.9; // Fixed encoding issue
  if (georgianInOriginal && georgianInNormalized) return 0.7; // Improved existing Georgian
  if (!georgianInOriginal && !georgianInNormalized) return 0.1; // No Georgian detected
  
  return 0.5; // Mixed results
}

/**
 * Detect probable text encoding based on character patterns
 */
function detectEncoding(text: string): string {
  // Check for Latin Extended characters that might be misencoded Georgian
  if (/[À-ÿ]/.test(text)) return 'latin_extended_misencoding';
  
  // Check for Georgian Unicode
  if (hasGeorgianCharacters(text)) return 'georgian_unicode';
  
  // Check for Cyrillic characters
  if (/[\u0400-\u04FF]/.test(text)) return 'cyrillic';
  
  // Check for standard ASCII
  if (/^[\x00-\x7F]*$/.test(text)) return 'ascii';
  
  return 'unknown';
}

/**
 * Apply Unicode normalization forms to Georgian text
 */
function applyUnicodeNormalization(text: string): { nfc: string; nfd: string } {
  try {
    return {
      nfc: text.normalize('NFC'), // Canonical Decomposition followed by Canonical Composition
      nfd: text.normalize('NFD')  // Canonical Decomposition
    };
  } catch (error) {
    console.warn('Unicode normalization failed:', error);
    return { nfc: text, nfd: text };
  }
}

/**
 * Minimal character mapping for common Sylfaen encoding issues
 * Only includes the most frequent problematic characters
 */
const MINIMAL_GEORGIAN_FIXES: { [key: string]: string } = {
  // Most common Latin Extended → Georgian mappings
  'À': 'ა', 'Á': 'ბ', 'Â': 'გ', 'Ã': 'დ', 'Ä': 'ე', 'Å': 'ვ', 'Æ': 'ზ', 'Ç': 'თ',
  'È': 'ი', 'É': 'კ', 'Ê': 'ლ', 'Ë': 'მ', 'Ì': 'ნ', 'Í': 'ო', 'Î': 'პ', 'Ï': 'ჟ',
  'Ð': 'რ', 'Ñ': 'ს', 'Ò': 'ტ', 'Ó': 'უ', 'Ô': 'ფ', 'Õ': 'ქ', 'Ö': 'ღ', 'Ø': 'შ',
  'Ù': 'ჩ', 'Ú': 'ც', 'Û': 'ძ', 'Ü': 'წ', 'Ý': 'ჭ', 'Þ': 'ხ', 'ß': 'ჯ',
  
  // Lowercase equivalents
  'à': 'ა', 'á': 'ბ', 'â': 'გ', 'ã': 'დ', 'ä': 'ე', 'å': 'ვ', 'æ': 'ზ', 'ç': 'თ',
  'è': 'ი', 'é': 'კ', 'ê': 'ლ', 'ë': 'მ', 'ì': 'ნ', 'í': 'ო', 'î': 'პ', 'ï': 'ჟ',
  'ð': 'რ', 'ñ': 'ས', 'ò': 'ტ', 'ó': 'უ', 'ô': 'ფ', 'õ': 'ქ', 'ö': 'ღ', 'ø': 'შ',
  'ù': 'ჩ', 'ú': 'ც', 'û': 'ძ', 'ü': 'წ', 'ý': 'ჭ', 'þ': 'ხ', 'ÿ': 'ჯ'
};

/**
 * Common Georgian medical terms and their correct forms
 * Based on the actual encoded text patterns from your PDF
 */
const COMMON_GEORGIAN_MEDICAL_TERMS: { [key: string]: string } = {
  // Medical institution terms
  'უანეაოჟ-გკოელჟმჟგკღტკ': 'სამეანო-გინეკოლოგიური',
  'უანეაოჟ-გკოემლჟმჟგკღტკ': 'სამეანო-გინეკოლოგიური',
  'დერატფანეოფკ': 'დეპარტამენტი',
  'დერარფანეოფკ': 'დეპარტამენტი',
  'უაშარივემჟ': 'საქართველო',
  'უაშატივემჟ': 'საქართველო',
  'იბკმკუკ': 'თბილისი',
  'ღკა გღმკ': 'ღია გული',
  'ჩკა გღმკ-უაღოკვეტუკფეფჟ ეჟურკფამკ': 'ღია გული-საუნივერსიტეტო ჰოსპიტალი',
  
  // Patient information
  'რაჭკეოფკუ გვატკ, უახემკ': 'პაციენტის გვარი, სახელი',
  'უედკბ კაოა': 'სედიხ იანა',
  'აუალკ': 'ასაკი',
  
  // Medical examination terms
  'ნჭკტე ნეოდკუ ღტღუ ექოულღრკღტკ განჟლვმევა': 'მცირე მენჯის ღრუს ექოსკოპიური გამოკვლევა',
  'ნძჟბკატჟბკუ უავატაღდჟ ვადა': 'მშობიარობის სავარაუდო ვადა',
  'ფეფჟნეფტკა': 'ფეტომეტრია',
  'იავკუ ბკრატკეფამღტკ ზჟნა': 'თავის ბიპარიეტალური ზომა',
  'იავკუ გატძენჟჯეტკმჟბა': 'თავის გარშემოწერილობა',
  'ნღჭმკუ გატძენჟჯეტკმჟბა': 'მუცლის გარშემოწერილობა',
  'ბატხაცკუ ხვმკუ უკგტხე': 'ბარძაყის ძვლის სიგრძე',
  'უავატაღდჟ ნაუა': 'სავარაუდო მასა',
  
  // Anatomical terms
  'ოაცჟ×კუ ნდებატეჟბა': 'ნაყოფის მდებარეობა',
  'ანჯანად ნეოდკი': 'ამჟამად მენჯით',
  'იავკ ×ღხეძკ': 'თავი ფუძეში',
  'ნატდვოკვ': 'მარჯვნივ',
  'იავკუ შამა,ბეტბენამკ': 'თავის ქალა,ხერხემალი',
  'ოჟტნამღტკ გაოვკიატებკუ': 'ნორმალური განვითარების',
  
  // Common repeated phrases
  'ნძჟბკატჟბკუ უავატაღდჟ ვადა- 12.08.25ჯ': 'მშობიარობის სავარაუდო ვადა– 12.08.25წ',
  '×ეფჟნეფტკა BPD': 'ფეტომეტრია BPD',
  
  // Common words
  'ანამკზკ': 'ანალიზი',
  'ფეუფკ': 'ტესტი',
  'უკუბმკუ': 'სისხლის',
  'ძატდჟვაოა': 'ურეა',
  'ენჟგმჟბკოკ': 'ჰემოგლობინი',
  'მეკლჟჭკფებკ': 'ლეიკოციტები',
  'იტჟნბჟჭკფებკ': 'თრომბოციტები',
  'ლტეატკოკოკ': 'კრეატინინი'
};

/**
 * Remove excessive repetition from text while preserving medical form structure
 */
function deduplicateText(text: string): string {
  const lines = text.split('\n');
  const processedLines: string[] = [];
  const exactDuplicates = new Set<string>();
  const phraseSignatures = new Set<string>();
  
  // Medical form patterns that often repeat legitimately
  const medicalPatterns = [
    /სამეანო-გინეკოლოგიური/i,
    /დეპარტამენტი/i,
    /პაციენტის/i,
    /გამოკვლევა/i,
    /ანალიზი/i,
    /ძოვება/i,
    /BPD|HC|AC|FL/,
    /\d{2}\.\d{2}\.\d{2,4}/  // Dates
  ];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.length === 0) continue;
    
    // Always keep the first occurrence of any line
    if (!exactDuplicates.has(trimmedLine)) {
      exactDuplicates.add(trimmedLine);
      
      // For medical patterns, be more lenient with repetition
      const isMedicalContent = medicalPatterns.some(pattern => pattern.test(trimmedLine));
      
      if (isMedicalContent) {
        processedLines.push(line);
      } else {
        // For non-medical content, check semantic similarity
        const words = trimmedLine.split(' ').filter(w => w.length > 2);
        const signature = words.slice(0, 3).join(' ').toLowerCase();
        
        if (!phraseSignatures.has(signature) || signature.length < 6) {
          phraseSignatures.add(signature);
          processedLines.push(line);
        }
      }
    }
  }
  
  return processedLines.join('\n');
}

/**
 * Apply minimal character mapping as fallback
 */
function applyMinimalCharacterMapping(text: string): string {
  let result = text;
  
  // Step 1: Apply character-level mappings
  for (const [latinChar, georgianChar] of Object.entries(MINIMAL_GEORGIAN_FIXES)) {
    result = result.replace(new RegExp(latinChar, 'g'), georgianChar);
  }
  
  // Step 2: Apply medical term mappings (sorted by length, longest first)
  const sortedTerms = Object.entries(COMMON_GEORGIAN_MEDICAL_TERMS)
    .sort(([a], [b]) => b.length - a.length);
  
  for (const [garbledTerm, correctTerm] of sortedTerms) {
    result = result.replace(new RegExp(garbledTerm, 'g'), correctTerm);
  }
  
  // Step 3: Deduplicate repetitive content
  result = deduplicateText(result);
  
  return result;
}

/**
 * Main normalization function with smart fallback strategy
 */
export function normalizeGeorgianText(text: string): TextNormalizationResult {
  const original = text;
  const encoding = detectEncoding(text);
  
  // Step 1: Try Unicode normalization first
  const { nfc, nfd } = applyUnicodeNormalization(text);
  
  // Choose best Unicode normalization result
  const nfcConfidence = calculateConfidence(original, nfc);
  const nfdConfidence = calculateConfidence(original, nfd);
  
  let bestResult = original;
  let bestMethod: TextNormalizationResult['method'] = 'none';
  let bestConfidence = 0.3;
  
  if (nfcConfidence > bestConfidence) {
    bestResult = nfc;
    bestMethod = 'unicode_nfc';
    bestConfidence = nfcConfidence;
  }
  
  if (nfdConfidence > bestConfidence) {
    bestResult = nfd;
    bestMethod = 'unicode_nfd';
    bestConfidence = nfdConfidence;
  }
  
  // Step 2: Try minimal character mapping if Unicode normalization didn't help
  if (bestConfidence < 0.6 && encoding === 'latin_extended_misencoding') {
    const mappedResult = applyMinimalCharacterMapping(original);
    const mappedConfidence = calculateConfidence(original, mappedResult);
    
    if (mappedConfidence > bestConfidence) {
      bestResult = mappedResult;
      bestMethod = 'char_mapping';
      bestConfidence = mappedConfidence;
    }
  }
  
  return {
    originalText: original,
    normalizedText: bestResult,
    confidence: bestConfidence,
    method: bestMethod,
    hasGeorgianChars: hasGeorgianCharacters(bestResult),
    detectedEncoding: encoding
  };
}

/**
 * Quick check if text needs normalization
 */
export function needsNormalization(text: string): boolean {
  const encoding = detectEncoding(text);
  return encoding === 'latin_extended_misencoding' || 
         (hasGeorgianCharacters(text) && text !== text.normalize('NFC'));
}

/**
 * Batch process multiple text strings
 */
export function batchNormalizeTexts(texts: string[]): TextNormalizationResult[] {
  return texts.map(normalizeGeorgianText);
}