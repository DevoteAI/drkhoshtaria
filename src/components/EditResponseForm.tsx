import React, { useState } from 'react';
import { Loader2, Send, FileDown, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Message } from '../types/chat';
import { generateResponsePDF } from '../utils/pdfGenerator';

interface EditResponseFormProps {
  message: Message;
  onClose: () => void;
  onSendEmail: (emailData: EmailData) => Promise<void>;
}

interface EmailData {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  originalQuestion: string;
  editedResponse: string;
}

export function EditResponseForm({ message, onClose, onSendEmail }: EditResponseFormProps) {
  const [editedResponse, setEditedResponse] = useState(message.content);
  const [patientName, setPatientName] = useState('Patient'); // Default value since field is removed
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [originalQuestion, setOriginalQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateResponsePDF({
        patientName,
        patientEmail,
        question: originalQuestion,
        response: editedResponse,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSendEmail({
        patientName,
        patientEmail,
        patientPhone,
        originalQuestion,
        editedResponse
      });
      onClose();
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 overflow-y-auto">
      <div className="bg-dark-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] border border-dark-700/30 my-4 overflow-hidden">
        <div className="p-6 border-b border-dark-700/30 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Edit & Send AI Response</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Patient Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">Patient Email *</label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
                placeholder="Enter patient email"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">Patient Phone</label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
                placeholder="Enter patient phone"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Original Question</label>
            <input
              type="text"
              value={originalQuestion}
              onChange={(e) => setOriginalQuestion(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
              placeholder="Enter the original question"
            />
          </div>

          {/* Original AI Response Preview */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Original AI Response:</label>
            <div 
              className="bg-dark-700/50 rounded-lg p-4 prose prose-invert max-w-none markdown-content max-h-40 overflow-y-auto"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(marked(message.content))
              }}
            />
          </div>

          {/* Editable Response */}
          <div className="space-y-2">
            <label htmlFor="response" className="block text-sm font-medium text-dark-200">Edit Response *</label>
            <textarea
              id="response"
              rows={10}
              value={editedResponse}
              onChange={(e) => setEditedResponse(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
              placeholder="Edit the AI response here..."
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF || !editedResponse.trim()}
              className="px-4 py-2 rounded-lg bg-dark-700/50 text-dark-100 hover:text-white hover:bg-dark-600/50 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileDown className="w-5 h-5" />
              )}
              <span>Download PDF</span>
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-dark-600/30 text-dark-200 hover:text-white hover:border-dark-500/30 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !patientEmail || !editedResponse.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  Send to Patient
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}