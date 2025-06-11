import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, Download, Loader2, MessageSquare, Filter, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface ChatMessage {
  id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
  metadata: any;
}

export function ChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchChatHistory();
  }, [dateFilter]);

  const fetchChatHistory = async () => {
    try {
      let query = supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter
      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', today);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('created_at', weekAgo);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        query = query.gte('created_at', monthAgo);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = ['Session ID', 'User Message', 'AI Response', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...messages.map(msg => [
        msg.session_id,
        `"${msg.user_message.replace(/"/g, '""')}"`,
        `"${msg.ai_response.replace(/"/g, '""')}"`,
        new Date(msg.created_at).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chat_history_${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMessages = messages.filter(msg => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      msg.user_message.toLowerCase().includes(searchLower) ||
      msg.ai_response.toLowerCase().includes(searchLower) ||
      msg.session_id.toLowerCase().includes(searchLower);
    
    const matchesSession = !selectedSession || msg.session_id === selectedSession;
    
    return matchesSearch && matchesSession;
  });

  const uniqueSessions = Array.from(new Set(messages.map(msg => msg.session_id)));

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-16 pb-8">
      {/* Neon Effect */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_5px_rgba(34,211,238,0.5)] z-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Link
              to="/admin"
              className="flex items-center text-dark-100 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Admin
            </Link>
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </button>
          </div>
          
          <h1 className="text-3xl font-bold text-white mt-8 mb-2">Chat History</h1>
          <p className="text-dark-100">View and analyze past chat conversations</p>
        </div>

        {/* Filters */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-300 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white placeholder-dark-300 focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-300 w-5 h-5" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent appearance-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-300 w-5 h-5" />
          </div>

          <div className="relative">
            <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-300 w-5 h-5" />
            <select
              value={selectedSession || ''}
              onChange={(e) => setSelectedSession(e.target.value || null)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-700/50 border border-dark-600/30 text-white focus:ring-2 focus:ring-cyan-400/30 focus:border-transparent appearance-none"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>
                  Session {session.slice(0, 8)}...
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-300 w-5 h-5" />
          </div>
        </div>

        {/* Messages List */}
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-dark-200">
                      Session: {message.session_id.slice(0, 8)}...
                    </span>
                    <span className="text-dark-300">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleExpanded(message.id)}
                    className="text-dark-200 hover:text-white transition-colors"
                  >
                    <ChevronDown
                      className={`w-5 h-5 transform transition-transform ${
                        expandedMessages.has(message.id) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-dark-700/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-cyan-300 mb-2">User Message:</h4>
                    <p className="text-white">{message.user_message}</p>
                  </div>

                  {expandedMessages.has(message.id) && (
                    <div className="bg-dark-700/30 rounded-lg p-4 animate-fadeSlideDown">
                      <h4 className="text-sm font-medium text-cyan-300 mb-2">AI Response:</h4>
                      <div
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(marked(message.ai_response))
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="text-center py-12 text-dark-200">
              No chat messages found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}