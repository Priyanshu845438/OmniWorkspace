import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  GitBranch,
  Terminal,
  Square,
  Home,
  MessageSquare,
  Code2,
  Globe2,
  BarChart3,
  Database,
  FileText,
  Key,
  Settings,
  Check,
  ShieldCheck,
  ArrowRight,
  Zap,
  RotateCcw,
} from 'lucide-react';

export interface ModelUsageTelemetry {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  contextWindow: number;
  tokensRemaining: number;
  percentRemaining: number;
  modelName: string;
}

interface HeaderProps {
  onUniversalSubmit: (prompt: string) => void;
  activeModelName?: string;
  onChangeModel?: (modelName: string) => void;
  activePerspective?: string;
  onSelectPerspective?: (perspective: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isStreaming: boolean;
  onCancelExecution?: () => void;
  onOpenCommandPalette?: () => void;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
  healthInfo?: any;
  usageTelemetry?: ModelUsageTelemetry;
  onResetUsage?: () => void;
}

interface PerspectiveOption {
  id: string;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  shortcut: string;
  color: string;
}

const perspectives: PerspectiveOption[] = [
  { id: 'home', title: 'Home Dashboard', shortDesc: 'Workspace Cockpit & Overview', icon: Home, shortcut: '⌘1', color: 'var(--link-color)' },
  { id: 'chat', title: 'AI Co-Pilot Chat', shortDesc: 'Multi-Thread & Long-Term Memory', icon: MessageSquare, shortcut: '⌘2', color: '#38bdf8' },
  { id: 'code', title: 'Code Studio', shortDesc: 'Monaco Editor & Surgical AST', icon: Code2, shortcut: '⌘3', color: '#60a5fa' },
  { id: 'architecture', title: 'Architecture Graph', shortDesc: '7-Layer Interactive System Graph', icon: Layers, shortcut: '⌘4', color: '#818cf8' },
  { id: 'research', title: 'Deep Web Research', shortDesc: 'Multi-Source Synthesis & Citations', icon: Globe2, shortcut: '⌘5', color: '#34d399' },
  { id: 'data', title: 'Data Analytics & Stats', shortDesc: 'Dataset Parsing & Dynamic Charts', icon: BarChart3, shortcut: '⌘6', color: '#f472b6' },
  { id: 'sql', title: 'SQL Database Studio', shortDesc: 'Visual Schema & EXPLAIN Planner', icon: Database, shortcut: '⌘7', color: '#fbbf24' },
  { id: 'documents', title: 'Document Analyzer', shortDesc: 'Technical Specs & Policy Reader', icon: FileText, shortcut: '⌘8', color: '#a78bfa' },
  { id: 'models', title: 'Model & Vault Registry', shortDesc: '19 Models & AES-256 BYOK Vault', icon: Key, shortcut: '⌘9', color: '#e879f9' },
  { id: 'settings', title: 'System Preferences', shortDesc: 'Global Environment Settings', icon: Settings, shortcut: '⌘,', color: '#94a3b8' },
];

const availableModelsList = [
  { id: 'Optimal Auto', name: 'Optimal Auto Router', provider: 'Intelligent Router', tag: 'Fastest & Smartest' },
  { id: 'DeepSeek R1 (Thinking)', name: 'NVIDIA DeepSeek R1', provider: 'NVIDIA NIM', tag: 'Reasoning' },
  { id: 'Claude 3.5 Sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic / BYOK', tag: 'Code & Arch' },
  { id: 'Gemini 2.0 Flash', name: 'Gemini 2.0 Flash', provider: 'Google AI', tag: 'Multimodal' },
  { id: 'OpenAI GPT-4o', name: 'OpenAI GPT-4o', provider: 'OpenAI', tag: 'General' },
  { id: 'Qwen 2.5 Coder (Local)', name: 'Qwen 2.5 Coder', provider: 'Ollama Offline', tag: 'Private Local' },
];

export const Header: React.FC<HeaderProps> = ({
  onUniversalSubmit,
  activeModelName = 'Optimal Auto',
  onChangeModel,
  activePerspective = 'home',
  onSelectPerspective,
  theme,
  onToggleTheme,
  isStreaming,
  onCancelExecution,
  onOpenCommandPalette,
  isRightPanelOpen = true,
  onToggleRightPanel,
  isTerminalOpen = false,
  onToggleTerminal,
  healthInfo: _healthInfo,
  usageTelemetry,
  onResetUsage,
}) => {
  const [prompt, setPrompt] = useState('');
  const [omniMode, setOmniMode] = useState<'ai' | 'cmd' | 'file'>('ai');
  const [isPerspectiveMenuOpen, setIsPerspectiveMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isGitPopoverOpen, setIsGitPopoverOpen] = useState(false);
  const [isVaultPopoverOpen, setIsVaultPopoverOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isUsagePopoverOpen, setIsUsagePopoverOpen] = useState(false);

  // Live telemetry state
  const [gitStatus, setGitStatus] = useState<{ branch: string; isClean: boolean; statusSummary: string } | null>(null);
  const [configuredVaultKeys, setConfiguredVaultKeys] = useState<string[]>(['NVIDIA_API_KEY']);
  const [modelUsageData, setModelUsageData] = useState<any>(null);

  // Refs for click outside
  const perspectiveDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const gitDropdownRef = useRef<HTMLDivElement>(null);
  const vaultDropdownRef = useRef<HTMLDivElement>(null);
  const usageDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLFormElement>(null);

  const fetchUsage = () => {
    fetch('/api/models/usage')
      .then((res) => res.json())
      .then((data) => {
        if (data) setModelUsageData(data);
      })
      .catch(() => {});
  };

  // Load telemetry on mount
  useEffect(() => {
    fetch('/api/git/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.branch) setGitStatus(data);
      })
      .catch(() => {});

    fetch('/api/vault/configured')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.configuredSecrets) setConfiguredVaultKeys(data.configuredSecrets);
      })
      .catch(() => {});

    fetchUsage();
    const interval = setInterval(fetchUsage, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResetUsage = async () => {
    try {
      await fetch('/api/models/usage/reset', { method: 'POST' });
      fetchUsage();
      if (onResetUsage) onResetUsage();
    } catch {}
  };

  // Handle click outside to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (perspectiveDropdownRef.current && !perspectiveDropdownRef.current.contains(e.target as Node)) {
        setIsPerspectiveMenuOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
      if (gitDropdownRef.current && !gitDropdownRef.current.contains(e.target as Node)) {
        setIsGitPopoverOpen(false);
      }
      if (vaultDropdownRef.current && !vaultDropdownRef.current.contains(e.target as Node)) {
        setIsVaultPopoverOpen(false);
      }
      if (usageDropdownRef.current && !usageDropdownRef.current.contains(e.target as Node)) {
        setIsUsagePopoverOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input mode switches
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrompt(val);

    if (val.startsWith('>')) {
      setOmniMode('cmd');
    } else if (val.startsWith('#')) {
      setOmniMode('file');
    } else if (val.startsWith('@')) {
      setOmniMode('ai');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    if (isStreaming && onCancelExecution) {
      onCancelExecution();
      return;
    }

    setIsSuggestionsOpen(false);

    if (omniMode === 'cmd') {
      // Execute directly in terminal
      const cleanCmd = prompt.startsWith('>') ? prompt.slice(1).trim() : prompt.trim();
      if (onToggleTerminal && !isTerminalOpen) onToggleTerminal();
      fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cleanCmd }),
      });
      setPrompt('');
    } else if (omniMode === 'file') {
      // Open file search
      if (onOpenCommandPalette) onOpenCommandPalette();
      setPrompt('');
    } else {
      // AI prompt
      const cleanPrompt = prompt.startsWith('@') ? prompt.slice(1).trim() : prompt.trim();
      onUniversalSubmit(cleanPrompt);
      setPrompt('');
    }
  };

  const currentPerspective = perspectives.find((p) => p.id === activePerspective) || perspectives[0];
  const CurrentIcon = currentPerspective.icon;

  return (
    <header className="top-header" style={{ position: 'relative', zIndex: 100 }}>
      {/* LEFT: BRAND IDENTITY & INTERACTIVE PERSPECTIVE SWITCHER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Brand Badge */}
        <div
          className="brand-badge"
          onClick={() => onSelectPerspective && onSelectPerspective('home')}
          style={{ cursor: 'pointer' }}
          title="Return to Home Dashboard"
        >
          <Layers size={16} color="var(--link-color)" />
          <span style={{ fontWeight: '700', letterSpacing: '-0.02em' }}>OmniWorkspace</span>
        </div>

        <span className="badge" style={{ fontSize: '9px', padding: '1px 5px', fontWeight: '700' }}>
          v1.0.1
        </span>

        <span style={{ color: 'var(--border-strong)', fontSize: '11px' }}>/</span>

        {/* Interactive Perspective Switcher Dropdown */}
        <div style={{ position: 'relative' }} ref={perspectiveDropdownRef}>
          <button
            onClick={() => setIsPerspectiveMenuOpen(!isPerspectiveMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isPerspectiveMenuOpen ? 'var(--bg-tertiary)' : 'transparent',
              border: `1px solid ${isPerspectiveMenuOpen ? 'var(--border-strong)' : 'transparent'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '3px 8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '11.5px',
              fontWeight: '600',
              transition: 'all 0.12s ease',
            }}
            title="Switch Workspace Perspective"
          >
            <CurrentIcon size={14} color={currentPerspective.color} />
            <span>{currentPerspective.title}</span>
            <ChevronDown size={11} color="var(--text-muted)" style={{ transform: isPerspectiveMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {/* Perspective Dropdown Menu */}
          {isPerspectiveMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                width: '280px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 200,
              }}
            >
              <div style={{ padding: '6px 8px 4px 8px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                WORKSPACES & PERSPECTIVES
              </div>

              {perspectives.map((p) => {
                const Icon = p.icon;
                const isActive = p.id === activePerspective;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (onSelectPerspective) onSelectPerspective(p.id);
                      setIsPerspectiveMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: p.color,
                        }}
                      >
                        <Icon size={13} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.shortDesc}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <kbd style={{ fontSize: '9.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '1px 4px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                        {p.shortcut}
                      </kbd>
                      {isActive && <Check size={12} color="var(--accent-primary)" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CENTER: MULTI-MODE UNIVERSAL OMNIBAR */}
      <form onSubmit={handleSubmit} className="universal-command-bar" ref={searchContainerRef} style={{ position: 'relative' }}>
        {/* Mode Toggle Button */}
        <button
          type="button"
          onClick={() => {
            const nextMode = omniMode === 'ai' ? 'cmd' : omniMode === 'cmd' ? 'file' : 'ai';
            setOmniMode(nextMode);
          }}
          style={{
            position: 'absolute',
            left: '5px',
            height: '20px',
            padding: '0 5px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '9.5px',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            color: omniMode === 'cmd' ? '#f59e0b' : omniMode === 'file' ? '#38bdf8' : '#10b981',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            zIndex: 2,
          }}
          title="Click to cycle input mode: @AI, >Terminal, #File"
        >
          <span>{omniMode === 'cmd' ? '>CMD' : omniMode === 'file' ? '#FILE' : '@AI'}</span>
        </button>

        <input
          type="text"
          className="universal-input"
          style={{ paddingLeft: '56px', paddingRight: isStreaming ? '78px' : '72px' }}
          value={prompt}
          onChange={handleInputChange}
          onFocus={() => setIsSuggestionsOpen(true)}
          placeholder={
            omniMode === 'cmd'
              ? 'Run shell command in terminal (e.g. npm test, git status)...'
              : omniMode === 'file'
              ? 'Jump to file or symbol in workspace (⌘K)...'
              : 'Ask AI Co-Pilot, inspect code, or run workflow... (⌘K)'
          }
        />

        {/* Dynamic Action Button */}
        <button
          type="submit"
          className="command-submit-btn"
          style={{
            background: isStreaming ? 'rgba(239, 68, 68, 0.15)' : undefined,
            borderColor: isStreaming ? '#ef4444' : undefined,
            color: isStreaming ? '#ef4444' : undefined,
            right: '4px',
          }}
          title={isStreaming ? 'Cancel Execution' : 'Execute Command (Enter)'}
        >
          {isStreaming ? (
            <>
              <Square size={10} fill="#ef4444" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Sparkles size={11} color="var(--link-color)" />
              <span>Execute</span>
            </>
          )}
        </button>

        {/* Fast Action Suggestions Dropdown */}
        {isSuggestionsOpen && !prompt && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
              padding: '6px',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
              <span>SUGGESTED FAST ACTIONS</span>
              <span>Modes: @AI • &gt;CMD • #FILE</span>
            </div>

            {[
              { label: '🛡️ Audit workspace security & injection boundaries', cmd: 'Audit workspace security and verify injection filters' },
              { label: '🏛️ Inspect system architecture & component hierarchy', cmd: 'Inspect the system architecture graph and report circular dependencies' },
              { label: '📊 Query top performing sales representatives', cmd: 'Query SQLite database tables and find top performing employees by sales revenue' },
              { label: '🐙 Inspect recent git diff & prepare commit message', cmd: 'Inspect git status and diff, and summarize all changes' },
              { label: '⚡ Run all Vitest unit tests', cmd: '>npm test' },
            ].map((sug, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setPrompt(sug.cmd);
                  if (sug.cmd.startsWith('>')) {
                    setOmniMode('cmd');
                  }
                  setIsSuggestionsOpen(false);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{sug.label}</span>
                <ArrowRight size={11} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        )}
      </form>

      {/* RIGHT: SYSTEM STATUS, MODEL SELECTOR & QUICK ACTIONS */}
      <div className="header-actions">
        {/* 1. Git Status Pill with Popover */}
        <div style={{ position: 'relative' }} ref={gitDropdownRef}>
          <button
            onClick={() => setIsGitPopoverOpen(!isGitPopoverOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: isGitPopoverOpen ? 'var(--bg-tertiary)' : 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 7px',
              height: '22px',
              fontSize: '10.5px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
            title="Git Repository Status"
          >
            <GitBranch size={11} color="#a855f7" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
              {gitStatus?.branch || 'main'}
            </span>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: gitStatus?.isClean ? '#10b981' : '#f59e0b',
                display: 'inline-block',
              }}
            />
          </button>

          {isGitPopoverOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '260px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                padding: '12px',
                zIndex: 200,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  <GitBranch size={13} color="#a855f7" />
                  <span>Branch: {gitStatus?.branch || 'main'}</span>
                </div>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    padding: '1px 5px',
                    borderRadius: '2px',
                    background: gitStatus?.isClean ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: gitStatus?.isClean ? '#10b981' : '#f59e0b',
                  }}
                >
                  {gitStatus?.isClean ? 'Clean' : 'Modified'}
                </span>
              </div>

              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '10px', wordBreak: 'break-all' }}>
                {gitStatus?.statusSummary || 'Working tree clean'}
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  setIsGitPopoverOpen(false);
                  onUniversalSubmit('Inspect git status and diff, and summarize all changes');
                }}
                style={{ width: '100%', fontSize: '11px', padding: '5px 8px', justifyContent: 'center' }}
              >
                <span>Review Diff with AI</span>
                <ArrowRight size={11} />
              </button>
            </div>
          )}
        </div>

        {/* 2. BYOK Security Vault Status Pill */}
        <div style={{ position: 'relative' }} ref={vaultDropdownRef}>
          <button
            onClick={() => setIsVaultPopoverOpen(!isVaultPopoverOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: isVaultPopoverOpen ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 7px',
              height: '22px',
              fontSize: '10.5px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
            title="BYOK Credential Vault (AES-256 GCM)"
          >
            <Lock size={10} color="var(--link-color)" />
            <span>Vault: AES-256</span>
          </button>

          {isVaultPopoverOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '260px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                padding: '12px',
                zIndex: 200,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ShieldCheck size={14} color="#10b981" />
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  AES-256-GCM Secure Vault
                </span>
              </div>

              <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 10px 0' }}>
                Zero telemetry BYOK encryption. Secrets are decrypted strictly in-memory during agent execution.
              </p>

              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                ACTIVE KEYS: {configuredVaultKeys.length}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                {configuredVaultKeys.map((k) => (
                  <span key={k} style={{ fontSize: '9.5px', padding: '1px 5px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '2px', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {k}
                  </span>
                ))}
              </div>

              <button
                className="btn-secondary"
                onClick={() => {
                  setIsVaultPopoverOpen(false);
                  if (onSelectPerspective) onSelectPerspective('models');
                }}
                style={{ width: '100%', fontSize: '11px', padding: '5px 8px', justifyContent: 'center' }}
              >
                <span>Manage Vault Keys →</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Interactive AI Model Router Dropdown */}
        <div style={{ position: 'relative' }} ref={modelDropdownRef}>
          <button
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="model-pill"
            style={{
              height: '22px',
              padding: '2px 7px',
              fontSize: '10.5px',
              cursor: 'pointer',
              background: isModelMenuOpen ? 'var(--bg-hover)' : 'var(--bg-tertiary)',
            }}
            title="Switch Active AI Model"
          >
            <div className="status-dot" />
            <span>AI: {activeModelName}</span>
            <ChevronDown size={10} color="var(--text-muted)" style={{ transform: isModelMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {isModelMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '270px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                padding: '6px',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ padding: '6px 8px 4px 8px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                SELECT ACTIVE MODEL
              </div>

              {availableModelsList.map((m) => {
                const isSelected = activeModelName.toLowerCase().includes(m.name.toLowerCase()) || activeModelName === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (onChangeModel) onChangeModel(m.id);
                      setIsModelMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: isSelected ? '700' : '500', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{m.provider}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '2px', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                        {m.tag}
                      </span>
                      {isSelected && <Check size={12} color="var(--accent-primary)" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Live Model Usage & Token Remaining Indicator Pill */}
        <div style={{ position: 'relative' }} ref={usageDropdownRef}>
          <button
            onClick={() => setIsUsagePopoverOpen(!isUsagePopoverOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isUsagePopoverOpen ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
              border: `1px solid ${isUsagePopoverOpen ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '2px 8px',
              height: '22px',
              fontSize: '10.5px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Model Token Usage & Context Window (Click for detailed breakdown)"
          >
            <Zap size={11} color={(usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 50 ? '#10b981' : (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 20 ? '#f59e0b' : '#ef4444'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {(() => {
                const rem = usageTelemetry?.tokensRemaining ?? modelUsageData?.activeModel?.tokensRemaining ?? 128000;
                if (rem >= 1000000) return (rem / 1000000).toFixed(1) + 'M';
                if (rem >= 1000) return (rem / 1000).toFixed(1) + 'k';
                return String(rem);
              })()} left
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: '700',
                padding: '1px 5px',
                borderRadius: '2px',
                background:
                  (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 50
                    ? 'rgba(16, 185, 129, 0.15)'
                    : (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 20
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                color:
                  (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 50
                    ? '#10b981'
                    : (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 20
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            >
              {usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100}%
            </span>
          </button>

          {/* Usage Inspector Popover */}
          {isUsagePopoverOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '320px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 14px 36px rgba(0,0,0,0.5)',
                padding: '14px',
                zIndex: 200,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} color="#38bdf8" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Context & Token Usage
                  </span>
                </div>
                <button
                  onClick={handleResetUsage}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  title="Reset session token statistics"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Active Model Name */}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Active Model:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {activeModelName || modelUsageData?.activeModel?.name || 'Optimal Auto Router'}
                </strong>
              </div>

              {/* Visual Context Capacity Meter */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Context Available:</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '700',
                      color:
                        (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 50
                          ? '#10b981'
                          : (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 20
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  >
                    {(usageTelemetry?.tokensRemaining ?? modelUsageData?.activeModel?.tokensRemaining ?? 128000).toLocaleString()} tokens left ({usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'var(--bg-primary)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, 100 - (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100)))}%`,
                      height: '100%',
                      background:
                        (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 50
                          ? 'linear-gradient(90deg, #10b981, #38bdf8)'
                          : (usageTelemetry?.percentRemaining ?? modelUsageData?.activeModel?.percentRemaining ?? 100) > 20
                          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : '#ef4444',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>Used: {(usageTelemetry?.totalTokens ?? modelUsageData?.activeModel?.lastTotalTokens ?? 0).toLocaleString()} tokens</span>
                  <span>Max Window: {(usageTelemetry?.contextWindow ?? modelUsageData?.activeModel?.contextWindow ?? 128000).toLocaleString()} tokens</span>
                </div>
              </div>

              {/* Session Statistics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PROMPT (INPUT)</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {(usageTelemetry?.promptTokens ?? modelUsageData?.session?.totalPromptTokens ?? 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>COMPLETION (OUTPUT)</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {(usageTelemetry?.completionTokens ?? modelUsageData?.session?.totalCompletionTokens ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Models Comparison */}
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.04em' }}>
                FRONTIER CONTEXT WINDOW LIMITS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                {[
                  { name: 'Gemini 2.0 Flash', window: '1,048,576 tokens (1M)' },
                  { name: 'Claude 3.5 Sonnet', window: '200,000 tokens' },
                  { name: 'NVIDIA DeepSeek R1', window: '128,000 tokens' },
                  { name: 'OpenAI GPT-4o', window: '128,000 tokens' },
                  { name: 'Qwen 2.5 Coder (Local)', window: '32,768 tokens' },
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      padding: '3px 6px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '2px',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                    <span style={{ color: 'var(--link-color)', fontFamily: 'var(--font-mono)' }}>{m.window}</span>
                  </div>
                ))}
              </div>

              {/* Footer status tip */}
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '8px',
                  lineHeight: '1.4',
                }}
              >
                Auto-compaction activates when conversation exceeds 80% capacity to preserve memory seamlessly.
              </div>
            </div>
          )}
        </div>

        {/* 5. Integrated Terminal Toggle Button */}
        {onToggleTerminal && (
          <button
            className="icon-btn"
            onClick={onToggleTerminal}
            title={isTerminalOpen ? 'Hide Terminal (Ctrl+`)' : 'Open Terminal (Ctrl+`)'}
            style={{
              width: '24px',
              height: '24px',
              background: isTerminalOpen ? 'var(--bg-tertiary)' : 'transparent',
              border: `1px solid ${isTerminalOpen ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              color: isTerminalOpen ? 'var(--link-color)' : 'var(--text-muted)',
            }}
          >
            <Terminal size={13} />
          </button>
        )}

        {/* 5. Right Observability Panel Toggle */}
        {onToggleRightPanel && (
          <button
            className="icon-btn"
            onClick={onToggleRightPanel}
            title={isRightPanelOpen ? 'Hide Observability Panel' : 'Show Observability Panel'}
            style={{
              width: '24px',
              height: '24px',
              background: isRightPanelOpen ? 'var(--bg-tertiary)' : 'transparent',
              border: `1px solid ${isRightPanelOpen ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              color: isRightPanelOpen ? 'var(--link-color)' : 'var(--text-muted)',
            }}
          >
            {isRightPanelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          </button>
        )}

        {/* 6. Command Palette Trigger Button */}
        {onOpenCommandPalette && (
          <button
            className="icon-btn"
            onClick={onOpenCommandPalette}
            title="Universal Command Palette (⌘K)"
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

        {/* 7. Theme Toggle Button */}
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title="Toggle Theme"
          style={{ width: '22px', height: '22px' }}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* 8. GitHub Repository Link */}
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
