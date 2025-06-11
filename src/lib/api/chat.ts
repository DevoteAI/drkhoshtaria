import { FlowiseRequest, Attachment, FlowiseUpload } from '../../types/chat';
import { convertAttachmentToFlowiseUpload } from '../../utils/fileUpload';

const API_URL = "https://flowise-2-0.onrender.com/api/v1/prediction/b4fd6d68-19cd-4449-8be8-1f80c2d791bf";

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
 */
export function convertAttachmentsToUploads(attachments: Attachment[]): FlowiseUpload[] {
  return attachments
    .filter(attachment => attachment.status === 'ready')
    .map(convertAttachmentToFlowiseUpload);
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
      hasUploads: fileUploads.length > 0
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
      throw error;
    }
    
    throw new Error('Failed to get AI response');
  }
}

/**
 * Test API connectivity
 */
export async function testApiConnection(): Promise<boolean> {
  try {
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