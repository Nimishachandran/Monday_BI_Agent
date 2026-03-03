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
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-indigo-300 font-semibold text-sm mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-indigo-200 font-semibold text-base mt-4 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={key++} className="text-indigo-300 font-semibold text-sm">
          {line.slice(2, -2)}
        </p>
      );
    } else if (
      line.startsWith('- ') ||
      line.startsWith('• ') ||
      line.startsWith('* ')
    ) {
      const content = line.slice(2);
      const parts = content.split(/(\*\*[^*]+\*\*)/g);

      elements.push(
        <div key={key++} className="flex items-start gap-2 my-1">
          <span className="text-indigo-400 mt-0.5 flex-shrink-0">▸</span>
          <span className="text-sm leading-relaxed">
            {parts.map((p, i) =>
              p.startsWith('**') ? (
                <strong key={i} className="text-indigo-200">
                  {p.slice(2, -2)}
                </strong>
              ) : (
                p
              )
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
            if (p.startsWith('**'))
              return (
                <strong key={i} className="text-indigo-200 font-semibold">
                  {p.slice(2, -2)}
                </strong>
              );
            if (p.startsWith('`'))
              return (
                <code
                  key={i}
                  className="font-mono text-xs bg-indigo-950/60 border px-1.5 py-0.5 rounded text-indigo-300"
                >
                  {p.slice(1, -1)}
                </code>
              );
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
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ Error: ${
              data.error ?? 'Check your API keys and board IDs.'
            }`,
            error: true,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.answer,
            traces: data.traces,
            toolsUsed: data.toolsUsed,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Network error. Please try again.',
          error: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function toggleTrace(id: string) {
    setOpenTraces(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600">
            <span className="text-white text-sm font-bold">BI</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm">Monday.com Intelligence</h1>
            <p className="text-xs text-gray-400">
              Live pipeline & revenue analysis
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="max-w-[75%] space-y-2">
                <div className="rounded-xl px-4 py-3 border">
                  {formatAnswer(msg.content)}
                </div>
                <div className="text-xs text-gray-400">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && <div className="text-sm">Loading...</div>}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="border-t px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a business question..."
            className="flex-1 resize-none border rounded-xl p-3 text-sm"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
