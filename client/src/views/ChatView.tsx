import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  Sparkles,
  Code2,
  Download,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string, agent?: string) => void;
  isStreaming: boolean;
  activeModelName?: string;
  onApplyCode?: (code: string) => void;
  onClearChat?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  activeModelName,
  onApplyCode,
  onClearChat,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('general');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Arena Comparison State
  const [isArenaMode, setIsArenaMode] = useState(false);
  const [modelA, setModelA] = useState('nvidia/nemotron-3-ultra-550b-a55b');
  const [modelB, setModelB] = useState('deepseek-ai/deepseek-v4-flash-0731');
  const [arenaResponseA, setArenaResponseA] = useState('');
  const [arenaResponseB, setArenaResponseB] = useState('');
  const [arenaTimingA, setArenaTimingA] = useState<number | null>(null);
  const [arenaTimingB, setArenaTimingB] = useState<number | null>(null);
  const [isArenaRunning, setIsArenaRunning] = useState(false);

  const quickPrompts = [
    { label: 'Security Audit', prompt: 'Audit this workspace for prompt injection and path traversal vulnerabilities.' },
    { label: 'Inspect Git Diff', prompt: 'Inspect our recent git status and summarize modified lines.' },
    { label: 'Top Employees Query', prompt: 'Write an optimized SQL query to rank employees by total sales amount.' },
    { label: 'Analyze Data Stats', prompt: 'Inspect the departmental dataset and calculate budget percentiles.' },
  ];

  const defaultModels = [
    { id: 'nvidia/nemotron-3-ultra-550b-a55b', name: 'NVIDIA Nemotron 3 Ultra 550B (Reasoning)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Google)' },
    { id: 'gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking' },
    { id: 'moonshotai/kimi-k3', name: 'Kimi K3 (Moonshot 200K)' },
    { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash (Thinking)' },
    { id: 'deepseek-ai/deepseek-v4-pro-0813', name: 'DeepSeek V4 Pro' },
    { id: 'meta/muse-glimmer-30b', name: 'Meta Muse Glimmer 30B' },
    { id: 'poolside/laguna-xs-2.1', name: 'Poolside Laguna XS 2.1' },
    { id: 'google/diffusiongemma-26b-a4b-it', name: 'DiffusionGemma 26B (Vision)' },
    { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning', name: 'NVIDIA Nemotron 3 Nano Omni' },
    { id: 'mistralai/mistral-nemotron', name: 'Mistral Nemotron' },
    { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'qwen2.5-coder:latest', name: 'Qwen 2.5 Coder (Local)' },
    { id: 'llama3.2:latest', name: 'Llama 3.2 (Local)' },
  ];

  const [availableModels, setAvailableModels] = useState(defaultModels);

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          const formatted = data.models.map((m: any) => ({
            id: m.id,
            name: `${m.name}${m.isLocal ? ' (Local)' : ''}`,
          }));
          setAvailableModels(formatted);
        }
      })
      .catch(() => {
        // Keep default models on error
      });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, arenaResponseA, arenaResponseB]);

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
  };

  const handleArenaSubmit = async (prompt: string) => {
    setIsArenaRunning(true);
    setArenaResponseA('');
    setArenaResponseB('');
    setArenaTimingA(null);
    setArenaTimingB(null);

    const start = Date.now();

    // Model A execution
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

    // Model B execution
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

    await Promise.allSettled([runA, runB]);
    setIsArenaRunning(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export Conversation to Markdown
  const exportToMarkdown = () => {
    let md = `# OmniWorkspace AI Conversation Log\nExported on: ${new Date().toLocaleString()}\n\n---\n\n`;
    messages.forEach((msg) => {
      const speaker = msg.role === 'user' ? '👤 User' : '🤖 AI Co-Pilot';
      md += `### ${speaker} (${msg.timestamp})\n\n${msg.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.md`;
    a.click();
  };

  // Export Conversation to JSON
  const exportToJson = () => {
    const dataStr = JSON.stringify({ exportDate: new Date().toISOString(), messages }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
  };

  // Helper to detect and render code blocks in messages
  const renderMessageContent = (content: string, msgId: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text_${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }

      const lang = match[1] || 'code';
      const code = match[2];
      const codeBlockId = `${msgId}_block_${match.index}`;

      parts.push(
        <div
          key={codeBlockId}
          style={{
            margin: '10px 0',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            border: '1px solid var(--border-strong)',
            background: '#04060d',
          }}
        >
          <div
            style={{
              padding: '6px 12px',
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
            <span>{lang}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="icon-btn"
                style={{ padding: '2px 6px', border: 'none', fontSize: '11px' }}
                onClick={() => copyToClipboard(code, codeBlockId)}
              >
                {copiedId === codeBlockId ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                <span style={{ marginLeft: '4px' }}>{copiedId === codeBlockId ? 'Copied' : 'Copy'}</span>
              </button>
              {onApplyCode && (
                <button
                  className="icon-btn"
                  style={{ padding: '2px 6px', border: 'none', fontSize: '11px', color: 'var(--accent-primary)' }}
                  onClick={() => onApplyCode(code)}
                >
                  <Code2 size={12} />
                  <span style={{ marginLeft: '4px' }}>Apply to Editor</span>
                </button>
              )}
            </div>
          </div>
          <pre
            style={{
              padding: '12px',
              fontSize: '12.5px',
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.5',
              overflowX: 'auto',
              color: '#e2e8f0',
              margin: 0,
            }}
          >
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text_${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* View Header with Mode Switcher & Export */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              className={`tab-btn ${!isArenaMode ? 'active' : ''}`}
              style={{ height: '26px', padding: '0 10px', fontSize: '12px' }}
              onClick={() => setIsArenaMode(false)}
            >
              <Bot size={13} />
              <span>Universal Chat</span>
            </button>
            <button
              className={`tab-btn ${isArenaMode ? 'active' : ''}`}
              style={{ height: '26px', padding: '0 10px', fontSize: '12px' }}
              onClick={() => setIsArenaMode(true)}
            >
              <Zap size={13} color="#f59e0b" />
              <span>Model Arena</span>
            </button>
          </div>

          {!isArenaMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Agent Role:</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 8px',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="general">Universal Orchestrator</option>
                <option value="coding">Coding Specialist</option>
                <option value="research">Web & Research Agent</option>
                <option value="data">Data & Statistics Agent</option>
                <option value="sql">SQL & Schema Agent</option>
                <option value="automation">DAG Automation Agent</option>
              </select>
              {activeModelName && (
                <span className="badge badge-purple" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
                  {activeModelName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Export & Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-secondary"
            style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
            onClick={exportToMarkdown}
            title="Export conversation to Markdown file"
          >
            <Download size={12} />
            <span>Export MD</span>
          </button>
          <button
            className="btn-secondary"
            style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
            onClick={exportToJson}
            title="Export conversation to JSON"
          >
            <Download size={12} />
            <span>JSON</span>
          </button>
          {onClearChat && (
            <button
              className="icon-btn"
              style={{ height: '28px', width: '28px' }}
              onClick={onClearChat}
              title="Clear Conversation History"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Arena Mode Model Selector Bar */}
      {isArenaMode && (
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-blue">MODEL A</span>
            <select
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
              }}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-purple">MODEL B</span>
            <select
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
              }}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Conversation or Arena Arena Split View */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!isArenaMode ? (
          // Universal Chat Message History
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '80%' : '92%',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={16} color="#fff" />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isUser ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                      border: `1px solid ${isUser ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      fontSize: '13.5px',
                      lineHeight: '1.6',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {renderMessageContent(msg.content, msg.id)}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      padding: '0 4px',
                    }}
                  >
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        className="icon-btn"
                        style={{ padding: '2px', border: 'none', fontSize: '11px' }}
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={16} color="var(--text-secondary)" />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Dual Model Arena Side-by-Side Comparison
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: '300px' }}>
            {/* Model A Response Box */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-blue">Model A</span>
                  <span style={{ fontWeight: '600' }}>{availableModels.find((m) => m.id === modelA)?.name}</span>
                </div>
                {arenaTimingA !== null && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} /> {arenaTimingA}ms
                  </span>
                )}
              </div>

              <div style={{ flex: 1, padding: '14px', fontSize: '13px', lineHeight: '1.6', overflowY: 'auto' }}>
                {isArenaRunning && !arenaResponseA ? (
                  <div style={{ color: 'var(--text-muted)' }}>Generating response from Model A...</div>
                ) : arenaResponseA ? (
                  renderMessageContent(arenaResponseA, 'arena_a')
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Enter a prompt below to evaluate Model A vs Model B.</div>
                )}
              </div>
            </div>

            {/* Model B Response Box */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-purple">Model B</span>
                  <span style={{ fontWeight: '600' }}>{availableModels.find((m) => m.id === modelB)?.name}</span>
                </div>
                {arenaTimingB !== null && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} /> {arenaTimingB}ms
                  </span>
                )}
              </div>

              <div style={{ flex: 1, padding: '14px', fontSize: '13px', lineHeight: '1.6', overflowY: 'auto' }}>
                {isArenaRunning && !arenaResponseB ? (
                  <div style={{ color: 'var(--text-muted)' }}>Generating response from Model B...</div>
                ) : arenaResponseB ? (
                  renderMessageContent(arenaResponseB, 'arena_b')
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Enter a prompt below to evaluate Model A vs Model B.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-accent)', fontSize: '12.5px' }}>
            <Sparkles size={14} className="animate-spin" />
            <span>AI Co-Pilot is executing ReAct reasoning and tool operations...</span>
          </div>
        )}
      </div>

      {/* Quick Suggestion Chips */}
      {!isArenaMode && (
        <div style={{ padding: '6px 16px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              className="btn-secondary"
              style={{ fontSize: '11px', height: '24px', padding: '0 8px', whiteSpace: 'nowrap' }}
              onClick={() => onSendMessage(qp.prompt)}
              disabled={isStreaming}
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '10px',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isArenaMode ? 'Enter prompt to compare Model A and Model B in the arena...' : 'Message OmniWorkspace AI Co-Pilot (e.g. "Debug this error", "Write tests", "Run research")...'}
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '13.5px',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '0 16px', height: 'auto' }}
          disabled={!input.trim() || isStreaming || isArenaRunning}
        >
          <Send size={15} />
          <span>{isArenaMode ? (isArenaRunning ? 'Evaluating...' : 'Run Arena') : 'Send'}</span>
        </button>
      </form>
    </div>
  );
};
