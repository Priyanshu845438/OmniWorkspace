import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Sun,
  Moon,
  Command,
} from 'lucide-react';

interface HeaderProps {
  onUniversalSubmit: (prompt: string) => void;
  activeModelName?: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isStreaming: boolean;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onUniversalSubmit,
  activeModelName,
  theme,
  onToggleTheme,
  isStreaming,
  onOpenCommandPalette,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;
    onUniversalSubmit(prompt.trim());
    setPrompt('');
  };

  return (
    <header className="top-header">
      {/* Brand Identity */}
      <div className="brand-badge">
        <Layers size={15} />
        <span>OmniWorkspace</span>
      </div>

      {/* Universal AI Command Bar */}
      <form onSubmit={handleSubmit} className="universal-command-bar">
        <input
          type="text"
          className="universal-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Search commands or instruct AI co-pilot... (e.g. 'Refactor auth', 'Explain graph', 'Query SQL')"
        />
        <button
          type="submit"
          className="command-submit-btn"
          disabled={!prompt.trim() || isStreaming}
        >
          <Sparkles size={11} />
          <span>{isStreaming ? 'Running' : 'Run'}</span>
        </button>
      </form>

      {/* Right Control Actions */}
      <div className="header-actions">
        {onOpenCommandPalette && (
          <button
            className="icon-btn"
            onClick={onOpenCommandPalette}
            title="Command Palette (Cmd+K / Ctrl+K)"
            style={{
              padding: '0 6px',
              height: '22px',
              width: 'auto',
              gap: '4px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Command size={11} color="var(--text-accent)" />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text-secondary)' }}>
              ⌘K
            </span>
          </button>
        )}

        <div className="model-pill">
          <div className="status-dot" />
          <span>AI: Auto ({activeModelName || 'Optimal'})</span>
        </div>

        <button className="icon-btn" onClick={onToggleTheme} title="Toggle Theme" style={{ width: '22px', height: '22px' }}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </header>
  );
};
