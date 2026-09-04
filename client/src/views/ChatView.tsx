import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  Code2,
  Download,
  Trash2,
  Zap,
  Brain,
  MessageSquare,
  Plus,
  Search,
  Edit2,
  Terminal,
  Mail,
  Volume2,
  VolumeX,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Square,
  X,
} from 'lucide-react';
import { ModelUsageTelemetry } from '../components/Header.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  timestamp: string;
  model?: string;
  agent?: string;
}

interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messageCount?: number;
  lastMessage?: string;
}

interface UserMemory {
  id: string;
  category: string;
  content: string;
  source: string;
  confidence: number;
  created_at: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string, agent?: string) => void;
  isStreaming: boolean;
  activeModelName?: string;
  usageTelemetry?: ModelUsageTelemetry;
  onApplyCode?: (code: string) => void;
  onRunInTerminal?: (cmd: string) => void;
  onClearChat?: () => void;
  onStopExecution?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  activeModelName,
  usageTelemetry,
  onApplyCode,
  onRunInTerminal,
  onClearChat,
  onStopExecution,
}) => {
  // Input and Chat Controls
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('general');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Conversations Management
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('default');
  const [convSearch, setConvSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Long-Term Memory & Learning Engine
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [memorySearch, setMemorySearch] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('preference');
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  // Models State
  const defaultModels = [
    { id: 'optimal-auto', name: 'Optimal Auto (Router)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'deepseek-v3', name: 'DeepSeek V3' },
    { id: 'deepseek-r1', name: 'DeepSeek R1 (Thinking)' },
    { id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder (Local)' },
    { id: 'llama3.2:latest', name: 'Llama 3.2 (Local)' },
  ];
  const [availableModels, setAvailableModels] = useState(defaultModels);
  const [selectedModel, setSelectedModel] = useState(activeModelName || 'optimal-auto');

  useEffect(() => {
    if (activeModelName) {
      setSelectedModel(activeModelName);
    }
  }, [activeModelName]);

  // Arena Comparison State
  const [isArenaMode, setIsArenaMode] = useState(false);
  const [modelA, setModelA] = useState('gemini-2.0-flash');
  const [modelB, setModelB] = useState('deepseek-r1');
  const [arenaResponseA, setArenaResponseA] = useState('');
  const [arenaResponseB, setArenaResponseB] = useState('');
  const [arenaTimingA, setArenaTimingA] = useState<number | null>(null);
  const [arenaTimingB, setArenaTimingB] = useState<number | null>(null);
  const [isArenaRunning, setIsArenaRunning] = useState(false);

  // Quick Prompt Chips
  const quickPrompts = [
    { label: 'Security Audit', prompt: 'Audit this workspace for prompt injection and path traversal vulnerabilities.' },
    { label: 'Inspect Git Diff', prompt: 'Inspect our recent git status and summarize modified lines.' },
    { label: 'Optimize SQL Ledger', prompt: 'Write an optimized SQL query to rank top revenue streams across departments.' },
    { label: 'Draft Client Memo', prompt: 'Draft a professional executive email update to stakeholders about our progress.' },
  ];

  // Load models
  const loadModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        const formatted = data.models.map((m: any) => ({
          id: m.id,
          name: `${m.name}${m.isLocal ? ' (Local)' : ''}`,
        }));
        setAvailableModels(formatted);
      }
    } catch {
      // Fallback
    }
  };

  // Load conversations list from backend SQLite
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.conversations && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch {
      // ignore
    }
  };

  // Create new conversation
  const handleCreateNewChat = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Chat #${conversations.length + 1}` }),
      });
      const data = await res.json();
      if (data.id) {
        setActiveConversationId(data.id);
        loadConversations();
        if (onClearChat) onClearChat();
      }
    } catch {
      // Fallback local reset
      if (onClearChat) onClearChat();
    }
  };

  // Rename conversation
  const handleSaveRename = async (id: string) => {
    if (!editingTitle.trim()) return;
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      setEditingConvId(null);
      loadConversations();
    } catch {
      setEditingConvId(null);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      loadConversations();
      if (activeConversationId === id) {
        setActiveConversationId('default');
        if (onClearChat) onClearChat();
      }
    } catch {
      // ignore
    }
  };

  // Load memories from backend SQLite
  const loadMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      if (data.memories) {
        setMemories(data.memories);
      }
    } catch {
      // ignore
    }
  };

  // Add memory manually
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;
    setIsSavingMemory(true);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newMemoryCategory,
          content: newMemoryContent.trim(),
          source: 'user_explicit',
        }),
      });
      setNewMemoryContent('');
      loadMemories();
    } catch {
      // ignore
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Delete memory
  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      loadMemories();
    } catch {
      // ignore
    }
  };

  // Text-to-speech read aloud
  const handleReadAloud = (text: string, msgId: string) => {
    if (!window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/[#*_`~>-]/g, '')
      .slice(0, 1000);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download code as file
  const downloadCode = (code: string, lang: string) => {
    const extMap: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      html: 'html',
      css: 'css',
      sql: 'sql',
      json: 'json',
      markdown: 'md',
      sh: 'sh',
      bash: 'sh',
    };
    const ext = extMap[lang.toLowerCase()] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_${Date.now()}.${ext}`;
    a.click();
  };

  // Auto-scroll on messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, arenaResponseA, arenaResponseB, isStreaming]);

  // Initial load
  useEffect(() => {
    loadModels();
    loadConversations();
    loadMemories();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (isArenaMode) {
      handleArenaSubmit(input.trim());
      setInput('');
      return;
    }

    if (isStreaming) return;
    onSendMessage(input.trim(), selectedAgent !== 'general' ? selectedAgent : undefined);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleArenaSubmit = async (prompt: string) => {
    setIsArenaRunning(true);
    setArenaResponseA('');
    setArenaResponseB('');
    setArenaTimingA(null);
    setArenaTimingB(null);

    const start = Date.now();

    const runA = fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: modelA }),
    })
      .then((res) => res.json())
      .then((data) => {
        setArenaTimingA(Date.now() - start);
        setArenaResponseA(data.content || data.error || 'No response received.');
      })
      .catch((err) => {
        setArenaTimingA(Date.now() - start);
        setArenaResponseA(`Failed: ${err.message}`);
      });

    const runB = fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: modelB }),
    })
      .then((res) => res.json())
      .then((data) => {
        setArenaTimingB(Date.now() - start);
        setArenaResponseB(data.content || data.error || 'No response received.');
      })
      .catch((err) => {
        setArenaTimingB(Date.now() - start);
        setArenaResponseB(`Failed: ${err.message}`);
      });

    try {
      await Promise.allSettled([runA, runB]);
    } finally {
      setIsArenaRunning(false);
    }
  };

  // Export full conversation history
  const exportConversation = (format: 'md' | 'json') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_export_${Date.now()}.json`;
      a.click();
    } else {
      const text = messages
        .map((m) => `### ${m.role === 'user' ? '👤 User' : '🤖 AI Co-Pilot'} (${m.timestamp})\n\n${m.content}\n\n---`)
        .join('\n\n');
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_export_${Date.now()}.md`;
      a.click();
    }
  };

  // Helper: Detect Email / Memo format
  const parseEmailCard = (text: string) => {
    const subjectMatch = text.match(/^Subject:\s*(.+)$/im);
    const toMatch = text.match(/^To:\s*(.+)$/im);
    const fromMatch = text.match(/^From:\s*(.+)$/im);

    if (subjectMatch || (toMatch && fromMatch)) {
      const subject = subjectMatch ? subjectMatch[1].trim() : 'Project Correspondence';
      const to = toMatch ? toMatch[1].trim() : 'Stakeholders';
      const from = fromMatch ? fromMatch[1].trim() : 'OmniWorkspace Lead';
      return { isEmail: true, subject, to, from };
    }
    return { isEmail: false, subject: '', to: '', from: '' };
  };

  // Helper: Render formatted markdown tables, callouts, lists, inline codes
  const renderFormattedBlock = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (k: string) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0];
      const rows = tableRows.slice(1);
      nodes.push(
        <div key={k} style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, idx) => {
      // Table line
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const parts = line.split('|').slice(1, -1);
        if (line.includes('---')) return; // separator
        inTable = true;
        tableRows.push(parts);
        return;
      } else if (inTable) {
        flushTable(`${keyPrefix}_table_${idx}`);
      }

      // Checkboxes
      const checkMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (checkMatch) {
        const isChecked = checkMatch[1].toLowerCase() === 'x';
        nodes.push(
          <div key={`${keyPrefix}_task_${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '3px 0', fontSize: '12.5px' }}>
            <input type="checkbox" checked={isChecked} readOnly style={{ accentColor: 'var(--accent-primary)' }} />
            <span style={{ color: isChecked ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: isChecked ? 'line-through' : 'none' }}>
              {checkMatch[2]}
            </span>
          </div>
        );
        return;
      }

      // Headings
      if (line.startsWith('# ')) {
        nodes.push(
          <h2 key={`${keyPrefix}_h1_${idx}`} style={{ fontSize: '16px', fontWeight: 700, margin: '12px 0 6px 0', color: '#38bdf8' }}>
            {line.slice(2)}
          </h2>
        );
        return;
      }
      if (line.startsWith('## ')) {
        nodes.push(
          <h3 key={`${keyPrefix}_h2_${idx}`} style={{ fontSize: '14px', fontWeight: 600, margin: '10px 0 4px 0', color: '#f8fafc' }}>
            {line.slice(3)}
          </h3>
        );
        return;
      }
      if (line.startsWith('### ')) {
        nodes.push(
          <h4 key={`${keyPrefix}_h3_${idx}`} style={{ fontSize: '13px', fontWeight: 600, margin: '8px 0 4px 0', color: 'var(--accent-primary)' }}>
            {line.slice(4)}
          </h4>
        );
        return;
      }

      // Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        nodes.push(
          <div key={`${keyPrefix}_li_${idx}`} style={{ display: 'flex', gap: '8px', margin: '3px 0', paddingLeft: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-primary)' }}>•</span>
            <div style={{ flex: 1 }}>{renderInlineCode(line.slice(2))}</div>
          </div>
        );
        return;
      }

      if (!line.trim()) {
        nodes.push(<div key={`${keyPrefix}_empty_${idx}`} style={{ height: '6px' }} />);
        return;
      }

      // Normal paragraph
      nodes.push(
        <div key={`${keyPrefix}_p_${idx}`} style={{ margin: '3px 0', fontSize: '12.5px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          {renderInlineCode(line)}
        </div>
      );
    });

    if (inTable) flushTable(`${keyPrefix}_table_end`);
    return nodes;
  };

  const renderInlineCode = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '11.5px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} style={{ color: '#f8fafc', fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Main Message Parser: Splits Reasoning (<think>), Code blocks, Email cards, and Markdown
  const renderMessageContent = (content: string, msgId: string) => {
    // 1. Check for thinking / reasoning block
    let displayContent = content;
    let thinkingBlock: string | null = null;
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      thinkingBlock = thinkMatch[1].trim();
      displayContent = content.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    }

    // 2. Check for Email card layout
    const emailInfo = parseEmailCard(displayContent);

    // 3. Parse code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(displayContent)) !== null) {
      if (match.index > lastIndex) {
        const textSegment = displayContent.slice(lastIndex, match.index);
        parts.push(
          <div key={`text_${lastIndex}`}>
            {renderFormattedBlock(textSegment, `chunk_${lastIndex}`)}
          </div>
        );
      }

      const lang = match[1] || 'code';
      const code = match[2];
      const codeBlockId = `${msgId}_block_${match.index}`;
      const isTerminalExecutable = ['sh', 'bash', 'zsh', 'terminal', 'shell'].includes(lang.toLowerCase());

      parts.push(
        <div
          key={codeBlockId}
          style={{
            margin: '12px 0',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            background: '#04060d',
          }}
        >
          {/* Code Toolbar */}
          <div
            style={{
              padding: '6px 10px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code2 size={12} color="var(--accent-primary)" />
              <span style={{ textTransform: 'lowercase', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {lang}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {/* Copy Code */}
              <button
                className="icon-btn"
                style={{ padding: '2px 6px', border: 'none', fontSize: '11px', gap: '4px' }}
                onClick={() => copyToClipboard(code, codeBlockId)}
                title="Copy code"
              >
                {copiedId === codeBlockId ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                <span>{copiedId === codeBlockId ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Apply to Editor */}
              {onApplyCode && (
                <button
                  className="icon-btn"
                  style={{ padding: '2px 6px', border: 'none', fontSize: '11px', color: 'var(--accent-primary)', gap: '4px' }}
                  onClick={() => onApplyCode(code)}
                  title="Insert code into Code Studio"
                >
                  <Code2 size={12} />
                  <span>Insert in Studio</span>
                </button>
              )}

              {/* Run in Terminal */}
              {onRunInTerminal && isTerminalExecutable && (
                <button
                  className="icon-btn"
                  style={{ padding: '2px 6px', border: 'none', fontSize: '11px', color: '#34d399', gap: '4px' }}
                  onClick={() => onRunInTerminal(code.trim())}
                  title="Execute command in bottom Terminal"
                >
                  <Terminal size={12} />
                  <span>Run in Terminal</span>
                </button>
              )}

              {/* Download Code File */}
              <button
                className="icon-btn"
                style={{ padding: '2px 5px', border: 'none' }}
                onClick={() => downloadCode(code, lang)}
                title="Download as file"
              >
                <Download size={12} />
              </button>
            </div>
          </div>

          <pre
            style={{
              padding: '12px 14px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.5',
              overflowX: 'auto',
              color: '#38bdf8',
              margin: 0,
            }}
          >
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < displayContent.length) {
      parts.push(
        <div key={`text_${lastIndex}`}>
          {renderFormattedBlock(displayContent.slice(lastIndex), `chunk_${lastIndex}`)}
        </div>
      );
    }

    return (
      <div>
        {/* Thinking / Reasoning Accordion */}
        {thinkingBlock && (
          <details
            style={{
              marginBottom: '12px',
              background: 'rgba(56, 189, 248, 0.04)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '11.5px',
            }}
          >
            <summary style={{ cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Brain size={12} />
              <span>Model Thought & Analytical Process</span>
            </summary>
            <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {thinkingBlock}
            </div>
          </details>
        )}

        {/* Email Formatted Card (if email pattern detected) */}
        {emailInfo.isEmail && (
          <div
            style={{
              marginBottom: '14px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(56, 189, 248, 0.08)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={13} color="var(--accent-primary)" />
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Formatted Correspondence
                </span>
              </div>
              <button
                className="btn-secondary"
                style={{ height: '22px', fontSize: '10.5px', padding: '0 8px' }}
                onClick={() => copyToClipboard(displayContent, `email_${msgId}`)}
              >
                {copiedId === `email_${msgId}` ? 'Copied' : 'Copy Email'}
              </button>
            </div>

            <div style={{ padding: '10px 14px', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
              <div><strong>Subject:</strong> <span style={{ color: 'var(--text-accent)' }}>{emailInfo.subject}</span></div>
              <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>
                <span>To: {emailInfo.to}</span> • <span>From: {emailInfo.from}</span>
              </div>
            </div>

            <div style={{ padding: '14px' }}>
              {parts}
            </div>
          </div>
        )}

        {!emailInfo.isEmail && parts}
      </div>
    );
  };

  // Filter conversations in sidebar
  const filteredConversations = useMemo(() => {
    if (!convSearch.trim()) return conversations;
    const s = convSearch.toLowerCase();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(s) || (c.lastMessage && c.lastMessage.toLowerCase().includes(s))
    );
  }, [conversations, convSearch]);

  // Filter memories in drawer
  const filteredMemories = useMemo(() => {
    if (!memorySearch.trim()) return memories;
    const s = memorySearch.toLowerCase();
    return memories.filter(
      (m) => m.content.toLowerCase().includes(s) || m.category.toLowerCase().includes(s)
    );
  }, [memories, memorySearch]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* 1. LEFT CONVERSATION MANAGEMENT SIDEBAR */}
      {isSidebarOpen && (
        <div
          style={{
            width: '260px',
            minWidth: '260px',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          {/* Sidebar Header */}
          <div
            style={{
              height: '42px',
              padding: '0 10px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={14} color="var(--accent-primary)" />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                CONVERSATIONS
              </span>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleCreateNewChat}
                className="btn-primary"
                style={{ height: '24px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                title="Start New Conversation"
              >
                <Plus size={12} />
                <span>New</span>
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse Sidebar"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px' }}
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>

          {/* Search Conversations Input */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search chats..."
                style={{
                  width: '100%',
                  height: '24px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 8px 0 24px',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <Search size={11} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Threads List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                No conversations yet. Click "+ New" to begin.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                const isEditing = editingConvId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id);
                            if (e.key === 'Escape') setEditingConvId(null);
                          }}
                          onBlur={() => handleSaveRename(conv.id)}
                          autoFocus
                          style={{
                            height: '20px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-accent)',
                            borderRadius: '2px',
                            color: '#fff',
                            fontSize: '11px',
                            padding: '0 4px',
                            outline: 'none',
                            width: '80%',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isActive ? '600' : '500',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '160px',
                          }}
                        >
                          {conv.title}
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConvId(conv.id);
                            setEditingTitle(conv.title);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Rename Thread"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Delete Thread"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {conv.lastMessage && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.lastMessage}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              fontSize: '10.5px',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{conversations.length} total threads</span>
            <span>SQLite Synced</span>
          </div>
        </div>
      )}

      {/* 2. MAIN CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
        {/* Top Chat Bar */}
        <div
          style={{
            height: '42px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="Open Conversation Sidebar"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <PanelLeft size={15} />
              </button>
            )}

            {/* Model Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  height: '24px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  padding: '0 6px',
                  outline: 'none',
                }}
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent Mode Pills */}
            <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
              {[
                { id: 'general', label: 'Architect' },
                { id: 'coding', label: 'Coding' },
                { id: 'research', label: 'Research' },
                { id: 'sql', label: 'Data & SQL' },
              ].map((ag) => (
                <button
                  key={ag.id}
                  onClick={() => setSelectedAgent(ag.id)}
                  style={{
                    height: '22px',
                    padding: '0 8px',
                    fontSize: '10.5px',
                    borderRadius: '12px',
                    background: selectedAgent === ag.id ? 'var(--btn-bg)' : 'transparent',
                    color: selectedAgent === ag.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                    border: `1px solid ${selectedAgent === ag.id ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {ag.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Long-Term Memory Toggle Button */}
            <button
              onClick={() => setIsMemoryOpen(!isMemoryOpen)}
              className="btn-secondary"
              style={{
                height: '26px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderColor: memories.length > 0 ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle)',
              }}
              title="View Learned Memories & Rules"
            >
              <Brain size={12} color="var(--accent-primary)" />
              <span>Learned Memory ({memories.length})</span>
            </button>

            {/* Arena Comparison Button */}
            <button
              onClick={() => setIsArenaMode(!isArenaMode)}
              className="btn-secondary"
              style={{
                height: '26px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: isArenaMode ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              }}
              title="Dual-Model Arena Benchmark"
            >
              <Zap size={12} color="var(--warning)" />
              <span>Arena</span>
            </button>

            {/* Export Chat */}
            <button
              onClick={() => exportConversation('md')}
              className="btn-secondary"
              style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
              title="Export Conversation to Markdown"
            >
              <Download size={12} />
            </button>

            {/* Clear Chat */}
            {onClearChat && (
              <button
                onClick={onClearChat}
                className="btn-secondary"
                style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                title="Clear Current Thread"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Dual-Model Arena Comparison View */}
        {isArenaMode && (
          <div
            style={{
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '12px',
            }}
          >
            {/* Model A Box */}
            <div style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                <strong>Model A:</strong>
                <select value={modelA} onChange={(e) => setModelA(e.target.value)} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '11px' }}>
                  {availableModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {arenaTimingA && <span style={{ color: 'var(--text-accent)' }}>{(arenaTimingA / 1000).toFixed(2)}s</span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {arenaResponseA || (isArenaRunning ? 'Generating response...' : 'Awaiting prompt...')}
              </div>
            </div>

            {/* Model B Box */}
            <div style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                <strong>Model B:</strong>
                <select value={modelB} onChange={(e) => setModelB(e.target.value)} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '11px' }}>
                  {availableModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {arenaTimingB && <span style={{ color: 'var(--text-accent)' }}>{(arenaTimingB / 1000).toFixed(2)}s</span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {arenaResponseB || (isArenaRunning ? 'Generating response...' : 'Awaiting prompt...')}
              </div>
            </div>
          </div>
        )}

        {/* Message Feed Container */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && index === messages.length - 1;

            return (
              <div
                key={msg.id || index}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '80%' : '88%',
                }}
              >
                {/* Avatar Icon */}
                {!isUser && (
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={16} />
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  {/* Message Metadata Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      gap: '8px',
                      marginBottom: '4px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{isUser ? 'You' : 'Universal Co-Pilot'}</span>
                    <span>•</span>
                    <span>{msg.timestamp || 'Just now'}</span>
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    style={{
                      background: isUser ? 'var(--btn-bg)' : 'var(--bg-card)',
                      border: `1px solid ${isUser ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    {isUser ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.content}</div>
                    ) : (
                      renderMessageContent(msg.content, msg.id)
                    )}
                  </div>

                  {/* Assistant Message Actions Toolbar */}
                  {!isUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      {/* Copy Message */}
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                        title="Copy Response"
                      >
                        {copiedId === msg.id ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      {/* Read Aloud */}
                      <button
                        onClick={() => handleReadAloud(msg.content, msg.id)}
                        style={{ background: 'transparent', border: 'none', color: speakingMsgId === msg.id ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                        title="Read Aloud"
                      >
                        {speakingMsgId === msg.id ? <VolumeX size={11} /> : <Volume2 size={11} />}
                        <span>{speakingMsgId === msg.id ? 'Stop Speech' : 'Listen'}</span>
                      </button>
                    </div>
                  )}

                  {/* Follow-up Suggestion Chips for last assistant message */}
                  {isLastAssistant && !isStreaming && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {['Explain step-by-step', 'Add automated unit tests', 'Refactor for performance', 'Draft documentation'].map((chip, i) => (
                        <button
                          key={i}
                          onClick={() => onSendMessage(chip)}
                          style={{
                            fontSize: '11px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            color: 'var(--text-secondary)',
                            padding: '3px 9px',
                            cursor: 'pointer',
                          }}
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'var(--btn-bg)',
                      border: '1px solid var(--border-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <User size={15} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Streaming Typing Indicator */}
          {isStreaming && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--text-accent)', fontSize: '12px' }}>
              <Bot size={16} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={13} className="animate-spin" />
                <span>Co-Pilot is synthesizing multi-agent solution...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar & Controls */}
        <div
          style={{
            padding: '12px 18px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Quick Prompts Bar (when chat is short) */}
          {messages.length <= 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Suggestions:</span>
              {quickPrompts.map((q) => (
                <button
                  key={q.label}
                  onClick={() => onSendMessage(q.prompt)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Live Context Window & Tokens Remaining Indicator */}
          {usageTelemetry && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '5px 10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={12} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {usageTelemetry.modelName || activeModelName || 'Optimal Auto'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span>
                  Context:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {(usageTelemetry.totalTokens || 0).toLocaleString()}
                  </strong>{' '}
                  / {(usageTelemetry.contextWindow || 128000).toLocaleString()} tokens
                </span>
                {input.trim().length > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--accent-primary)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                    title="Estimated tokens in your current draft prompt"
                  >
                    +~{Math.max(1, Math.ceil(input.trim().length / 4))} draft tokens
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Visual Capacity Bar */}
                <div
                  style={{
                    width: '64px',
                    height: '5px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                  title={`Context capacity used: ${(100 - (usageTelemetry.percentRemaining ?? 100)).toFixed(1)}%`}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, 100 - (usageTelemetry.percentRemaining ?? 100)))}%`,
                      background:
                        (usageTelemetry.percentRemaining ?? 100) > 30
                          ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                          : (usageTelemetry.percentRemaining ?? 100) > 10
                          ? '#f59e0b'
                          : '#ef4444',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color:
                      (usageTelemetry.percentRemaining ?? 100) > 30
                        ? '#10b981'
                        : (usageTelemetry.percentRemaining ?? 100) > 10
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {(usageTelemetry.tokensRemaining ?? usageTelemetry.contextWindow ?? 128000).toLocaleString()} tokens left ({usageTelemetry.percentRemaining ?? 100}%)
                </span>

                {usageTelemetry.promptTokens > 0 && (
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '10px',
                    }}
                    title="Prompt (input) vs Completion (output) tokens recorded this session"
                  >
                    (in: {usageTelemetry.promptTokens.toLocaleString()} / out: {usageTelemetry.completionTokens.toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div
              style={{
                flex: 1,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask Co-Pilot anything... (Press Enter to send, Shift+Enter for newline)"
                disabled={isStreaming}
                rows={1}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  maxHeight: '140px',
                  lineHeight: '1.5',
                }}
              />
            </div>

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopExecution}
                style={{
                  height: '34px',
                  padding: '0 12px',
                  background: 'var(--danger)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Square size={13} fill="currentColor" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn-primary"
                style={{ height: '34px', padding: '0 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Send size={13} />
                <span>Send</span>
              </button>
            )}
          </form>
        </div>

        {/* 3. SLIDING LONG-TERM MEMORY & LEARNING DRAWER */}
        {isMemoryOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '350px',
              background: 'var(--bg-sidebar)',
              borderLeft: '1px solid var(--border-subtle)',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Memory Header */}
            <div
              style={{
                height: '42px',
                padding: '0 12px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Brain size={15} color="var(--accent-primary)" />
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                  LONG-TERM MEMORY & RULES
                </span>
              </div>
              <button
                onClick={() => setIsMemoryOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Memory Info Subtitle */}
            <div style={{ padding: '10px 12px', background: 'rgba(56, 189, 248, 0.04)', borderBottom: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
              Learned rules and preferences are injected into all AI prompts to personalize responses across sessions.
            </div>

            {/* Add Memory Form */}
            <form onSubmit={handleAddMemory} style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <select
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value)}
                  style={{
                    height: '26px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    padding: '0 4px',
                    outline: 'none',
                  }}
                >
                  <option value="preference">Preference</option>
                  <option value="convention">Convention</option>
                  <option value="instruction">Instruction</option>
                  <option value="fact">Fact</option>
                </select>

                <input
                  type="text"
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="e.g. Always use TypeScript..."
                  style={{
                    flex: 1,
                    height: '26px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    padding: '0 8px',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!newMemoryContent.trim() || isSavingMemory}
                className="btn-primary"
                style={{ width: '100%', height: '24px', fontSize: '11px' }}
              >
                {isSavingMemory ? 'Saving...' : 'Remember Rule'}
              </button>
            </form>

            {/* Search Memories */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <input
                type="text"
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                placeholder="Filter learned memories..."
                style={{
                  width: '100%',
                  height: '24px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 8px',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Memories List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMemories.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px', padding: '24px 0' }}>
                  No learned memories recorded yet. The AI extracts rules automatically as you chat, or you can add them above.
                </div>
              ) : (
                filteredMemories.map((mem) => (
                  <div
                    key={mem.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: '700',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          background:
                            mem.category === 'preference'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : mem.category === 'instruction'
                              ? 'rgba(251, 191, 36, 0.15)'
                              : 'rgba(52, 211, 153, 0.15)',
                          color:
                            mem.category === 'preference'
                              ? '#38bdf8'
                              : mem.category === 'instruction'
                              ? '#fbbf24'
                              : '#34d399',
                        }}
                      >
                        {mem.category}
                      </span>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Delete Memory"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {mem.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
