import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Send, AlertCircle, ArrowLeft, Mail, User, Phone, Paperclip, X, FileText, Image as ImageIcon, File, Mic, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { VoiceRecorder } from '../components/VoiceRecorder';
// Import the enhanced file processing system
import { 
  processFileForUpload, 
  validateMultipleFiles,
  cleanupAttachments
} from '../utils/fileUpload';
import { Attachment, DEFAULT_FILE_CONFIG } from '../types/chat';
import { fetchAIResponse } from '../lib/api/chat';

// Now using the same centralized fetchAIResponse function as ChatBot

export function AskDoctor() {
  const { t } = useLanguage();
  const [question, setQuestion] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Use the enhanced Attachment type instead of simple FileAttachment
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadingFileCount, setUploadingFileCount] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup all attachments when component unmounts
      cleanupAttachments(attachments);
    };
  }, []);

  // Clear attachments on form submission success
  const clearFormAndAttachments = () => {
    cleanupAttachments(attachments);
    setSubmitted(true);
    setQuestion('');
    setName('');
    setEmail('');
    setPhone('');
    setAttachments([]);
    setVoiceBlob(null);
    setVoiceDuration(null);
  };

  // Enhanced file selection with validation and processing
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files using the enhanced system
    const validation = validateMultipleFiles(files, attachments.length, DEFAULT_FILE_CONFIG);
    
    if (!validation.isValid) {
      setError(validation.error || 'File validation failed');
      return;
    }

    setError(null);

    // Show immediate upload progress
    setIsUploadingFiles(true);
    setUploadingFileCount(files.length);

    // Process files with progress tracking
    try {
      // Create initial attachment objects for immediate UI feedback
      const initialAttachments = files.map(file => ({
        id: Math.random().toString(36).substring(2, 15),
        file,
        uploadType: file.type.startsWith('image/') ? 'image' as const : 
                   file.type === 'application/pdf' ? 'pdf' as const : 'document' as const,
        status: 'processing' as const,
        base64Data: '',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        progressInfo: {
          stage: 'analyzing' as const,
          stageDescription: 'Starting upload...',
          percentage: 0
        }
      }));

      // Add initial attachments to UI immediately
      setAttachments(prev => [...prev, ...initialAttachments]);

      // Process files one by one for better progress tracking
      const processedFiles = await Promise.all(
        files.map(async (file, index) => {
          const initialAttachment = initialAttachments[index];
          
          const processedFile = await processFileForUpload(file, (progress) => {
            // Update progress for this specific file
            setAttachments(prev => prev.map(att => 
              att.id === initialAttachment.id
                ? { ...att, progressInfo: progress }
                : att
            ));
          });

          // Update the status when complete
          setAttachments(prev => prev.map(att => 
            att.id === initialAttachment.id
              ? { ...att, ...processedFile }
              : att
          ));

          return processedFile;
        })
      );

      console.log('✅ All files processed successfully:', {
        fileCount: processedFiles.length,
        successCount: processedFiles.filter(f => f.status === 'ready').length
      });

    } catch (err) {
      console.error('Error processing files:', err);
      setError('Failed to process some files. Please try again.');
    } finally {
      setIsUploadingFiles(false);
      setUploadingFileCount(0);
    }

    e.target.value = ''; // Reset input
  };

  // Enhanced attachment removal with cleanup
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(att => att.id === id);
      if (attachment) {
        cleanupAttachments([attachment]);
      }
      return prev.filter(att => att.id !== id);
    });
  };

  const getFileIcon = (attachment: Attachment) => {
    if (attachment.uploadType === 'image' && attachment.preview) {
      return (
        <img
          src={attachment.preview}
          alt={attachment.file.name}
          className="w-12 h-12 object-cover rounded"
        />
      );
    }
    
    if (attachment.uploadType === 'pdf') {
      return <FileText className="w-12 h-12 text-red-400" />;
    }
    
    return <File className="w-12 h-12 text-gray-400" />;
  };

  // Enhanced question submission with smart file processing
  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Get AI response using the same proven function that ChatBot uses
    let aiResponse = null;
    try {
      // Generate consistent session ID for this request
      const sessionId = `askdoctor-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      console.log('🔄 Using fetchAIResponse (same as ChatBot):', {
        question: question.substring(0, 100) + '...',
        sessionId,
        attachmentCount: attachments.length,
        readyAttachments: attachments.filter(a => a.status === 'ready').length
      });

      // Use the exact same API function that ChatBot uses
      const response = await fetchAIResponse(question, sessionId, attachments);
      aiResponse = response.text;
      
      console.log('✅ AI response received:', {
        hasResponse: !!aiResponse,
        responseLength: aiResponse?.length || 0
      });
    } catch (err) {
      console.error('Error getting AI response:', err);
      // Continue with submission even if AI fails
    }

    let questionId: string | undefined;

    try {
      // Insert question with AI response
      const { data: questionData, error: submitError } = await supabase
        .from('doctor_questions')
        .insert([
          {
            name,
            email,
            phone: phone || null,
            question,
            ai_response: aiResponse,
            ai_response_at: aiResponse ? new Date().toISOString() : null
          }
        ])
        .select('id')
        .single();

      if (submitError) throw submitError;
      questionId = questionData.id;

      // Upload attachments if any (store original files for doctor review)
      if (attachments.length > 0) {
        let successfulUploads = 0;
        let failedUploads = 0;
        const uploadResults = [];

        for (const [index, attachment] of attachments.entries()) {
          const { file } = attachment;
          
          try {
            // Generate safe filename for Georgian/Unicode characters
            // Use a more robust approach that ensures uniqueness and validity
            const timestamp = Date.now() + index; // Add index to ensure uniqueness even for simultaneous uploads
            const originalExtension = file.name.split('.').pop() || 'pdf';
            
            // Create a safe base name by encoding Georgian/Unicode properly
            // Keep only ASCII letters, numbers, dots, hyphens for storage safety
            let baseName = file.name
              .replace(/\.[^.]*$/, '') // Remove extension first
              .normalize('NFKD') // Normalize Unicode
              .replace(/[^\w\s-]/g, '') // Keep only word chars, spaces, hyphens
              .trim()
              .replace(/\s+/g, '-') // Replace spaces with hyphens
              .substring(0, 50); // Limit length to prevent issues
            
            // If baseName is empty or too short after sanitization, use fallback
            if (!baseName || baseName.length < 3) {
              baseName = 'medical-document';
            }
            
            // Create unique filename with timestamp to prevent conflicts
            const finalFileName = `${baseName}-${timestamp}.${originalExtension}`;
            const filePath = `${questionId}/${finalFileName}`;
            
            console.log(`📁 Uploading file ${index + 1}/${attachments.length}:`, {
              originalName: file.name,
              safeName: finalFileName,
              filePath: filePath,
              fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`
            });
            
            // Upload file to storage with retry logic
            const arrayBuffer = await file.arrayBuffer();
            const fileBuffer = new Uint8Array(arrayBuffer);
            
            let uploadSuccess = false;
            let lastUploadError = null;
            
            // Retry upload up to 3 times with exponential backoff
            for (let retry = 0; retry < 3; retry++) {
              try {
                const { error: uploadError } = await supabase.storage
                  .from('question-attachments')
                  .upload(filePath, fileBuffer, {
                    contentType: file.type,
                    cacheControl: '3600',
                    upsert: retry > 0 // Allow overwrite on retry
                  });

                if (!uploadError) {
                  uploadSuccess = true;
                  break;
                }
                
                lastUploadError = uploadError;
                console.warn(`Upload attempt ${retry + 1} failed for ${file.name}:`, uploadError);
                
                // Wait before retry (exponential backoff)
                if (retry < 2) {
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
                }
              } catch (networkError) {
                lastUploadError = networkError;
                console.warn(`Network error on attempt ${retry + 1} for ${file.name}:`, networkError);
                
                // Wait before retry
                if (retry < 2) {
                  await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
                }
              }
            }

            if (!uploadSuccess) {
              throw lastUploadError;
            }

            // Create attachment record with extraction info
            const { error: attachmentError } = await supabase
              .from('doctor_question_attachments')
              .insert({
                question_id: questionId,
                file_name: file.name, // Keep original Georgian filename for display
                file_type: file.type,
                file_size: file.size,
                file_path: filePath, // Safe filename path for storage
                upload_status: 'success',
                // Store PDF extraction info if available (optional fields for backward compatibility)
                ...(attachment.extractedText && { extracted_text: attachment.extractedText }),
                ...(attachment.pdfPageCount && { pdf_page_count: attachment.pdfPageCount }),
                ...(attachment.progressInfo?.method && { extraction_method: attachment.progressInfo.method })
              });

            if (attachmentError) {
              // If the error is due to missing columns, try inserting without the new fields
              if (attachmentError.message?.includes('column') || attachmentError.code === '42703') {
                console.warn('Database schema not updated yet, inserting without PDF extraction fields:', attachmentError.message);
                
                const { error: fallbackError } = await supabase
                  .from('doctor_question_attachments')
                  .insert({
                    question_id: questionId,
                    file_name: file.name, // Keep original Georgian filename
                    file_type: file.type,
                    file_size: file.size,
                    file_path: filePath   // Safe filename path
                  });
                
                if (fallbackError) throw fallbackError;
              } else {
                throw attachmentError;
              }
            }

            successfulUploads++;
            uploadResults.push({ file: file.name, status: 'success' });
            console.log(`✅ Successfully uploaded: ${file.name}`);

          } catch (err) {
            failedUploads++;
            uploadResults.push({ file: file.name, status: 'failed', error: err });
            console.error(`❌ Failed to upload ${file.name}:`, err);
            
            // Try to record the failed upload in the database for tracking
            try {
              await supabase
                .from('doctor_question_attachments')
                .insert({
                  question_id: questionId,
                  file_name: file.name,
                  file_type: file.type,
                  file_size: file.size,
                  file_path: null,
                  upload_status: 'failed',
                  error_message: err instanceof Error ? err.message : 'Upload failed'
                });
            } catch (dbError) {
              console.warn('Could not record failed upload in database:', dbError);
            }
          }
        }

        // Log upload summary
        console.log('📊 File Upload Summary:', {
          total: attachments.length,
          successful: successfulUploads,
          failed: failedUploads,
          results: uploadResults
        });

        // Show warning if some files failed, but don't prevent success
        if (failedUploads > 0) {
          console.warn(`⚠️ ${failedUploads} out of ${attachments.length} files failed to upload. Question submitted successfully with ${successfulUploads} attachments.`);
        }
      }
      
      // Upload voice recording if exists
      if (voiceBlob && questionId) {
        const voiceFileName = `${questionId}/voice-message.webm`;
        
        // Convert blob to array buffer for direct upload
        const arrayBuffer = await voiceBlob.arrayBuffer();
        const voiceBuffer = new Uint8Array(arrayBuffer);
        
        // Upload voice recording to storage
        const { error: voiceUploadError } = await supabase.storage
          .from('voice-recordings')
          .upload(voiceFileName, voiceBuffer, {
            contentType: 'audio/webm',
            cacheControl: '3600'
          });

        if (voiceUploadError) throw voiceUploadError;

        // Update question with voice recording path
        const { error: voiceUpdateError } = await supabase
          .from('doctor_questions')
          .update({
            voice_recording_path: voiceFileName,
            voice_recording_duration: voiceDuration
          })
          .eq('id', questionId);

        if (voiceUpdateError) throw voiceUpdateError;
      }

      clearFormAndAttachments();
    } catch (err) {
      setError(t('aiChat.askDoctor.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-16 pb-8" data-medical-component="ask-doctor-page">
      {/* Neon Effect */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_5px_rgba(34,211,238,0.5)] z-50" />
      <motion.div
        initial={{ opacity: 0.5, width: "8rem" }}
        animate={{ opacity: 1, width: "16rem" }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-30 h-[500px] bg-cyan-400/20 blur-[100px] rounded-full"
      />

      {/* Back button */}
      <div className="fixed top-20 left-4 z-50">
        <Link
          to="/"
          className="flex items-center text-dark-100 hover:text-brand-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          {t('aiChat.backToHome')}
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative z-50">
        {/* Header */}
        <div className="bg-dark-800/50 backdrop-blur-sm border-b border-dark-700/30 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8 text-center">
              <h1 className="text-4xl font-bold text-white mb-4">{t('aiChat.askDoctor.title')}</h1>
              <p className="text-xl text-dark-100">{t('aiChat.askDoctor.description')}</p>
            </div>
            
            {/* Instructions */}
            <div className="max-w-3xl mx-auto mt-8 bg-dark-700/30 rounded-xl p-6 border border-dark-600/30">
              <h3 className="text-lg font-semibold text-white mb-4">
                {t('aiChat.askDoctor.instructions.title')}
              </h3>
              <ol className="space-y-3">
                {t('aiChat.askDoctor.instructions.steps').split('\n').map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-dark-100">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Question Form */}
        <div className="flex-1 overflow-hidden pb-8 pt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {!submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-dark-700/30 p-8 medical-form"
                data-medical-component="question-form"
              >
                <form onSubmit={handleQuestionSubmit} className="space-y-6">
                  {/* Patient Information Section */}
                  <div className="grid md:grid-cols-2 gap-6" data-medical-component="patient-info">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-dark-100 mb-2">
                        {t('askDoctor.form.namePlaceholder')}
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white placeholder-dark-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        placeholder={t('askDoctor.form.namePlaceholder')}
                        required
                        data-medical-component="patient-name-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-dark-100 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white placeholder-dark-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        placeholder={t('askDoctor.form.emailPlaceholder')}
                        required
                        data-medical-component="patient-email-input"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-900/20 border border-red-400/30 rounded-xl p-4 text-red-300">
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-cyan-400/50" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t('aiChat.askDoctor.phonePlaceholder')}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-700/50 backdrop-blur-sm border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  {/* File Upload Section */}
                  <div className="mt-8 bg-dark-700/30 rounded-xl p-6 border border-dark-600/30">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      {t('aiChat.askDoctor.attachments.title')}
                    </h4>
                    <p className="text-dark-100 mb-4">
                      {t('aiChat.askDoctor.attachments.description')}
                    </p>
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      {t('aiChat.askDoctor.attachments.types').split('\n').map((type, index) => (
                        <li key={index} className="text-dark-200">{type}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-dark-300 mb-4">
                      Maximum 15 files, 10MB each. PDF files will have their text extracted for analysis.
                    </p>
                  </div>

                  <div className="flex space-x-4">
                    <textarea
                      rows={4}
                      required
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-lg bg-dark-700/50 backdrop-blur-sm border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300 resize-none"
                      placeholder={t('aiChat.askDoctor.placeholder')}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !question.trim() || !name.trim() || !email.trim()}
                      className="flex-shrink-0 flex items-center justify-center px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 relative group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      <div className="absolute inset-0 bg-gradient-radial from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={DEFAULT_FILE_CONFIG.allowedTypes.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFiles}
                    className="mt-4 w-full flex items-center justify-center px-4 py-3 rounded-lg bg-dark-700/50 border border-dark-600/30 text-dark-100 hover:text-white hover:bg-dark-600/50 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingFiles ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin text-cyan-400" />
                        Processing {uploadingFileCount} file{uploadingFileCount !== 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <Paperclip className="w-5 h-5 mr-2 group-hover:text-cyan-300" />
                        {t('aiChat.askDoctor.attachments.button')}
                      </>
                    )}
                  </button>

                  {/* Upload Progress Summary */}
                  {isUploadingFiles && uploadingFileCount > 0 && (
                    <div className="mt-3 bg-dark-700/30 rounded-lg p-4 border border-cyan-400/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-cyan-300 font-medium">
                          Uploading Files
                        </span>
                        <span className="text-cyan-200 text-sm">
                          {uploadingFileCount} file{uploadingFileCount !== 1 ? 's' : ''} in progress
                        </span>
                      </div>
                      <div className="w-full bg-dark-600 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-500 animate-pulse"
                          style={{ width: '60%' }}
                        />
                      </div>
                      <p className="text-xs text-dark-300 mt-2">
                        Please wait while we process your files...
                      </p>
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-dark-200">Attachments:</h4>
                        <span className="text-xs text-dark-300">
                          {attachments.length}/{DEFAULT_FILE_CONFIG.maxFiles} files
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="relative group bg-dark-700/30 rounded-lg p-3 border border-dark-600/30"
                          >
                            {attachment.preview ? (
                              <img
                                src={attachment.preview}
                                alt={attachment.file.name}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center"> 
                                {getFileIcon(attachment)}
                              </div>
                            )}
                            
                            {/* Enhanced progress indicator for file processing */}
                            {attachment.progressInfo && attachment.progressInfo.stage !== 'complete' && (
                              <div className="absolute inset-0 bg-dark-900/90 rounded-lg flex flex-col items-center justify-center p-2">
                                <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
                                
                                {/* Method badge */}
                                {attachment.progressInfo.method && (
                                  <div className={`text-xs px-2 py-1 rounded-full mb-2 ${
                                    attachment.progressInfo.method === 'ocr' 
                                      ? 'bg-orange-500/20 text-orange-300' 
                                      : 'bg-blue-500/20 text-blue-300'
                                  }`}>
                                    {attachment.progressInfo.method === 'ocr' ? 'OCR' : 'STANDARD'}
                                  </div>
                                )}
                                
                                <div className="text-xs text-center text-cyan-300 mb-2 max-w-full">
                                  {attachment.progressInfo.stageDescription}
                                </div>
                                
                                {/* Page progress for multi-page PDFs */}
                                {attachment.progressInfo.currentPage && attachment.progressInfo.totalPages && (
                                  <div className="text-xs text-center text-cyan-200 mb-2">
                                    Page {attachment.progressInfo.currentPage} of {attachment.progressInfo.totalPages}
                                  </div>
                                )}
                                
                                {/* Time estimate for OCR */}
                                {attachment.progressInfo.estimatedTimeRemaining && attachment.progressInfo.method === 'ocr' && (
                                  <div className="text-xs text-center text-orange-300 mb-2">
                                    {attachment.progressInfo.estimatedTimeRemaining} remaining
                                  </div>
                                )}
                                
                                {/* Enhanced Progress bar with percentage display */}
                                {attachment.progressInfo.percentage !== undefined && (
                                  <div className="w-full mt-1 px-1">
                                    <div className="flex justify-between text-xs text-cyan-300 mb-1">
                                      <span>Processing...</span>
                                      <span className="font-semibold">{Math.round(attachment.progressInfo.percentage)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                                      <div 
                                        className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                                          attachment.progressInfo.method === 'ocr' 
                                            ? 'bg-gradient-to-r from-orange-500 to-orange-400 shadow-lg shadow-orange-500/20' 
                                            : 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-lg shadow-cyan-500/20'
                                        }`}
                                        style={{ width: `${attachment.progressInfo.percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Success completion indicator */}
                            {attachment.status === 'ready' && (
                              <div className="absolute top-2 right-2 bg-green-500/90 rounded-full p-1.5">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            
                            <button
                              onClick={() => removeAttachment(attachment.id)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="mt-2">
                              <p className="text-xs text-dark-200 truncate">
                                {attachment.file.name}
                              </p>
                              {attachment.status === 'ready' && attachment.extractedText && (
                                <div className="space-y-1">
                                  <p className="text-xs text-green-400">
                                    ✅ PDF text extracted ({attachment.pdfPageCount} pages, {Math.round(attachment.extractedText.length / 1000)}k chars)
                                  </p>
                                  {/* Text extraction preview */}
                                  <div className="text-xs text-dark-300 bg-dark-800/50 rounded p-2 max-h-16 overflow-y-auto">
                                    <div className="font-medium text-cyan-300 mb-1">Extracted text preview:</div>
                                    {attachment.extractedText.substring(0, 150)}...
                                  </div>
                                </div>
                              )}
                              {attachment.status === 'ready' && !attachment.extractedText && attachment.file.type.startsWith('image/') && (
                                <p className="text-xs text-cyan-400">
                                  ✅ Image ready for analysis ({(attachment.file.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                              )}
                              {attachment.status === 'ready' && !attachment.extractedText && !attachment.file.type.startsWith('image/') && (
                                <p className="text-xs text-dark-300">
                                  ✅ {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                              {attachment.status === 'error' && (
                                <p className="text-xs text-red-400">
                                  ❌ Error: {attachment.error}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>

                {/* Voice Recorder */}
                <VoiceRecorder
                  onRecordingComplete={(blob, duration) => {
                    setVoiceBlob(blob);
                    setVoiceDuration(duration);
                  }}
                  onDelete={() => {
                    setVoiceBlob(null);
                    setVoiceDuration(null);
                  }}
                />
              </motion.div>
            ) : (
              <div className="bg-cyan-900/20 border border-cyan-400/30 rounded-xl p-6 text-center animate-fadeSlideUp">
                <h3 className="text-cyan-300 font-semibold mb-2">{t('aiChat.askDoctor.success.title')}</h3>
                <p className="text-dark-100">{t('aiChat.askDoctor.success.message')}</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {t('aiChat.askDoctor.success.askAnother')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}