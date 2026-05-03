import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUp, Square, GraduationCap, Sparkles,
  BookOpen, ClipboardList, MapPin, ShieldCheck,
  Sun, Moon, Brain, ChevronDown, ChevronUp,
  Globe, BookMarked, Calculator, Layers
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

/* ── Tool Icon Map ── */
const TOOL_ICONS = {
  'fast_scrape_university_news': <Globe size={13} />,
  'deep_scrape_with_playwright': <Layers size={13} />,
  'search_wikipedia_topic':      <BookMarked size={13} />,
  'WikipediaQueryRun':           <BookMarked size={13} />,
  'Calculator':                  <Calculator size={13} />,
};

const getToolIcon = (toolName) => TOOL_ICONS[toolName] || <Sparkles size={13} />;

/* ── Markdown Renderer ── */
const MarkdownRenderer = ({ text }) => {
  const safeText = (text || '').replace(WIDGET_TOKEN_RE, '').trim();
  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="inline-link">
              {getFriendlyLabel(href) || children}
            </a>
          ),
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
              <code className={className} {...props}>{children}</code>
            );
          }
        }}
      >
        {safeText}
      </ReactMarkdown>
    </div>
  );
};

/* ── Thinking Panel ── */
const ThinkingPanel = ({ content, isStreaming }) => {
  const [expanded, setExpanded] = useState(true);

  // Auto-expand while streaming, keep user preference after
  useEffect(() => {
    if (isStreaming) setExpanded(true);
  }, [isStreaming]);

  if (!content && !isStreaming) return null;

  return (
    <div className="thinking-panel">
      <button
        className="thinking-summary"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className="thinking-icon-wrap">
          <Brain size={13} />
        </span>
        <span className="thinking-label">
          {isStreaming ? 'Thinking…' : 'Thought process'}
        </span>
        {isStreaming && <span className="thinking-pulse" />}
        <span className="thinking-chevron">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {expanded && (
        <div className="thinking-body">
          <div className="thinking-md">
            <MarkdownRenderer text={content} />
          </div>
          {isStreaming && <span className="think-cursor-block" />}
        </div>
      )}
    </div>
  );
};

/* ── Tool Orchestration Status Bar ── */
const ToolStatusBar = ({ tools }) => {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="tool-status-bar">
      {tools.map((t, i) => (
        <span key={i} className="tool-chip">
          <span className="tool-chip-icon">{getToolIcon(t.tool)}</span>
          <span className="tool-chip-label">{t.icon} {t.label}</span>
          <span className="tool-chip-dots">
            <span /><span /><span />
          </span>
        </span>
      ))}
    </div>
  );
};

/* ── Bot Message ── */
const BotMessage = ({ msg }) => {
  let cleanText = msg.text || '';
  let widgets = [];
  try {
    const parsed = parseWidgets(cleanText);
    cleanText = parsed.cleanText;
    widgets = parsed.widgets || [];
  } catch (e) {
    cleanText = (msg.text || '').replace(WIDGET_TOKEN_RE, '').trim();
  }

  const hasThinking = !!(msg.thinking);
  const hasTools = msg.activeTools && msg.activeTools.length > 0;
  const showTypingDots = msg.streaming && !msg.text && !hasThinking;

  return (
    <div className={`bot-bubble ${msg.isError ? 'error' : ''}`}>
      {/* Thinking Panel */}
      {hasThinking && (
        <ThinkingPanel content={msg.thinking} isStreaming={msg.streaming && !msg.text} />
      )}

      {/* Tool Orchestration Bar */}
      {hasTools && <ToolStatusBar tools={msg.activeTools} />}

      {/* Typing dots — only before any content arrives */}
      {showTypingDots && (
        <div className="typing-dots"><span /><span /><span /></div>
      )}

      {/* Answer text */}
      {cleanText ? <MarkdownRenderer text={cleanText} /> : null}

      {/* Widgets (after streaming ends) */}
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
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Answer typewriter queue
  const charQueueRef = useRef([]);
  const drainerRef = useRef(null);
  const activeBotIdRef = useRef(null);
  // Thinking typewriter queue
  const thinkQueueRef = useRef([]);
  const thinkDrainerRef = useRef(null);

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
    if (drainerRef.current) return;
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

  const startThinkDrainer = useCallback((botId) => {
    if (thinkDrainerRef.current) return;
    thinkDrainerRef.current = setInterval(() => {
      const q = thinkQueueRef.current;
      if (q.length === 0) return;
      const chunk = q.splice(0, 4).join('');
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, thinking: (m.thinking || '') + chunk } : m
      ));
    }, 16);
  }, []);

  const stopThinkDrainer = useCallback(() => {
    if (thinkDrainerRef.current) {
      clearInterval(thinkDrainerRef.current);
      thinkDrainerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = { id: ++msgId, text: text.trim(), isBot: false };
    const botId = ++msgId;
    activeBotIdRef.current = botId;
    charQueueRef.current = [];
    thinkQueueRef.current = [];
    stopDrainer();
    stopThinkDrainer();

    setMessages(prev => [
      ...prev,
      userMsg,
      {
        id: botId,
        text: '',
        thinking: '',
        activeTools: [],
        isBot: true,
        streaming: true,
      }
    ]);
    setInput('');
    setIsStreaming(true);
    startThinkDrainer(botId);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const history = messages.slice(-10).map(m => ({
        role: m.isBot ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history, thinking_enabled: thinkingEnabled }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Network error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let thinkingReceived = false;

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
            const event = JSON.parse(raw);

            switch (event.type) {
              // ── Thinking token: typewriter for Model 1 ──────────────────
              case 'thinking_token':
                thinkingReceived = true;
                if (event.token) {
                  thinkQueueRef.current.push(...event.token.split(''));
                }
                break;

              // ── Legacy full thinking event (fallback) ───────────────────
              case 'thinking':
                thinkingReceived = true;
                if (event.content) {
                  thinkQueueRef.current.push(...event.content.split(''));
                }
                break;

              // ── Tool started ─────────────────────────────────────────────
              case 'tool_start':
                setMessages(prev => prev.map(m => {
                  if (m.id !== botId) return m;
                  const existing = m.activeTools || [];
                  const alreadyExists = existing.some(t => t.tool === event.tool);
                  if (alreadyExists) return m;
                  return {
                    ...m,
                    activeTools: [...existing, {
                      tool: event.tool,
                      label: event.label,
                      icon: event.icon,
                    }]
                  };
                }));
                break;

              // ── Tool ended ───────────────────────────────────────────────
              case 'tool_end':
                setMessages(prev => prev.map(m =>
                  m.id === botId
                    ? { ...m, activeTools: (m.activeTools || []).filter(t => t.tool !== event.tool) }
                    : m
                ));
                break;

              // ── Token: final answer streaming ────────────────────────────
              case 'token':
                if (event.token) {
                  if (!thinkingReceived) {
                    // If no thinking yet, start drainer immediately
                    startDrainer(botId);
                  } else if (!drainerRef.current) {
                    startDrainer(botId);
                  }
                  charQueueRef.current.push(...event.token.split(''));
                }
                break;

              // ── Error ────────────────────────────────────────────────────
              case 'error':
                stopDrainer();
                charQueueRef.current = [];
                setMessages(prev => prev.map(m =>
                  m.id === botId
                    ? { ...m, text: event.message || 'An error occurred.', isError: true }
                    : m
                ));
                break;

              // ── Legacy format fallback ───────────────────────────────────
              default:
                if (event.token) {
                  if (!drainerRef.current) startDrainer(botId);
                  charQueueRef.current.push(...event.token.split(''));
                }
                break;
            }
          } catch {
            // Malformed JSON — skip
          }
        }
      }

      // Wait for char queue to drain
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
      stopThinkDrainer();
      charQueueRef.current = [];
      thinkQueueRef.current = [];
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === botId
            ? { ...m, text: 'Sorry, I could not reach the server. Make sure the backend is running.', isError: true }
            : m
        ));
      }
    } finally {
      stopDrainer();
      stopThinkDrainer();
      charQueueRef.current = [];
      thinkQueueRef.current = [];
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, streaming: false, activeTools: [] } : m
      ));
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, messages, startDrainer, stopDrainer, startThinkDrainer, stopThinkDrainer]);

  const stopStreaming = () => {
    if (abortRef.current) abortRef.current.abort();
    stopDrainer();
    stopThinkDrainer();
    charQueueRef.current = [];
    thinkQueueRef.current = [];
    setMessages(prev => prev.map(m =>
      m.streaming ? { ...m, streaming: false, activeTools: [] } : m
    ));
    setIsStreaming(false);
    abortRef.current = null;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const canSend = input.trim().length > 0 && !isStreaming;

  return (
    <div className="chat-root">
      {/* ── Header ── */}
      <header className="chat-header">
        <div className="header-brand">
          <div className="brand-logo"><GraduationCap size={20} /></div>
          <div>
            <div className="brand-name">UoS AI Assistant</div>
            <div className="brand-sub">University of Swat · Powered by Dual-Model AI</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
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
          <button
            className={`think-input-btn ${thinkingEnabled ? 'active' : ''}`}
            onClick={() => setThinkingEnabled(v => !v)}
            title={thinkingEnabled ? 'Thinking Enabled (Premium AI Reasoning)' : 'Thinking Disabled (Fast Direct Response)'}
            disabled={isStreaming}
          >
            <Brain size={16} />
          </button>
          
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
              <button className="action-btn stop-btn" onClick={stopStreaming} title="Stop generating">
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
