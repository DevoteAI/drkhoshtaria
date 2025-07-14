import { encode } from 'base64-arraybuffer';

// Configuration
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

if (!API_KEY) {
  console.warn('Gemini API key not found - Google Vision extraction will be disabled');
}

export interface GoogleVisionResult {
  text: string;
  success: boolean;
  error?: string;
  confidence?: number;
  processingTime?: number;
  method: 'google-vision';
}

// Utility function for delays
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry mechanism for API calls
async function makeRequestWithRetry(
  url: string, 
  options: RequestInit, 
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json();

      // Handle rate limiting and capacity issues
      if (
        response.status === 429 ||
        errorData.error?.message?.includes('overloaded') ||
        errorData.error?.message?.includes('capacity')
      ) {
        if (retries > 0) {
          console.log(`🔄 Retrying Google Vision API... ${retries} attempts remaining`);
          await delay(RETRY_DELAY);
          return makeRequestWithRetry(url, options, retries - 1);
        }
      }

      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.message.includes('overloaded')) {
      console.log(`🔄 Retrying after error... ${retries} attempts remaining`);
      await delay(RETRY_DELAY);
      return makeRequestWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// PDF processing function for Google Vision API
async function processPDFForVision(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!reader.result) {
          throw new Error('Failed to read PDF file');
        }
        const arrayBuffer = reader.result as ArrayBuffer;
        const base64 = encode(arrayBuffer); // Direct base64 encoding
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file); // Read as ArrayBuffer for PDFs
  });
}

/**
 * Extract text from Georgian PDF using Google Vision API (Gemini)
 * Optimized for heavily encoded Georgian documents
 */
export async function extractTextWithGoogleVision(
  file: File,
  onProgress?: (progress: {
    stage: 'analyzing' | 'processing' | 'complete';
    stageDescription: string;
    percentage?: number;
    method?: 'google-vision';
  }) => void
): Promise<GoogleVisionResult> {
  const startTime = Date.now();

  try {
    // Check if API key is available
    if (!API_KEY) {
      throw new Error('Google Vision API key not configured');
    }

    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        stageDescription: 'Preparing PDF for Google Vision API...',
        percentage: 10,
        method: 'google-vision'
      });
    }

    // Process PDF to base64
    const base64Data = await processPDFForVision(file);
    console.log('📊 Google Vision: Processing PDF with size:', base64Data.length);

    if (onProgress) {
      onProgress({
        stage: 'processing',
        stageDescription: 'Extracting text with Google Vision API...',
        percentage: 50,
        method: 'google-vision'
      });
    }

    // Prepare Gemini API request payload
    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            { 
              text: `Extract ALL text content from this Georgian medical PDF document exactly as it appears. 
Focus on:
- Georgian text (ქართული ტექსტი)
- Medical terminology and measurements
- Patient information and dates
- Preserve exact formatting and structure
- Include every word, number, label, and piece of text visible
- Do not summarize or interpret - provide complete raw text extraction:` 
            },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent extraction
        topK: 1,
        topP: 1,
        maxOutputTokens: 4096, // Increased for medical documents
        stopSequences: []
      }
    };

    // Make API call with retry mechanism
    const response = await makeRequestWithRetry(
      `${GEMINI_ENDPOINT}?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      }
    );

    const data = await response.json();
    console.log('📥 Google Vision API response received');

    // Validate response structure
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('❌ Invalid Google Vision response structure:', data);
      throw new Error('Invalid response from Google Vision API');
    }

    const extractedText = data.candidates[0].content.parts[0].text;
    const processingTime = Date.now() - startTime;

    if (onProgress) {
      onProgress({
        stage: 'complete',
        stageDescription: 'Google Vision extraction complete',
        percentage: 100,
        method: 'google-vision'
      });
    }

    console.log(`✅ Google Vision extraction completed in ${processingTime}ms`);
    console.log(`📄 Extracted text length: ${extractedText.length} characters`);

    return {
      text: extractedText,
      success: true,
      confidence: 0.95, // Google Vision typically has high confidence
      processingTime,
      method: 'google-vision'
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Google Vision extraction failed:', error);

    let errorMessage = 'Google Vision extraction failed';
    if (error instanceof Error) {
      if (error.message.includes('overloaded')) {
        errorMessage = 'Google Vision API is currently busy. Falling back to alternative method.';
      } else if (error.message.includes('too large') || error.message.includes('413')) {
        errorMessage = 'PDF file is too large for Google Vision API.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'Google Vision API key not configured properly.';
      } else {
        errorMessage = `Google Vision API error: ${error.message}`;
      }
    }

    return {
      text: '',
      success: false,
      error: errorMessage,
      processingTime,
      method: 'google-vision'
    };
  }
}

/**
 * Check if Google Vision API is available and configured
 */
export function isGoogleVisionAvailable(): boolean {
  return !!API_KEY && API_KEY.length > 0;
}

/**
 * Estimate cost for Google Vision API usage
 * Based on Gemini 1.5 Flash pricing
 */
export function estimateGoogleVisionCost(fileSizeBytes: number): {
  estimatedCost: number;
  currency: string;
  explanation: string;
} {
  // Rough estimation: Gemini 1.5 Flash is ~$0.075 per 1M input tokens
  // PDF size to tokens is very rough approximation
  const estimatedTokens = Math.ceil(fileSizeBytes / 4); // Very rough estimate
  const costPer1MTokens = 0.075;
  const estimatedCost = (estimatedTokens / 1000000) * costPer1MTokens;

  return {
    estimatedCost: Math.max(0.001, estimatedCost), // Minimum cost
    currency: 'USD',
    explanation: `Estimated based on ~${estimatedTokens.toLocaleString()} tokens (very rough approximation)`
  };
}