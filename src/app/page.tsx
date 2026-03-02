'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  traces?: string[];
  toolsUsed?: string[];
  error?: boolean;
  timestamp: Date;
}

const SUGGESTED_QUERIES = [
  "How's our pipeline looking for this quarter?",
  "Which sector has the highest deal value?",
  "How many open deals are in Renewables?",
  "Show me the revenue and billing summary",
  "Which work orders are overdue?",
  "What's our weighted pipeline value?",
];

const TOOL_ICONS: Record<string, string> = {
  get_deals_data: '📊',
  get_work_orders_data: '📋',
  get_board_schema: '🗂️',
  search_deals_by_sector: '🔍',
  get_pipeline_summary: '📈',
  get_revenue_summary: '💰',
};

function formatAnswer(text: string): React.ReactNode {
<<<<<<< HEAD
=======
  // Convert markdown-ish to JSX
>>>>>>> d1a94ced (Added my file)
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-indigo-300 font-display font-semibold text-sm mt-4 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-indigo-200 font-display font-semibold text-base mt-4 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={key++} className="text-indigo-300 font-semibold text-sm">{line.slice(2, -2)}</p>);
<<<<<<< HEAD
    } else if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
=======
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
>>>>>>> d1a94ced (Added my file)
      const content = line.slice(2);
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-1">
          <span className="text-indigo-400 mt-0.5 flex-shrink-0">▸</span>
          <span className="text-sm leading-relaxed">
            {parts.map((p, i) =>
              p.startsWith('**') ? <strong key={i} className="text-indigo-200">{p.slice(2, -2)}</strong> : p
            )}
          </span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1" />);
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      elements.push(
        <p key={key++} className="text-sm leading-relaxed my-0.5">
          {parts.map((p, i) => {
            if (p.startsWith('**')) return <strong key={i} className="text-indigo-200 font-semibold">{p.slice(2, -2)}</strong>;
            if (p.startsWith('`')) return <code key={i} className="font-mono text-xs bg-indigo-950/60 border border-indigo-800/40 px-1.5 py-0.5 rounded text-indigo-300">{p.slice(1, -1)}</code>;
            return p;
          })}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openTraces, setOpenTraces] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const history = messages
    .filter(m => !m.error)
    .map(m => ({ role: m.role, content: m.content }));

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Error: ${data.error ?? 'Something went wrong. Check your API keys and board IDs.'}`,
          error: true,
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
          traces: data.traces,
          toolsUsed: data.toolsUsed,
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Network error. Please check your connection and try again.',
        error: true,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function toggleTrace(id: string) {
    setOpenTraces(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden grid-bg" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex-shrink-0 border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center accent-glow"
            style={{ background: 'var(--accent)' }}>
<<<<<<< HEAD
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
=======
            <span className="text-white text-sm font-bold font-display">BI</span>
>>>>>>> d1a94ced (Added my file)
          </div>
          <div>
            <h1 className="font-display font-semibold text-sm tracking-wide" style={{ color: 'var(--text)' }}>
              Monday.com Intelligence
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Live pipeline & revenue analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>LIVE</span>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Welcome state */}
          {messages.length === 0 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10 pt-8">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center accent-glow"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
<<<<<<< HEAD
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
=======
                  <span className="text-2xl">🧠</span>
>>>>>>> d1a94ced (Added my file)
                </div>
                <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text)' }}>
                  Ask anything about your business
                </h2>
                <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  I query your Monday.com boards live — deals pipeline, work orders, revenue, sector performance, and more.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 border hover:border-indigo-500/50 group"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-dim)',
<<<<<<< HEAD
=======
                      animationDelay: `${i * 60}ms`
>>>>>>> d1a94ced (Added my file)
                    }}
                  >
                    <span className="group-hover:text-indigo-300 transition-colors">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`animate-fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="max-w-[85%] space-y-2">
                  {/* Tool badge row */}
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
<<<<<<< HEAD
                      {Array.from(new Set(msg.toolsUsed)).map((tool, i) => (
=======
                      {[...new Set(msg.toolsUsed)].map((tool, i) => (
>>>>>>> d1a94ced (Added my file)
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono border"
                          style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                          {TOOL_ICONS[tool] ?? '🔧'} {tool.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Answer bubble */}
                  <div className="rounded-2xl rounded-tl-sm px-5 py-4 border"
                    style={{
                      background: msg.error ? 'rgba(239,68,68,0.08)' : 'var(--surface)',
                      borderColor: msg.error ? 'rgba(239,68,68,0.25)' : 'var(--border)',
                      color: 'var(--text)',
                    }}>
                    {formatAnswer(msg.content)}
                  </div>

                  {/* Trace toggle */}
                  {msg.traces && msg.traces.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleTrace(msg.id)}
                        className="flex items-center gap-1.5 text-xs font-mono transition-colors hover:text-indigo-400 px-1"
                        style={{ color: 'var(--text-dim)' }}
                      >
                        <span>{openTraces.has(msg.id) ? '▼' : '▶'}</span>
                        <span>{openTraces.has(msg.id) ? 'Hide' : 'Show'} API trace ({msg.traces.length} call{msg.traces.length !== 1 ? 's' : ''})</span>
                      </button>

                      {openTraces.has(msg.id) && (
                        <div className="mt-2 rounded-xl border overflow-hidden animate-slide-up"
                          style={{ borderColor: 'var(--border)', background: '#0d0d14' }}>
                          {msg.traces.map((trace, i) => (
                            <div key={i} className={`p-4 trace-block ${i > 0 ? 'border-t' : ''}`}
                              style={{ borderColor: 'var(--border)', color: '#7c7c9c' }}>
                              {trace.split('\n').map((line, j) => {
                                const isSuccess = line.startsWith('✅');
                                const isError = line.startsWith('❌');
                                const isTool = line.startsWith('🔧');
                                const isInput = line.startsWith('📥');
                                return (
                                  <div key={j} style={{
                                    color: isSuccess ? '#22c55e' : isError ? '#ef4444' : isTool ? '#a5b4fc' : isInput ? '#f59e0b' : '#7c7c9c'
                                  }}>
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs px-1" style={{ color: 'var(--text-dim)' }}>
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}

              {msg.role === 'user' && (
                <div className="max-w-[70%]">
                  <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    {msg.content}
                  </div>
                  <div className="text-xs text-right mt-1 px-1" style={{ color: 'var(--text-dim)' }}>
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-2xl rounded-tl-sm px-5 py-4 border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="typing-dots flex gap-1">
                    <span /><span /><span />
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                    Querying Monday.com live…
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 border-t px-4 py-4"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 rounded-2xl border p-3 transition-colors focus-within:border-indigo-500/50"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a business question… e.g. 'How's the Renewables pipeline?'"
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm outline-none leading-relaxed placeholder:text-sm"
              style={{
                color: 'var(--text)',
                fontFamily: "'DM Sans', sans-serif",
                maxHeight: '120px',
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
            Live data from Monday.com · Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}
