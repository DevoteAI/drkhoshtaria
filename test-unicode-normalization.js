// Test script to demonstrate Unicode normalization improvements
import { normalizeGeorgianText } from './src/utils/unicodeGeorgianNormalizer.js';

// Sample from your extracted text with encoding issues
const sampleText = `უანეაოჟ-გკოელჟმჟგკღტკ დერატფანეოფკ უედკბ კაოა 08.05.2025 04:20 ძრუ "ჩკა გღმკ-უაღოკვეტუკფეფჟ ეჟურკფამკ" თბილისი, აოარკუ 414 დკვკზკკუ შღწა N47`;

// Common problematic terms from your text
const problematicTerms = [
  'უანეაოჟ-გკოელჟმჟგკღტკ',
  'დერატფანეოფკ', 
  'უედკბ კაოა',
  'ძრუ',
  'ჩკა გღმკ',
  'აოარკუ',
  'დკვკზკკუ',
  'შღწა',
  'ნძჟბკატჟბკუ',
  'უავატაღდჟ',
  'ვადა',
  'ჯი-ძკ'
];

console.log('🧪 Testing Unicode Normalization vs Old Character Mapping\n');

// Test each problematic term
problematicTerms.forEach((term, index) => {
  const result = normalizeGeorgianText(term);
  
  console.log(`${index + 1}. Testing: "${term}"`);
  console.log(`   Method: ${result.method}`);
  console.log(`   Confidence: ${result.confidence}`);
  console.log(`   Result: "${result.normalizedText}"`);
  console.log(`   Encoding: ${result.detectedEncoding}`);
  console.log(`   Has Georgian: ${result.hasGeorgianChars}\n`);
});

// Test full sample text
console.log('📄 Full Text Sample Test:');
const fullResult = normalizeGeorgianText(sampleText);
console.log(`Original length: ${sampleText.length}`);
console.log(`Normalized length: ${fullResult.normalizedText.length}`);
console.log(`Method used: ${fullResult.method}`);
console.log(`Confidence: ${fullResult.confidence}`);
console.log(`Detected encoding: ${fullResult.detectedEncoding}`);
console.log(`\nOriginal: ${sampleText.substring(0, 100)}...`);
console.log(`Normalized: ${fullResult.normalizedText.substring(0, 100)}...`);

console.log('\n✅ Test completed. The new system should significantly improve Georgian text extraction.');