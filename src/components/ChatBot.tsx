import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Clock, Check, Image as ImageIcon, Smile, Paperclip, X, User, ChevronDown, Info, HelpCircle, Moon, Sun, History, ArrowLeft, Trash2, AlertCircle, FileText, File, FileImage, Plus, Edit } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import { Message, Attachment, ChatSession } from '../types/chat';
import { useFlowiseChat } from '../hooks/useFlowiseChat';
import { EditResponseForm } from './EditResponseForm';

// Generate a random session ID
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Webhook URL for email notifications
const WEBHOOK_URL = "https://hook.eu2.make.com/oshr1mqp66b2cusj5nov19v4m9jx8t9n";

interface QuickReply {
  text: string;
  action: () => void;
}

// Configure marked options
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true // Enable GitHub Flavored Markdown
});

// Custom renderer for markdown
const renderer = new marked.Renderer();
renderer.link = (href: string, title: string | null, text: string) => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline">${text}</a>`;
};
marked.use({ renderer });

// Function to safely parse and render markdown
function renderMarkdown(content: string, isDarkMode: boolean) {
  const html = marked(content) as string;
  const sanitizedHtml = DOMPurify.sanitize(html);
  return (
    <div 
      className={`markdown-content prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

interface ChatBotProps {
  embedded?: boolean;
}

export function ChatBot({ embedded = false }: ChatBotProps) {
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Initialize session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chatSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newId = generateSessionId();
      localStorage.setItem('chatSessionId', newId);
      setSessionId(newId);
    }
  }, []);

  // Use our new chat hook
  const {
    messages,
    isLoading,
    attachments,
    addAttachments,
    removeAttachment,
    sendMessage,
    clearAttachments,
    setMessages
  } = useFlowiseChat({
    sessionId,
    onError: (error) => {
      setErrorMessage(error);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  });

  // Fetch chat history when session ID is available
  useEffect(() => {
    if (sessionId && !historyLoaded) {
      fetchChatHistory();
    }
  }, [sessionId, historyLoaded]);

  const fetchChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      console.log('Fetching chat history for session:', sessionId);
      
      const { data, error } = await supabase
        .from('chat_history')
        .select()
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat history:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('Found chat history:', data.length, 'messages');
        
        const historyMessages: Message[] = [];
        
        data.forEach(msg => {
          // Add user message
          historyMessages.push({
            type: 'user',
            content: msg.user_message,
            timestamp: new Date(msg.created_at),
            read: true
          });
          
          // Add bot response
          historyMessages.push({
            type: 'bot',
            content: msg.ai_response,
            timestamp: new Date(msg.created_at),
            read: true
          });
        });

        setMessages(historyMessages);
        setShouldScroll(true);
      } else {
        console.log('No chat history found');
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setHistoryLoaded(true);
    }
  };
  
  // Fetch all chat sessions for history view
  const fetchAllChatSessions = async () => {
    setLoadingHistory(true);
    setDeleteError(null);
    try {
      // Get unique session IDs with their most recent message
      const { data, error } = await supabase
        .from('chat_history')
        .select()
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Group by session ID and create session objects
        const sessionMap = new Map<string, ChatSession>();
        
        data.forEach(msg => {
          if (!sessionMap.has(msg.session_id)) {
            sessionMap.set(msg.session_id, {
              id: msg.session_id,
              timestamp: new Date(msg.created_at),
              preview: msg.user_message.slice(0, 50) + (msg.user_message.length > 50 ? '...' : '')
            });
          }
        });
        
        // Convert map to array and sort by timestamp (newest first)
        const sessions = Array.from(sessionMap.values()).sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        
        setChatSessions(sessions);
      }
    } catch (err) {
      console.error('Error fetching chat sessions:', err);
      setDeleteError('Failed to load chat sessions');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Delete a specific chat session
  const deleteChatSession = async (sessionToDelete: string) => {
    setDeletingSession(sessionToDelete);
    setDeleteError(null);
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('session_id', sessionToDelete);

      if (error) throw error;

      // Update local state
      setChatSessions(prev => prev.filter(session => session.id !== sessionToDelete));
      
      // If deleting current session, clear current chat
      if (sessionToDelete === sessionId) {
        setMessages([]);
        clearAttachments();
      }

      // Refresh the sessions list to ensure consistency
      await fetchAllChatSessions();
    } catch (err) {
      console.error('Error deleting chat session:', err);
      setDeleteError('Failed to delete conversation');
    } finally {
      setDeletingSession(null);
    }
  };

  // Load a specific chat session
  const loadChatSession = async (sessionToLoad: string) => {
    try {
      setLoadingHistory(true);
      
      // Update current session
      setSessionId(sessionToLoad);
      localStorage.setItem('chatSessionId', sessionToLoad);
      
      // Fetch messages for this session
      const { data, error } = await supabase
        .from('chat_history')
        .select()
        .eq('session_id', sessionToLoad)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const historyMessages: Message[] = [];
        
        data.forEach(msg => {
          // Add user message
          historyMessages.push({
            type: 'user',
            content: msg.user_message,
            timestamp: new Date(msg.created_at),
            read: true
          });
          
          // Add bot response
          historyMessages.push({
            type: 'bot',
            content: msg.ai_response,
            timestamp: new Date(msg.created_at),
            read: true
          });
        });

        setMessages(historyMessages);
        clearAttachments();
        setShouldScroll(true);
      }
      
      // Return to chat view
      setShowHistory(false);
    } catch (err) {
      console.error('Error loading chat session:', err);
      setDeleteError('Failed to load conversation');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    handleSubmit(null, text);
  };

  // Modified scrollToBottom function with manual scroll implementation
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Smooth scroll to bottom without triggering page scroll
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Controlled scroll only within the chat container
  useEffect(() => {
    if (messages.length > 0 && shouldScroll) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom();
        setShouldScroll(false);
      }, 100);
    }
  }, [messages, shouldScroll]);

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language === 'ka' ? 'ka-GE' : 'ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const handleSubmit = async (e: React.FormEvent | null, quickReplyText?: string) => {
    // Ensure we properly prevent default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const messageText = quickReplyText || input.trim();
    if (!messageText && attachments.length === 0) return;
    
    if (!quickReplyText) setInput('');
    
    // Send message using our hook
    await sendMessage(messageText);
    setShouldScroll(true);
  };

  const toggleChatExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const clearChat = () => {
    setMessages([]);
    clearAttachments();
    localStorage.removeItem('chatSessionId');
    const newId = generateSessionId();
    localStorage.setItem('chatSessionId', newId);
    setSessionId(newId);
  };

  const toggleHistory = () => {
    if (!showHistory) {
      fetchAllChatSessions();
    }
    setShowHistory(!showHistory);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language === 'ka' ? 'ka-GE' : 'ru-RU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Convert markdown to HTML and create professional email template
  const createEmailHTML = (emailData: {
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    originalQuestion: string;
    editedResponse: string;
  }) => {
    // Convert markdown to HTML
    const responseHTML = DOMPurify.sanitize(marked(emailData.editedResponse));
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Medical Response - Dr. Khoshtaria</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .header {
                background: linear-gradient(135deg, #0891b2, #06b6d4);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
                margin-bottom: 0;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .header p {
                margin: 5px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .patient-info {
                background: #f1f5f9;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
                border-left: 4px solid #0891b2;
            }
            .patient-info h3 {
                margin: 0 0 10px 0;
                color: #0891b2;
                font-size: 18px;
            }
            .info-row {
                margin: 8px 0;
                font-size: 14px;
            }
            .info-label {
                font-weight: 600;
                color: #64748b;
            }
            .section {
                margin: 25px 0;
            }
            .section h3 {
                color: #0891b2;
                font-size: 18px;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
            }
            .question-box {
                background: #fefefe;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin: 15px 0;
                font-style: italic;
                color: #475569;
            }
            .response-box {
                background: #fefefe;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin: 15px 0;
            }
            .response-box ul, .response-box ol {
                margin: 10px 0;
                padding-left: 20px;
            }
            .response-box li {
                margin: 5px 0;
            }
            .response-box strong {
                color: #0891b2;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
                font-size: 14px;
                color: #64748b;
            }
            .footer strong {
                color: #0891b2;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Dr. Khoshtaria Medical Platform</h1>
            <p>Professional Medical Consultation Response</p>
        </div>
        
        <div class="content">
            <div class="patient-info">
                <h3>Patient Information</h3>
                <div class="info-row">
                    <span class="info-label">Name:</span> ${emailData.patientName || 'Not provided'}
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span> ${emailData.patientEmail || 'Not provided'}
                </div>
                ${emailData.patientPhone ? `
                <div class="info-row">
                    <span class="info-label">Phone:</span> ${emailData.patientPhone}
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-label">Date:</span> ${new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            </div>

            ${emailData.originalQuestion ? `
            <div class="section">
                <h3>Your Question</h3>
                <div class="question-box">
                    ${emailData.originalQuestion}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h3>Medical Response</h3>
                <div class="response-box">
                    ${responseHTML}
                </div>
            </div>

        </div>

        <div class="footer">
            <strong>Dr. Khoshtaria Medical Platform</strong><br>
            Professional Healthcare Consultation Services<br>
            <em>This email was generated on ${new Date().toLocaleDateString()}</em>
        </div>
    </body>
    </html>
    `;
  };

  // Handle email sending for edited responses
  const handleSendEmail = async (emailData: {
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    originalQuestion: string;
    editedResponse: string;
  }) => {
    try {
      const htmlContent = createEmailHTML(emailData);
      
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: emailData.patientName,
          email: emailData.patientEmail,
          phone: emailData.patientPhone,
          question: emailData.originalQuestion,
          response: htmlContent, // Send HTML instead of markdown
          ai_response: editingMessage?.content,
          isHTML: true // Flag to indicate HTML content
        }),
      });
      
      // Show success message
      alert('Response sent successfully!');
    } catch (error) {
      console.error('Error sending response:', error);
      throw new Error('Failed to send response. Please try again.');
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await addAttachments(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (attachment: Attachment) => {
    if (attachment.uploadType === 'image' && attachment.preview) {
      return (
        <img
          src={attachment.preview}
          alt={attachment.file.name}
          className="w-6 h-6 object-cover rounded"
        />
      );
    }
    
    if (attachment.uploadType === 'pdf') {
      return <FileText className="w-6 h-6 text-red-400" />;
    }
    
    return <File className="w-6 h-6 text-gray-400" />;
  };

  // Conditional styling based on mode
  const containerStyles = embedded
    ? `w-full max-w-none shadow-xl rounded-2xl overflow-hidden backdrop-blur-md ${
        isDarkMode 
          ? 'bg-dark-900/95 border border-dark-700/50' 
          : 'bg-white/95 border border-gray-200/50'
      } transition-all duration-300 h-[750px] flex flex-col`
    : `fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md ${
        isDarkMode 
          ? 'bg-dark-900/95 border border-dark-700/50' 
          : 'bg-white/95 border border-gray-200/50'
      } transition-all duration-300 ${isExpanded ? 'h-[500px]' : 'h-auto'}`;

  // In embedded mode, use flex-1 for messages area to fill available space
  const messagesHeight = embedded ? 'flex-1' : 'h-[350px]';

  return (
    <div className={containerStyles}>
      
      {/* Header - Fixed height */}
      <div className={`relative p-4 cursor-pointer flex-shrink-0 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.6)]' 
          : 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
      } transition-all`} onClick={toggleChatExpansion}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className="w-8 h-8 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{t('chat.title')}</h3>
              <p className="text-white/80 text-xs">{t('chat.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isExpanded && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearChat();
                  }}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all"
                  aria-label="New Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHistory();
                  }}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all"
                  aria-label="Chat History"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDarkMode();
                  }}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all"
                  aria-label="Toggle Theme"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                {!embedded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                    className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all"
                    aria-label="Collapse"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open('https://example.com/chat-help', '_blank');
                  }}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all"
                  aria-label="Help"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </>
            )}
            <ChevronDown 
              className={`w-5 h-5 text-white transform transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
            />
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <>
          {/* Error Message */}
          {errorMessage && (
            <div className={`p-3 m-4 rounded-lg flex-shrink-0 ${
              isDarkMode ? 'bg-red-900/20 border border-red-400/30 text-red-300' : 'bg-red-100 border border-red-200 text-red-700'
            }`}>
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Chat History View */}
          {showHistory ? (
            <div 
              ref={messagesContainerRef}
              className={`${messagesHeight} overflow-y-auto p-4 space-y-4 scroll-smooth ${
                isDarkMode ? 'bg-dark-800/50' : 'bg-gray-50/80'
              }`}
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowHistory(false)}
                  className={`flex items-center text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-dark-700 text-dark-100 hover:bg-dark-600 hover:text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Chat
                </button>
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Chat History
                </h3>
              </div>

              {deleteError && (
                <div className={`p-3 rounded-lg mb-4 ${
                  isDarkMode ? 'bg-red-900/20 border border-red-400/30 text-red-300' : 'bg-red-100 border border-red-200 text-red-700'
                }`}>
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{deleteError}</span>
                  </div>
                </div>
              )}

              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-cyan-400' : 'text-cyan-500'}`} />
                </div>
              ) : chatSessions.length === 0 ? (
                <div className={`text-center py-8 ${isDarkMode ? 'text-dark-200' : 'text-gray-500'}`}>
                  No previous conversations found.
                </div>
              ) : (
                <div className="space-y-2">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`relative w-full text-left p-3 rounded-lg transition-colors group ${
                        isDarkMode 
                          ? 'bg-dark-700/50 hover:bg-dark-600/70 border border-dark-600/30' 
                          : 'bg-white hover:bg-gray-100 border border-gray-200/70'
                      } ${session.id === sessionId ? (isDarkMode ? 'ring-1 ring-cyan-400' : 'ring-1 ring-cyan-500') : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs ${isDarkMode ? 'text-cyan-400' : 'text-cyan-500'}`}>
                          {session.id.substring(0, 8)}...
                        </span>
                        <span className={`text-xs ${isDarkMode ? 'text-dark-300' : 'text-gray-500'}`}>
                          {formatDate(session.timestamp)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${isDarkMode ? 'text-dark-100' : 'text-gray-700'}`}>
                        {session.preview}
                      </p>
                      <div className="flex mt-2 space-x-2">
                        <button
                          onClick={() => loadChatSession(session.id)}
                          className={`text-xs px-2 py-1 rounded ${
                            isDarkMode 
                              ? 'bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30' 
                              : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                          }`}
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                              deleteChatSession(session.id);
                            }
                          }}
                          disabled={deletingSession === session.id}
                          className={`text-xs px-2 py-1 rounded flex items-center ${
                            isDarkMode 
                              ? 'bg-red-900/20 text-red-300 hover:bg-red-900/30' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          } disabled:opacity-50`}
                        >
                          {deletingSession === session.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="w-3 h-3 mr-1" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Message area - flexible height */
            <div 
              ref={messagesContainerRef}
              className={`${messagesHeight} overflow-y-auto p-4 space-y-4 scroll-smooth ${
                isDarkMode ? 'bg-dark-800/50' : 'bg-gray-50/80'
              }`}
              style={{ scrollbarWidth: 'thin' }}
            >
              {messages.length === 0 ? (
                <div className={`text-center mt-8 space-y-4 animate-fadeSlideUp ${isDarkMode ? 'text-dark-200' : 'text-gray-500'}`}>
                  <Bot className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-500'}`} />
                  <p>{t('chat.welcome')}</p>                  
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} group`}
                  >
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0 mr-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-cyan-600' : 'bg-cyan-500'
                        }`}>
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="max-w-[75%]">
                      <div
                        className={`rounded-2xl p-3.5 ${
                          message.type === 'user'
                            ? isDarkMode 
                              ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white ml-2'
                              : 'bg-gradient-to-r from-cyan-400 to-cyan-300 text-white ml-2'
                            : isDarkMode
                              ? 'bg-dark-700 text-dark-100'
                              : 'bg-white text-gray-800 border border-gray-200'
                        } animate-fadeSlideIn shadow-sm`}
                      >
                        {message.type === 'bot' ? (
                          renderMarkdown(message.content, isDarkMode)
                        ) : (
                          message.content
                        )}
                      </div>
                      
                      {/* Show attachments for user messages */}
                      {message.type === 'user' && message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.attachments.map((attachment, attIndex) => (
                            <div
                              key={attIndex}
                              className={`flex items-center space-x-2 px-2 py-1 rounded text-xs ${
                                isDarkMode ? 'bg-dark-600/50 text-dark-200' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {attachment.preview ? (
                                <img
                                  src={attachment.preview}
                                  alt={attachment.file.name}
                                  className="w-4 h-4 object-cover rounded"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                              <span className="truncate max-w-[80px]">{attachment.file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between mt-1 text-xs ${
                        isDarkMode ? 'text-dark-300' : 'text-gray-500'
                      } opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(message.timestamp)}</span>
                          {message.type === 'bot' && (
                            <Check className={`w-3 h-3 ${
                              message.read ? 'text-green-500' : isDarkMode ? 'text-dark-300' : 'text-gray-400'
                            }`} />
                          )}
                        </div>
                        {message.type === 'bot' && !message.isLoading && (
                          <button
                            onClick={() => setEditingMessage(message)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-dark-600/50 text-dark-300 hover:text-cyan-400' 
                                : 'hover:bg-gray-100 text-gray-500 hover:text-cyan-600'
                            }`}
                            title="Edit and send to patient"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit & Send</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {message.type === 'user' && (
                      <div className="flex-shrink-0 ml-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-dark-600' : 'bg-gray-200'
                        }`}>
                          <User className={`w-5 h-5 ${isDarkMode ? 'text-dark-100' : 'text-gray-600'}`} />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start group">
                  <div className="flex-shrink-0 mr-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-cyan-600' : 'bg-cyan-500'
                    }`}>
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="max-w-[75%]">
                    <div className={`rounded-2xl p-3.5 ${
                      isDarkMode
                        ? 'bg-dark-700 text-dark-100'
                        : 'bg-white text-gray-800 border border-gray-200'
                    } animate-fadeSlideIn shadow-sm`}>
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('chat.thinking')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Input area - Fixed height at bottom */}
          <div className={`p-4 border-t flex-shrink-0 ${
            isDarkMode ? 'bg-dark-800/30 border-dark-700/30' : 'bg-white/30 border-gray-200/70'
          }`}>
            
            {/* Attached Files List - with max height and scroll */}
            {attachments.length > 0 && (
              <div className="mb-3 max-h-32 overflow-y-auto space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {attachment.file.type.startsWith('image/') ? (
                          <FileImage className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        ) : attachment.file.type === 'application/pdf' ? (
                          <FileText className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {attachment.file.name}
                            </span>
                            {attachment.status === 'processing' && attachment.progressInfo && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0">
                                {attachment.progressInfo.percentage ? `${attachment.progressInfo.percentage}%` : '...'}
                              </span>
                            )}
                          </div>
                          
                          {/* Progress Information */}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {attachment.status === 'processing' && attachment.progressInfo && (
                              <div className="space-y-1">
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${attachment.progressInfo.percentage || 0}%` }}
                                  ></div>
                                </div>
                                
                                {/* Status and Progress Info */}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center space-x-1">
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                    <span>{attachment.progressInfo.stageDescription}</span>
                                  </div>
                                  {attachment.progressInfo.estimatedTimeRemaining && (
                                    <span className="text-gray-400">{attachment.progressInfo.estimatedTimeRemaining}</span>
                                  )}
                                </div>
                                
                                {/* Page Progress for PDFs */}
                                {attachment.progressInfo.currentPage && attachment.progressInfo.totalPages && (
                                  <div className="text-xs text-gray-400">
                                    Page {attachment.progressInfo.currentPage} of {attachment.progressInfo.totalPages}
                                    {attachment.progressInfo.method && (
                                      <span className="ml-1 px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                                        {attachment.progressInfo.method.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {attachment.status === 'ready' && attachment.extractedText && 
                              `PDF text extracted (${attachment.pdfPageCount} pages, ${Math.round(attachment.extractedText.length / 1000)}k chars)`
                            }
                            {attachment.status === 'ready' && !attachment.extractedText && 
                              `${(attachment.file.size / 1024).toFixed(1)} KB`
                            }
                            {attachment.status === 'error' && `Error: ${attachment.error}`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* PDF text extraction preview */}
                    {attachment.status === 'ready' && attachment.extractedText && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 max-h-20 overflow-y-auto">
                        <div className="font-medium mb-1">Extracted text preview:</div>
                        {attachment.extractedText.substring(0, 200)}...
                      </div>
                    )}
                    
                    {/* Image preview */}
                    {attachment.status === 'ready' && attachment.file.type.startsWith('image/') && attachment.preview && (
                      <img 
                        src={attachment.preview} 
                        alt={attachment.file.name}
                        className="mt-2 max-w-full h-20 object-cover rounded border"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input Row - Fixed */}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              {/* Attachment Button */}
              <button
                type="button"
                onClick={handleAttachClick}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Attach files"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder={t('chat.placeholder')}
                rows={1}
                className={`flex-1 resize-none rounded-lg px-4 py-2 min-h-[40px] max-h-32 outline-none transition-all duration-300 ${
                  isDarkMode
                    ? 'bg-dark-700/50 text-white placeholder-gray-400 border border-dark-600/30 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent'
                    : 'bg-white text-gray-900 placeholder-gray-500 border border-gray-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent'
                }`}
                style={{
                  height: 'auto',
                  minHeight: '40px'
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={`flex-shrink-0 p-2 rounded-lg transition-all duration-300 ${
                  (input.trim() || attachments.length > 0) && !isLoading
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-400 hover:to-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </form>
          </div>
        </>
      )}
      
      {/* Edit Response Modal */}
      {editingMessage && (
        <EditResponseForm
          message={editingMessage}
          onClose={() => setEditingMessage(null)}
          onSendEmail={handleSendEmail}
        />
      )}
    </div>
  );
}