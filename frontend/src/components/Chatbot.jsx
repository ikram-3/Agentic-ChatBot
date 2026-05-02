import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUp, Square, GraduationCap, Sparkles,
  BookOpen, ClipboardList, MapPin, ShieldCheck,
  Sun, Moon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import vsCodeTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/vs2015';

import { useTheme } from '../context/ThemeContext';
import { parseWidgets, WidgetRenderer } from './Widgets';
import './Chatbot.css';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('js', js);
SyntaxHighlighter.registerLanguage('py', python);

const API_BASE = '/api';

/* ── Constants & Helpers ── */
const WIDGET_TOKEN_RE = /(?:\[\s*)?WIDGET:([^\s\]]+(?:\s+[^\s\]]+)*)(?:\s*\])?/gi;

const DOMAIN_LABELS = {
  'uswat.edu.pk':  'University of Swat',
  'www.uswat.edu.pk': 'University of Swat',
  'maps.google.com': 'Google Maps',
  'www.google.com': 'Google',
  'en.wikipedia.org': 'Wikipedia',
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X',
  'youtube.com': 'YouTube',
  'tiktok.com': 'TikTok',
  'linkedin.com': 'LinkedIn',
};

const getFriendlyLabel = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return DOMAIN_LABELS[host] || DOMAIN_LABELS['www.' + host] || host;
  } catch { return url; }
};

/* ── Modern Markdown Renderer with Syntax Highlighting ── */
const MarkdownRenderer = ({ text }) => {
  // Strip any widget tokens that slipped through (double safety)
  const safeText = (text || '').replace(WIDGET_TOKEN_RE, '').trim();

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          // Custom link renderer with friendly labels
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="inline-link">
              {getFriendlyLabel(href) || children}
            </a>
          ),
          // Syntax highlighting for code blocks
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vsCodeTheme.default || vsCodeTheme}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {safeText}
      </ReactMarkdown>
    </div>
  );
};

/* ── Bot message renderer — stable component (no IIFE) ── */
const BotMessage = ({ msg }) => {
  let cleanText = msg.text || '';
  let widgets = [];
  try {
    const parsed = parseWidgets(cleanText);
    cleanText = parsed.cleanText;
    widgets = parsed.widgets || [];
  } catch (e) {
    // fallback: strip manually
    cleanText = (msg.text || '').replace(WIDGET_TOKEN_RE, '').trim();
  }

  return (
    <div className={`bot-bubble ${msg.isError ? 'error' : ''}`}>
      {cleanText ? <MarkdownRenderer text={cleanText} /> : null}
      {msg.streaming && !msg.text && (
        <div className="typing-dots"><span /><span /><span /></div>
      )}
      {!msg.streaming && widgets.map((w, i) => (
        <WidgetRenderer key={i} type={w.type} params={w.params} />
      ))}
    </div>
  );
};

const SUGGESTIONS = [
  { icon: <ClipboardList size={15} />, text: 'What are the admission requirements?' },
  { icon: <BookOpen size={15} />,      text: 'What programs does UoS offer?' },
  { icon: <ShieldCheck size={15} />,   text: 'Verify bank slip UOS-2026-001234' },
  { icon: <MapPin size={15} />,        text: 'Where is the university located?' },
  { icon: <Sparkles size={15} />,      text: 'What scholarships are available?' },
  { icon: <ShieldCheck size={15} />,   text: 'Verify roll number CS-2026-F-001' },
];

let msgId = 0;

const Chatbot = () => {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  // Typewriter queue: buffer incoming chars and drain at a steady pace
  const charQueueRef = useRef([]);
  const drainerRef = useRef(null);
  const activeBotIdRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [input]);

  const startDrainer = useCallback((botId) => {
    if (drainerRef.current) return; // already running
    // Drain ~5 characters every 18ms → ~280 chars/sec, smooth typewriter feel
    drainerRef.current = setInterval(() => {
      const queue = charQueueRef.current;
      if (queue.length === 0) return;
      const chunk = queue.splice(0, 5).join('');
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, text: m.text + chunk } : m
      ));
    }, 18);
  }, []);

  const stopDrainer = useCallback(() => {
    if (drainerRef.current) {
      clearInterval(drainerRef.current);
      drainerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = { id: ++msgId, text: text.trim(), isBot: false };
    const botId = ++msgId;
    activeBotIdRef.current = botId;
    charQueueRef.current = [];
    stopDrainer();

    setMessages(prev => [...prev, userMsg, { id: botId, text: '', isBot: true, streaming: true }]);
    setInput('');
    setIsStreaming(true);
    startDrainer(botId);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      // Format chat history (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.isBot ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Network error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.token) {
              // Push each character into the queue
              charQueueRef.current.push(...parsed.token.split(''));
            }
          } catch {}
        }
      }

      // Wait for the queue to drain before marking done
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (charQueueRef.current.length === 0) {
            clearInterval(check);
            resolve();
          }
        }, 20);
      });

    } catch (err) {
      stopDrainer();
      charQueueRef.current = [];
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, text: 'Sorry, I could not reach the server. Make sure the backend is running.', isError: true } : m
        ));
      }
    } finally {
      stopDrainer();
      charQueueRef.current = [];
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, streaming: false } : m));
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, startDrainer, stopDrainer]);

  const stopStreaming = () => abortRef.current?.abort();
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
  const canSend = input.trim().length > 0 && !isStreaming;

  return (
    <div className="chat-root">
      {/* ── Header ── */}
      <header className="chat-header">
        <div className="header-brand">
          <div className="brand-logo"><GraduationCap size={20} /></div>
          <div>
            <div className="brand-name">UoS AI Assistant</div>
            <div className="brand-sub">University of Swat</div>
          </div>
        </div>
        <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* ── Messages ── */}
      {messages.length === 0 ? (
        <div className="welcome-state">
          <div className="welcome-logo"><GraduationCap size={40} /></div>
          <h1 className="welcome-title">How can I help you?</h1>
          <p className="welcome-sub">Ask about admissions, programs, fees, location, or verify your documents.</p>
          <div className="suggestion-grid">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className="suggestion-card" onClick={() => sendMessage(s.text)}>
                <span className="sugg-icon">{s.icon}</span>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="messages-area">
          {messages.map(msg => (
            <div key={msg.id} className={`msg-row ${msg.isBot ? 'bot' : 'user'} animate-fade-in`}>
              {msg.isBot ? (
                <div className="bot-msg-wrap">
                  <BotMessage msg={msg} />
                </div>
              ) : (
                <div className="user-msg-wrap">
                  <div className="user-bubble">{msg.text}</div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input ── */}
      <div className="input-zone">
        <div className="input-card">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about UoS…"
            className="chat-textarea"
            rows={1}
            disabled={isStreaming}
          />
          <div className="input-actions">
            {isStreaming ? (
              <button className="action-btn stop-btn" onClick={stopStreaming}>
                <Square size={15} fill="currentColor" />
              </button>
            ) : (
              <button
                className={`action-btn send-btn ${canSend ? 'active' : ''}`}
                onClick={() => sendMessage(input)}
                disabled={!canSend}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
        <p className="disclaimer">
          UoS AI can make mistakes. Verify critical info at <a href="https://uswat.edu.pk" target="_blank" rel="noreferrer">uswat.edu.pk</a>
        </p>
      </div>
    </div>
  );
};

export default Chatbot;
