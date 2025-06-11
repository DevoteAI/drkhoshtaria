import React, { useState } from 'react';
import { Loader2, Send, FileDown } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Question } from '../../types/admin';
import { generatePDF } from './PDFGenerator';

interface ResponseFormProps {
  question: Question;
  onClose: () => void;
  onSubmit: (response: string) => Promise<void>;
}

export function ResponseForm({ question, onClose, onSubmit }: ResponseFormProps) {
  const [response, setResponse] = useState(question.ai_response || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGeneratePDF = async () => {
    await generatePDF({
      question: { ...question, response },
      onGenerateStart: () => setIsGeneratingPDF(true),
      onGenerateComplete: () => setIsGeneratingPDF(false),
      onError: (error) => {
        console.error('PDF generation error:', error);
        setIsGeneratingPDF(false);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(response);
      onClose();
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-800 rounded-xl shadow-xl w-full max-w-2xl border border-dark-700/30 my-8">
        <div className="p-6 border-b border-dark-700/30">
          <h3 className="text-xl font-semibold text-white">Respond to Patient</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Patient Question:</label>
            <div className="bg-dark-700/50 rounded-lg p-4 text-white">{question.question}</div>
            {question.ai_response && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-dark-200">AI Generated Response:</label>
                <div 
                  className="bg-dark-700/50 rounded-lg p-4 prose prose-invert max-w-none markdown-content"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(marked(question.ai_response))
                  }}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="response" className="block text-sm font-medium text-dark-200">Your Response:</label>
            <textarea
              id="response"
              rows={8}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent transition-all duration-300"
              placeholder="Edit or write your response here..."
              required
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 rounded-lg bg-dark-700/50 text-dark-100 hover:text-white hover:bg-dark-600/50 transition-colors flex items-center space-x-2"
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
              disabled={isSubmitting || !response.trim()}
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
                  Send Response
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}