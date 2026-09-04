import React, { useState } from 'react';
import {
  Layers,
  Search,
  Sparkles,
  Sun,
  Moon,
  Cpu,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface HeaderProps {
  onUniversalSubmit: (prompt: string) => void;
  activeModelName?: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isStreaming: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onUniversalSubmit,
  activeModelName,
  theme,
  onToggleTheme,
  isStreaming,
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
        <Layers size={20} />
        <span>OmniWorkspace</span>
      </div>

      {/* Universal AI Command Bar */}
      <form onSubmit={handleSubmit} className="universal-command-bar">
        <input
          type="text"
          className="universal-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What do you want to accomplish? (e.g. 'Fix bug in auth', 'Research AI models', 'Query sales table', 'Analyze CSV')..."
        />
        <button
          type="submit"
          className="command-submit-btn"
          disabled={!prompt.trim() || isStreaming}
        >
          <Sparkles size={13} />
          <span>{isStreaming ? 'Running...' : 'Execute'}</span>
        </button>
      </form>

      {/* Right Control Actions */}
      <div className="header-actions">
        <div className="model-pill">
          <div className="status-dot" />
          <span>AI: Auto ({activeModelName || 'Optimal'})</span>
        </div>

        <button className="icon-btn" onClick={onToggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
};
