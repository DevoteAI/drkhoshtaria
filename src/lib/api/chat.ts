import { FlowiseRequest, Attachment, FlowiseUpload } from '../../types/chat';
import { convertAttachmentToFlowiseUpload } from '../../utils/fileUpload';

// Use proxy URL in development, direct URL in production
const API_URL = import.meta.env.DEV 
  ? "/api/flowise/api/v1/prediction/b4fd6d68-19cd-4449-8be8-1f80c2d791bf"
  : "https://flowise-2-0.onrender.com/api/v1/prediction/b4fd6d68-19cd-4449-8be8-1f80c2d791bf";

export interface ChatApiResponse {
  text: string;
  sessionId?: string;
}

export interface ChatApiError {
  message: string;
  code?: string;
}

/**
 * Convert attachments to Flowise upload format
 * Handles both single uploads and arrays (for images with text + file)
 */
export function convertAttachmentsToUploads(attachments: Attachment[]): FlowiseUpload[] {
  return attachments
    .filter(attachment => attachment.status === 'ready')
    .flatMap(attachment => {
      const result = convertAttachmentToFlowiseUpload(attachment);
      // Handle both single upload and array of uploads (for images with OCR text)
      return Array.isArray(result) ? result : [result];
    });
}

/**
 * Send a message with optional file uploads to Flowise API
 */
export async function fetchAIResponse(
  message: string,
  sessionId: string,
  attachments: Attachment[] = []
): Promise<ChatApiResponse> {
  try {
    // Prepare base request body
    const requestBody: FlowiseRequest = {
      question: message,
      overrideConfig: {
        sessionId
      }
    };

    // Process attachments
    const uploads = convertAttachmentsToUploads(attachments);
    const textContent: string[] = [];
    const fileUploads: FlowiseUpload[] = [];
    
    // Separate text content from file uploads
    uploads.forEach(upload => {
      if (upload.type === 'text') {
        textContent.push(`\n\n--- Content from ${upload.name} ---\n${upload.data}`);
      } else {
        fileUploads.push(upload);
      }
    });
    
    // If we have extracted text content, append it to the question
    if (textContent.length > 0) {
      requestBody.question = message + textContent.join('');
      console.log('📝 Added extracted text content to question:', {
        originalQuestionLength: message.length,
        textContentCount: textContent.length,
        finalQuestionLength: requestBody.question.length
      });
    }
    
    // Add file uploads if there are any (images, audio, etc.)
    if (fileUploads.length > 0) {
      requestBody.uploads = fileUploads;
      console.log('📁 Added file uploads to request:', {
        fileUploadCount: fileUploads.length,
        uploadTypes: fileUploads.map(u => u.type)
      });
    }

    // Debug logging
    console.log('🔍 File upload debugging:', {
      totalAttachments: attachments.length,
      readyAttachments: attachments.filter(a => a.status === 'ready').length,
      textContentItems: textContent.length,
      fileUploadItems: fileUploads.length,
      finalQuestionLength: requestBody.question.length
    });

    console.log('📤 Sending request to Flowise:', {
      question: requestBody.question.substring(0, 100) + '...',
      sessionId,
      textContentCount: textContent.length,
      fileUploadCount: fileUploads.length,
      hasUploads: fileUploads.length > 0,
      apiUrl: API_URL
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    // Log response details
    console.log('📥 Flowise response details:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Flowise API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData
      });
      
      // Handle specific HTTP status codes
      if (response.status === 502) {
        throw new Error('The AI service is temporarily unavailable (502 Bad Gateway). This usually means the server is down for maintenance or experiencing high load. Please try again in a few minutes.');
      } else if (response.status === 503) {
        throw new Error('The AI service is temporarily unavailable (503 Service Unavailable). Please try again in a few minutes.');
      } else if (response.status === 504) {
        throw new Error('The AI service is taking too long to respond (504 Gateway Timeout). Please try again.');
      } else if (response.status >= 500) {
        throw new Error(`The AI service is experiencing technical difficulties (${response.status}). Please try again later.`);
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}. Response: ${errorData}`);
    }

    const data = await response.json();
    
    console.log('✅ Flowise response data:', {
      hasText: !!data.text,
      textLength: data.text?.length || 0,
      textPreview: data.text?.substring(0, 100) + '...',
      sessionId: data.sessionId,
      fullResponse: data
    });
    
    if (!data.text) {
      console.error('❌ Invalid response structure:', data);
      throw new Error('Invalid response from Flowise API - no text field found');
    }

    return {
      text: data.text,
      sessionId: data.sessionId
    };
  } catch (error) {
    console.error('💥 Error in fetchAIResponse:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof Error) {
      // Check for CORS-specific errors
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('CORS') || 
          error.message.includes('Access-Control-Allow-Origin')) {
        throw new Error('Network error: Unable to connect to the AI service. This might be due to network connectivity issues or server configuration. Please try again or contact support if the problem persists.');
      }
      
      // Check for other network errors
      if (error.message.includes('NetworkError') || 
          error.message.includes('TypeError')) {
        throw new Error('Connection error: Could not reach the AI service. Please check your internet connection and try again.');
      }
      
      throw error;
    }
    
    throw new Error('Failed to get AI response');
  }
}

/**
 * Check if the AI service is available
 */
export async function checkServiceHealth(): Promise<{ 
  isHealthy: boolean; 
  error?: string; 
  responseTime?: number 
}> {
  const startTime = Date.now();
  
  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(API_URL.replace('/prediction/', '/health'), {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return { 
        isHealthy: true, 
        responseTime 
      };
    } else {
      return { 
        isHealthy: false, 
        error: `Service returned ${response.status}: ${response.statusText}`,
        responseTime
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      return { 
        isHealthy: false, 
        error: 'Request timed out after 10 seconds',
        responseTime
      };
    }
    
    return { 
      isHealthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

/**
 * Test API connectivity
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    const health = await checkServiceHealth();
    if (!health.isHealthy) {
      console.warn('Service health check failed:', health.error);
      return false;
    }
    
    // If health check passes, try a minimal request
    const response = await fetchAIResponse('test', 'test-session');
    return true;
  } catch (error) {
    console.error('API connectivity test failed:', error);
    return false;
  }
}

/**
 * Get attachment metadata for logging/storage
 */
export function getAttachmentMetadata(attachments: Attachment[]) {
  return attachments.map(attachment => ({
    name: attachment.file.name,
    type: attachment.file.type,
    size: attachment.file.size,
    uploadType: attachment.uploadType,
    status: attachment.status,
    hasError: !!attachment.error
  }));
} 