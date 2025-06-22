// Enhanced type definitions for direct Flowise file upload
export interface Attachment {
  id: string;
  file: File;
  base64Data: string;
  uploadType: FlowiseUploadType;
  status: 'processing' | 'ready' | 'error';
  preview?: string;
  error?: string;
  // PDF-specific fields
  extractedText?: string;
  pdfPageCount?: number;
  extractionError?: string;
  // Enhanced progress tracking
  progressInfo?: {
    stage: 'analyzing' | 'extracting' | 'ocr' | 'complete';
    stageDescription: string;
    percentage?: number;
    estimatedTimeRemaining?: string;
    currentPage?: number;
    totalPages?: number;
    method?: 'standard' | 'ocr';
  };
}

export interface FlowiseUpload {
  data: string;
  type: string;
  name: string;
  mime: string;
}

export type FlowiseUploadType = 'image' | 'pdf' | 'document';

export interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  read?: boolean;
  isLoading?: boolean;
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  timestamp: Date;
  preview: string;
}

export interface QuickReply {
  text: string;
  action: () => void;
}

// Flowise API request format
export interface FlowiseRequest {
  question: string;
  uploads?: FlowiseUpload[];
  overrideConfig?: {
    sessionId: string;
  };
}

// File validation constraints
export interface FileValidationConfig {
  maxFileSize: number;
  allowedTypes: string[];
  maxFiles: number;
}

export const DEFAULT_FILE_CONFIG: FileValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf'
  ],
  maxFiles: 15
}; 