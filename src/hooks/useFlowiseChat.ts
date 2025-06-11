import { useState, useCallback } from 'react';
import { Message, Attachment } from '../types/chat';
import { fetchAIResponse, getAttachmentMetadata } from '../lib/api/chat';
import { processMultipleFiles, validateMultipleFiles, cleanupAttachments } from '../utils/fileUpload';
import { supabase } from '../lib/supabase';

interface UseChatOptions {
  sessionId: string;
  onError?: (error: string) => void;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  attachments: Attachment[];
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  sendMessage: (message: string) => Promise<void>;
  clearAttachments: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useFlowiseChat({ sessionId, onError }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleError = useCallback((error: string) => {
    console.error('Chat error:', error);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  const addAttachments = useCallback(async (files: File[]) => {
    try {
      // Validate files before processing
      const validation = validateMultipleFiles(files, attachments.length);
      if (!validation.isValid) {
        handleError(validation.error || 'File validation failed');
        return;
      }

      // Create initial attachment objects with processing status
      const initialAttachments = files.map(file => ({
        id: Math.random().toString(36).substring(2, 15),
        file,
        uploadType: file.type.startsWith('image/') ? 'image' as const : 
                   file.type === 'application/pdf' ? 'pdf' as const : 'document' as const,
        status: 'processing' as const,
        base64Data: '',
        preview: URL.createObjectURL(file),
        progressInfo: {
          stage: 'analyzing' as const,
          stageDescription: 'Starting...',
          percentage: 0
        }
      }));

      // Add initial attachments to state
      setAttachments(prev => [...prev, ...initialAttachments]);

      // Process files concurrently with progress updates
      const processedAttachments = await processMultipleFiles(files, (fileIndex, progress) => {
        // Update progress for specific attachment
        setAttachments(prev => prev.map((att, index) => {
          if (index >= prev.length - files.length + fileIndex && 
              att.file === files[fileIndex]) {
            return { ...att, progressInfo: progress };
          }
          return att;
        }));
      });
      
      // Update with final processed attachments
      setAttachments(prev => {
        const newAttachments = [...prev];
        processedAttachments.forEach((processed, index) => {
          const attachmentIndex = newAttachments.length - files.length + index;
          if (attachmentIndex >= 0) {
            newAttachments[attachmentIndex] = processed;
          }
        });
        return newAttachments;
      });

      // Check for any processing errors
      const erroredFiles = processedAttachments.filter(att => att.status === 'error');
      if (erroredFiles.length > 0) {
        const errorMessage = `Failed to process ${erroredFiles.length} file(s): ${
          erroredFiles.map(att => att.error).join(', ')
        }`;
        handleError(errorMessage);
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to process files');
    }
  }, [attachments.length, handleError]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      const removedAttachment = newAttachments.find(att => att.id === id);
      
      // Clean up object URLs to prevent memory leaks
      if (removedAttachment?.preview) {
        URL.revokeObjectURL(removedAttachment.preview);
      }
      
      return newAttachments.filter(att => att.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    // Clean up all object URLs
    cleanupAttachments(attachments);
    setAttachments([]);
  }, [attachments]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);

      // Create user message with attachments
      const userMessage: Message = {
        type: 'user',
        content: message,
        timestamp: new Date(),
        attachments: [...attachments]
      };

      // Add user message to state
      setMessages(prev => [...prev, userMessage]);

      // Send to API with attachments
      const response = await fetchAIResponse(message, sessionId, attachments);

      // Create bot response message
      const botMessage: Message = {
        type: 'bot',
        content: response.text,
        timestamp: new Date(),
        read: false
      };

      // Add bot message to state
      setMessages(prev => [...prev, botMessage]);

      // Store in database
      try {
        await supabase.from('chat_history').insert({
          session_id: sessionId,
          user_message: message,
          ai_response: response.text,
          metadata: {
            attachments: getAttachmentMetadata(attachments)
          }
        });
      } catch (dbError) {
        console.error('Error storing chat history:', dbError);
        // Don't throw here - the chat should continue working even if DB storage fails
      }

      // Mark bot message as read after 2 seconds
      setTimeout(() => {
        setMessages(prev => 
          prev.map((msg, idx) => 
            idx === prev.length - 1 && msg.type === 'bot' 
              ? { ...msg, read: true } 
              : msg
          )
        );
      }, 2000);

      // Clear attachments after successful send
      clearAttachments();

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        type: 'bot',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date(),
        read: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      handleError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, attachments, handleError, clearAttachments]);

  return {
    messages,
    isLoading,
    attachments,
    addAttachments,
    removeAttachment,
    sendMessage,
    clearAttachments,
    setMessages
  };
} 