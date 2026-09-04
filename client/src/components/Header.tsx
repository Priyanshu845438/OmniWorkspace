import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Sun,
  Moon,
  Command,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Github,
  Search,
} from 'lucide-react';

interface HeaderProps {
  onUniversalSubmit: (prompt: string) => void;
  activeModelName?: string;
  activePerspective?: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isStreaming: boolean;
  onOpenCommandPalette?: () => void;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  healthInfo?: any;
}

const perspectiveTitles: Record<string, string> = {
  home: 'Home Dashboard',
  chat: 'AI Co-Pilot Chat',
  code: 'Code Studio',
  architecture: 'Architecture Graph',
  research: 'Deep Web Research',
  data: 'Data Analytics & Stats',
  sql: 'SQL Database Studio',
  automation: 'Workflow Automation',
  media: 'Media Studio',
  documents: 'Document Analyzer',
  models: 'Model & Vault Manager',
  settings: 'System Preferences',
};

export const Header: React.FC<HeaderProps> = ({
  onUniversalSubmit,
  activeModelName,
  activePerspective,
  theme,
  onToggleTheme,
  isStreaming,
  onOpenCommandPalette,
  isRightPanelOpen = true,
  onToggleRightPanel,
  healthInfo,
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
      {/* Brand Identity & Context Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div className="brand-badge">
          <Layers size={16} />
          <span>OmniWorkspace</span>
        </div>
        <span className="badge" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
          v1.0.1
        </span>
        <span style={{ color: 'var(--border-strong)', fontSize: '11px' }}>/</span>
        <span style={{ fontSize: '11px', color: 'var(--link-color)', fontWeight: 500 }}>
          {perspectiveTitles[activePerspective || 'home'] || 'Studio'}
        </span>
      </div>

      {/* Universal AI Command Bar */}
      <form onSubmit={handleSubmit} className="universal-command-bar">
        <Search size={11} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="universal-input"
          style={{ paddingLeft: '28px' }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Search commands, symbols, files, or instruct AI co-pilot... (⌘K)"
        />
        <button
          type="submit"
          className="command-submit-btn"
          disabled={!prompt.trim() || isStreaming}
        >
          <Sparkles size={11} />
          <span>{isStreaming ? 'Running' : 'Execute'}</span>
        </button>
      </form>

      {/* Detailed Right Control Actions & Status */}
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
            <Command size={11} color="var(--link-color)" />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text-secondary)' }}>
              ⌘K
            </span>
          </button>
        )}

        {/* BYOK Security Vault Status */}
        <div
          title="BYOK Credential Vault: AES-256-GCM Encrypted at Rest (Zero Telemetry)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 7px',
            height: '22px',
            fontSize: '10.5px',
            color: '#ffffff',
          }}
        >
          <Lock size={10} color="var(--link-color)" />
          <span>Vault: AES-256</span>
        </div>

        {/* AI Model Routing */}
        <div
          className="model-pill"
          style={{ height: '22px', padding: '2px 7px', fontSize: '10.5px' }}
          title="Dynamic Multi-Provider AI Model Router"
        >
          <div className="status-dot" />
          <span>AI: {activeModelName || 'Auto Router'}</span>
        </div>

        {/* Right Observability Panel Toggle */}
        {onToggleRightPanel && (
          <button
            className="icon-btn"
            onClick={onToggleRightPanel}
            title={isRightPanelOpen ? 'Hide Observability Panel' : 'Show Observability Panel'}
            style={{
              width: '24px',
              height: '24px',
              background: isRightPanelOpen ? 'var(--bg-tertiary)' : 'transparent',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {isRightPanelOpen ? <PanelRightClose size={13} color="var(--link-color)" /> : <PanelRightOpen size={13} />}
          </button>
        )}

        {/* Theme Toggle */}
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title="Toggle Theme"
          style={{ width: '22px', height: '22px' }}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* GitHub Link */}
        <a
          href="https://github.com/Priyanshu845438/OmniWorkspace"
          target="_blank"
          rel="noreferrer"
          className="icon-btn"
          title="View GitHub Repository"
          style={{ width: '22px', height: '22px', color: 'var(--link-color)' }}
        >
          <Github size={13} />
        </a>
      </div>
    </header>
  );
};
