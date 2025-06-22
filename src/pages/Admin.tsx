import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Phone, User, Check, X, Loader2, AlertCircle, MessageSquare, LogOut, ChevronDown, Clock, Filter, Trash2, FileText, Image as ImageIcon, File, Download, FileDown, History } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ChatBot } from '../components/ChatBot';
import { ResponseForm } from '../components/admin/ResponseForm';
import { AudioPlayer } from '../components/admin/AudioPlayer';
import { generatePDF } from '../components/admin/PDFGenerator';
import { Question } from '../types/admin';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const WEBHOOK_URL = "https://hook.eu2.make.com/oshr1mqp66b2cusj5nov19v4m9jx8t9n";

export function Admin() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleExpanded = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredQuestions = questions.filter(q => {
    if (filter === 'pending') return !q.answered;
    if (filter === 'answered') return q.answered;
    return true;
  });

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    navigate('/admin/login');
  };

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        // First check Supabase session
        const { data } = await supabase.auth.getSession();
        
        // If no session in Supabase, check our local admin session
        if (!data.session) {
          const adminSession = localStorage.getItem('admin_session');
          
          if (!adminSession) {
            navigate('/admin/login');
            return;
          }
          
          // Validate the admin session (basic check)
          try {
            const session = JSON.parse(adminSession);
            if (!session || !session.isAdmin || !session.user?.email) {
              navigate('/admin/login');
              return;
            }
            
            // Check if the email matches our expected admin email
            const adminEmail = session.user.email.toLowerCase();
            if (adminEmail !== 'mamuka_khoshtaria@yahoo.com') {
              console.warn('Unauthorized email in admin session:', adminEmail);
              navigate('/admin/login');
              return;
            }
          } catch (err) {
            console.error('Invalid session format:', err);
            navigate('/admin/login');
            return;
          }
        }
        
        // Only fetch questions if authenticated
        fetchQuestions();
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/admin/login');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const fetchQuestions = async () => {
    try {
      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      const adminSession = localStorage.getItem('admin_session');
      
      if (!session && !adminSession) {
        navigate('/admin/login');
        return;
      }

      const { data, error } = await supabase
        .from('doctor_questions')
        .select(`
          *,
          attachments:doctor_question_attachments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch questions: ${error.message}`);
      }

      setQuestions(data || []);
    } catch (err: any) {
      console.error('Error fetching questions:', err);
      setError(err.message || 'Failed to fetch questions. Please try again.');
      // If the error is auth-related, redirect to login
      if (err.message?.includes('auth') || err.message?.includes('401')) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswered = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('doctor_questions')
        .update({
          answered: !currentStatus,
          answered_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      setQuestions(questions.map(q =>
        q.id === id ? {
          ...q,
          answered: !currentStatus,
          answered_at: !currentStatus ? new Date().toISOString() : null
        } : q
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Convert markdown to HTML and create professional email template (same as ChatBot)
  const createEmailHTML = (emailData: {
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    originalQuestion: string;
    editedResponse: string;
  }) => {
    // Convert markdown to HTML
    const responseHTML = DOMPurify.sanitize(marked(emailData.editedResponse) as string);
    
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

  const handleSendResponse = async (questionId: string, response: string) => {
    try {
      // Send response to webhook
      const question = questions.find(q => q.id === questionId);
      if (!question) throw new Error('Question not found');

      // Create formatted HTML email (same as ChatBot)
      const htmlContent = createEmailHTML({
        patientName: question.name,
        patientEmail: question.email,
        patientPhone: question.phone || '',
        originalQuestion: question.question,
        editedResponse: response
      });

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: question.name,
          email: question.email,
          phone: question.phone,
          question: question.question,
          response: htmlContent, // Send HTML instead of plain text
          ai_response: question.ai_response,
          isHTML: true // Flag to indicate HTML content
        }),
      });

      // Update question in database
      const { error: updateError } = await supabase
        .from('doctor_questions')
        .update({
          response,
          answered: true,
          answered_at: new Date().toISOString(),
          response_sent: true,
          response_sent_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (updateError) throw updateError;

      // Update local state
      setQuestions(questions.map(q =>
        q.id === questionId ? {
          ...q,
          response,
          answered: true,
          answered_at: new Date().toISOString(),
          response_sent: true,
          response_sent_at: new Date().toISOString()
        } : q
      ));

      // Show success message
      alert('Response sent successfully!');
    } catch (err: any) {
      console.error('Error sending response:', err);
      setError('Failed to send response. Please try again.');
    }
  };

  const getFileIcon = (type: string) => {
    const Icon = type.startsWith('image/') ? ImageIcon :
                 type.includes('pdf') ? FileText :
                 File;
    return <Icon className="w-12 h-12 text-dark-300" />;
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      // Get a signed URL with an expiration time
      const { data, error } = await supabase.storage
        .from('question-attachments')
        .createSignedUrl(filePath, 60); // 60 seconds expiry

      if (error) throw error;
      
      if (!data?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.target = "_blank"; // Prevents navigating away
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file. Please try again.');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('doctor_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setQuestions(questions.filter(q => q.id !== id));
    } catch (err: any) {
      setError('Failed to delete question. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const openImagePreview = (path: string) => {
    const url = supabase.storage.from('question-attachments').getPublicUrl(path).data.publicUrl;
    setPreviewImage(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-16 pb-8 relative">
      {/* Neon Effect */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_5px_rgba(34,211,238,0.5)] z-50" />
      
      {/* AI Chat Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">AI Assistant</h2>
          <p className="text-dark-100">Use the AI chatbot to help answer common questions</p>
        </div>
        <ChatBot embedded={true} />
      </div>
      
      {/* Questions Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          {/* Navigation */}
          <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-50">
            <Link
              to="/"
              className="flex items-center text-dark-100 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Home
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/chat-history"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-700/50 text-dark-100 hover:text-white hover:bg-dark-600/50 transition-colors"
              >
                <History className="w-5 h-5" />
                <span>Chat History</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-700/50 text-dark-100 hover:text-white hover:bg-dark-600/50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mt-8 mb-2">Patient Questions</h1>
          <div className="flex items-center justify-between">
            <p className="text-dark-100">Manage and respond to patient inquiries</p>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-dark-300" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="bg-dark-700/50 border border-dark-600/30 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent"
              >
                <option value="all">All Questions</option>
                <option value="pending">Pending</option>
                <option value="answered">Answered</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-900/20 border border-red-400/30 rounded-xl p-4 text-red-300 flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-5 h-5 text-cyan-400" />
                      <span className="text-white font-medium">{question.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-dark-200">
                      <Mail className="w-4 h-4" />
                      <span>{question.email}</span>
                    </div>
                    {question.phone && (
                      <div className="flex items-center space-x-2 text-dark-200">
                        <Phone className="w-4 h-4" />
                        <span>{question.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-dark-300">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {new Date(question.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 mt-4">
                  <button
                    onClick={() => toggleAnswered(question.id, question.answered)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      question.answered
                        ? 'bg-green-900/20 text-green-300 hover:bg-green-900/30'
                        : 'bg-dark-700/50 text-dark-200 hover:bg-dark-700/70'
                    }`}
                  >
                    {question.answered ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Answered</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        <span>Pending</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedQuestion(question)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/30 transition-colors ml-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Respond</span>
                  </button>
                  <button
                    onClick={() => {
                      setGeneratingPDF(question.id);
                      generatePDF({
                        question,
                        onGenerateStart: () => setGeneratingPDF(question.id),
                        onGenerateComplete: () => setGeneratingPDF(null),
                        onError: (error) => {
                          setError(error);
                          setGeneratingPDF(null);
                        }
                      });
                    }}
                    disabled={generatingPDF === question.id}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-700/50 text-dark-100 hover:text-white hover:bg-dark-600/50 transition-colors"
                  >
                    {generatingPDF === question.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    disabled={deletingId === question.id}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-900/20 text-red-300 hover:bg-red-900/30 transition-colors"
                  >
                    {deletingId === question.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
                <button
                  onClick={() => toggleExpanded(question.id)}
                  className="w-full mt-4 flex items-center justify-between text-dark-100 hover:text-white transition-colors"
                >
                  <span className="text-sm font-medium">Question Details</span>
                  <ChevronDown 
                    className={`w-5 h-5 transform transition-transform ${
                      expandedQuestions.has(question.id) ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedQuestions.has(question.id) && (
                  <div className="mt-4 space-y-4 animate-fadeSlideDown">
                    <div className="bg-dark-700/30 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-cyan-300 mb-2">Patient Question:</h4>
                      <p className="text-white">{question.question}</p>
                    </div>
                    {question.ai_response && (
                      <div className="bg-dark-700/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-cyan-300">AI Initial Response:</h4>
                          <span className="text-xs text-dark-300">
                            Generated: {new Date(question.ai_response_at!).toLocaleString()}
                          </span>
                        </div>
                        <div 
                          className="prose prose-invert max-w-none text-dark-100"
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(marked(question.ai_response) as string)
                          }}
                        />
                      </div>
                    )}
                    {question.response && (
                      <div className="bg-dark-700/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-cyan-300">Your Response:</h4>
                          <span className="text-xs text-dark-300">
                            Sent: {new Date(question.response_sent_at!).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-dark-100">{question.response}</p>
                      </div>
                    )}
                    {question.voice_recording_path && (
                      <div className="mt-4 bg-dark-700/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-cyan-300">Voice Message:</h4>
                          {question.voice_recording_duration && (
                            <span className="text-xs text-dark-300">
                              Duration: {question.voice_recording_duration} seconds
                            </span>
                          )}
                        </div>
                        <AudioPlayer
                          filePath={question.voice_recording_path}
                          duration={question.voice_recording_duration}
                          onError={setError}
                        />
                      </div>
                    )}
                    {question.attachments && question.attachments.length > 0 && (
                      <div className="mt-4 bg-dark-700/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-cyan-300 mb-3">Attachments:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {question.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="relative group bg-dark-800/50 rounded-lg p-3 border border-dark-600/30"
                            >
                              {attachment.file_type.startsWith('image/') ? (
                                <div className="w-full h-24 overflow-hidden rounded-lg cursor-pointer" 
                                  onClick={() => openImagePreview(attachment.file_path)}>
                                  <img
                                    src={`${supabase.storage.from('question-attachments').getPublicUrl(attachment.file_path).data.publicUrl}`}
                                    alt={attachment.file_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // If image fails to load, show fallback icon
                                      e.currentTarget.style.display = 'none';
                                      const parentDiv = e.currentTarget.parentElement;
                                      if (parentDiv) {
                                        parentDiv.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-dark-300"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></div>`;
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-24 flex items-center justify-center">
                                  {getFileIcon(attachment.file_type)}
                                </div>
                              )}
                              <button
                                onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                                className="absolute -top-2 -right-2 bg-cyan-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <p className="mt-2 text-xs text-dark-200 truncate">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-dark-300">
                                {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {question.answered_at && (
                      <p className="text-xs text-dark-300">
                        Answered: {new Date(question.answered_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-12 text-dark-200">
              No questions yet
            </div>
          )}
        </div>
      </div>
      
      {selectedQuestion && (
        <ResponseForm
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          onSubmit={async (response) => {
            await handleSendResponse(selectedQuestion.id, response);
            setSelectedQuestion(null);
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <button 
              className="absolute top-2 right-2 bg-dark-800/80 p-2 rounded-full hover:bg-dark-700/80 transition-colors z-10"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img 
              src={previewImage} 
              alt="Attachment preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Create a direct download from the current preview image
                  const a = document.createElement('a');
                  a.href = previewImage;
                  a.download = `attachment-${Date.now()}.jpg`;
                  a.target = "_blank";
                  a.rel = "noopener noreferrer";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-cyan-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}