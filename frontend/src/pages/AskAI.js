import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User, Loader, AlertCircle, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const AskAI = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'ai',
      text: `Hi ${user?.name?.split(' ')[0] || 'there'}!  I'm your document assistant. Ask me things like:\n\n• "Where is my leave application?"\n• "Who is reviewing my document?"\n• "Find documents about bonafide certificates"\n• "What is the status of DOC-XXXX?"`,
      sources: [],
      queryType: null
    }
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await axios.post('/query/ask', { question: q });
      const data = res.data;

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: data.answer || 'No response received.',
        sources: data.sourceDocuments || [],
        queryType: data.queryType
      }]);
    } catch (err) {
      const errMsg = err.response?.data?.answer
        || err.response?.data?.message
        || 'Unable to process your question right now. Please try again.';

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: errMsg,
        sources: [],
        queryType: null,
        isError: true
      }]);

      if (err.response?.status === 503) {
        toast.error('AI service is unavailable');
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const SUGGESTED = [
    "Where is my leave application?",
    "Who is currently reviewing my document?",
    "Find documents about bonafide certificates",
    "What documents are pending approval?"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 0 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-header-left">
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={24} style={{ color: 'var(--primary)' }} />
            Ask AI
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Ask questions about your documents in natural language
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: msg.role === 'user'
                  ? 'var(--gradient-primary)'
                  : msg.isError ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(99,102,241,0.3)'
              }}>
                {msg.role === 'user'
                  ? <span style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  : msg.isError
                    ? <AlertCircle size={18} color="#ef4444" />
                    : <Bot size={18} color="var(--primary)" />
                }
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: msg.role === 'user'
                    ? 'var(--gradient-primary)'
                    : 'var(--surface-hover)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: msg.role !== 'user' ? '1px solid var(--border)' : 'none'
                }}>
                  {msg.text}
                </div>

                {/* Source Documents */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Source Documents
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {msg.sources.map((src, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.6rem',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)'
                        }}>
                          <FileText size={11} />
                          <span>{src.title || src.unique_id}</span>
                          {src.relevance_score != null && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              ({Math.round(src.relevance_score * 100)}%)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)'
              }}>
                <Bot size={18} color="var(--primary)" />
              </div>
              <div style={{
                padding: '0.75rem 1rem',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: '4px 16px 16px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
              }}>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested questions (shown when only welcome message) */}
        {messages.length === 1 && (
          <div style={{ padding: '0 1.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SUGGESTED.map((s, i) => (
              <button
                key={i}
                onClick={() => { setQuestion(s); inputRef.current?.focus(); }}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-end',
          background: 'var(--surface)'
        }}>
          <textarea
            ref={inputRef}
            id="ask-ai-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something... (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              padding: '0.625rem 0.875rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              maxHeight: '120px',
              overflowY: 'auto',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            id="ask-ai-send"
            onClick={sendQuestion}
            disabled={!question.trim() || loading}
            className="btn btn-primary"
            style={{ flexShrink: 0, height: '40px', width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AskAI;
