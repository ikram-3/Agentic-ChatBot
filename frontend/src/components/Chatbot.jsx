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

import logo from '../assets/logo.png';

const API_BASE = '/api';
const BRAND_LOGO_SRC = logo;

/* ── Constants & Helpers ── */
const WIDGET_TOKEN_RE = /(\*\*?|__?)?[\[<][^\]>]*?WIDGET:[^\]>]*?[\]>](\*\*?|__?)?/gi;

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

/* Strip leaked LLM tool call artifacts from response text */
const TOOL_ARTIFACT_RE = /(<\/?(?:function_calls?|invoke|tool_use|tool_result|antml:[\w:]+)[^>]*>|<[a-z_]+>[^<]{0,120}<\/[a-z_]+>|\/[a-z_]+<\/function>|\*\*?\[WIDGET:.*?\]\*\*?)/gi;

/* ── Markdown Renderer ── */
const MarkdownRenderer = ({ text }) => {
  const safeText = (text || '')
    .replace(WIDGET_TOKEN_RE, '')      // remove widget tokens from body
    .replace(TOOL_ARTIFACT_RE, '')     // strip leaked XML tool tags
    .replace(/\n{3,}/g, '\n\n')        // collapse excessive newlines
    .trim();
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
      {(msg.thinking || (msg.streaming && msg.thinkingEnabled)) && (
        <ThinkingPanel 
          content={msg.thinking} 
          isStreaming={msg.streaming && !msg.text} 
        />
      )}

      {/* Status (Thinking, Tools, or Typing dots) */}
      {msg.streaming && !msg.text && (
        <div className="bot-status-container">
          {hasTools ? (
            <ToolStatusBar tools={msg.activeTools} />
          ) : (
            <div className="typing-dots"><span /><span /><span /></div>
          )}
        </div>
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
  { icon: <ShieldCheck size={15} />,   text: 'Verify my bank slip' },
  { icon: <ClipboardList size={15} />, text: 'What are the admission requirements?' },
  { icon: <Sparkles size={15} />,      text: 'What scholarships are available?' },
];

let msgId = 0;

const Chatbot = () => {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Answer typewriter queue
  const charQueueRef = useRef('');
  const drainerRef = useRef(0);
  const activeBotIdRef = useRef(null);
  // Thinking typewriter queue
  const thinkQueueRef = useRef('');
  const thinkDrainerRef = useRef(0);

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
    const drain = () => {
      const queue = charQueueRef.current;
      if (queue.length > 0) {
        const chunk = queue.slice(0, 80);
        charQueueRef.current = queue.slice(80);
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, text: m.text + chunk } : m
        ));
      }
      drainerRef.current = window.requestAnimationFrame(drain);
    };
    drainerRef.current = window.requestAnimationFrame(drain);
  }, []);

  const stopDrainer = useCallback(() => {
    if (drainerRef.current) {
      window.cancelAnimationFrame(drainerRef.current);
      drainerRef.current = 0;
    }
  }, []);

  const startThinkDrainer = useCallback((botId) => {
    if (thinkDrainerRef.current) return;
    const drain = () => {
      const queue = thinkQueueRef.current;
      if (queue.length > 0) {
        const chunk = queue.slice(0, 80);
        thinkQueueRef.current = queue.slice(80);
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, thinking: (m.thinking || '') + chunk } : m
        ));
      }
      thinkDrainerRef.current = window.requestAnimationFrame(drain);
    };
    thinkDrainerRef.current = window.requestAnimationFrame(drain);
  }, []);

  const stopThinkDrainer = useCallback(() => {
    if (thinkDrainerRef.current) {
      window.cancelAnimationFrame(thinkDrainerRef.current);
      thinkDrainerRef.current = 0;
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = { id: ++msgId, text: text.trim(), isBot: false };
    const botId = ++msgId;
    activeBotIdRef.current = botId;
    charQueueRef.current = '';
    thinkQueueRef.current = '';
    stopDrainer();
    stopThinkDrainer();

    setMessages(prev => [
      ...prev,
      userMsg,
      {
        id: botId,
        text: '',
        thinking: '',
        thinkingEnabled: thinkingEnabled, // Track if we expect thinking
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
                  if (!thinkDrainerRef.current) startThinkDrainer(botId);
                  thinkQueueRef.current += event.token;
                }
                break;

              // ── Legacy full thinking event (fallback) ───────────────────
              case 'thinking':
                thinkingReceived = true;
                if (event.content) {
                  thinkQueueRef.current += event.content;
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
                  // Always start drainer immediately on first token
                  if (!drainerRef.current) startDrainer(botId);
                  charQueueRef.current += event.token;
                }
                break;

              // ── Error ────────────────────────────────────────────────────
              case 'error':
                stopDrainer();
                charQueueRef.current = '';
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
                  charQueueRef.current += event.token;
                }
                break;
            }
          } catch {
            // Malformed JSON — skip
          }
        }
      }

      // Stream done — flush any remaining chars instantly to prevent truncation
      stopDrainer();
      stopThinkDrainer();
      const remainingChars = charQueueRef.current;
      const remainingThink = thinkQueueRef.current;
      charQueueRef.current = '';
      thinkQueueRef.current = '';
      if (remainingChars.length > 0 || remainingThink.length > 0) {
        setMessages(prev => prev.map(m => {
          if (m.id !== botId) return m;
          return {
            ...m,
            text: m.text + remainingChars,
            thinking: (m.thinking || '') + remainingThink,
          };
        }));
      }

    } catch (err) {
      stopDrainer();
      stopThinkDrainer();
      charQueueRef.current = '';
      thinkQueueRef.current = '';
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === botId
            ? { ...m, text: 'Sorry, I could not reach the server. Make sure the backend is running.', isError: true }
            : m
        ));
      }
    } finally {
      // Drainers already stopped above — just clean up state
      charQueueRef.current = '';
      thinkQueueRef.current = '';
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
    charQueueRef.current = '';
    thinkQueueRef.current = '';
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
          <div className="brand-logo">
            {logoLoadFailed ? (
              <GraduationCap size={20} />
            ) : (
              <img
                src={BRAND_LOGO_SRC}
                alt="UoS Logo"
                className="brand-logo-img"
                onError={() => setLogoLoadFailed(true)}
              />
            )}
          </div>
          <div>
            <div className="brand-name">UoS AI Concierge</div>
            <div className="brand-sub">University of Swat • Smart Student Helpdesk</div>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      {messages.length === 0 ? (
        <div className="welcome-state">
          <div className="welcome-logo">
          <img src={BRAND_LOGO_SRC} alt="UoS Logo" className="brand-logo-img" />
        </div>
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
