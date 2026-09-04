import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Play, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isStreaming: boolean;
  activeModelName?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  activeModelName,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '900px', margin: '0 auto' }}>
      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '40px 20px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: 'var(--accent-primary)',
              }}
            >
              <Bot size={28} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              OmniWorkspace Assistant
            </h2>
            <p style={{ maxWidth: '460px', fontSize: '13.5px' }}>
              Ask anything, request code modifications, trigger database analyses, or orchestrate tools.
              Your queries are routed dynamically to the best configured model.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: isUser ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: isUser ? '#fff' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>
                      {isUser ? 'You' : `Omni AI (${activeModelName || 'Auto'})`}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        className="icon-btn"
                        style={{ padding: '2px 6px', border: 'none', marginLeft: 'auto' }}
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      background: isUser ? 'var(--bg-secondary)' : 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      fontSize: '13.5px',
                      lineHeight: '1.6',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: '16px',
          display: 'flex',
          gap: '10px',
          background: 'var(--bg-secondary)',
          padding: '10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Message OmniWorkspace or type a task (e.g. 'Write a Python script to sort files', 'Analyze table employees')..."
          rows={2}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13.5px',
            resize: 'none',
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!input.trim() || isStreaming}
          style={{ alignSelf: 'flex-end', height: '36px' }}
        >
          {isStreaming ? (
            <span>Generating...</span>
          ) : (
            <>
              <span>Send</span>
              <Send size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
