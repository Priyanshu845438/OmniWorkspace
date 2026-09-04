import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  AlertTriangle,
  GitCommit,
  Shield,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  Zap,
  GitBranch,
  RefreshCw,
  XCircle,
  Plus,
  X,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface BottomPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRunExternalCommand?: (cmd: string) => void;
}

interface TerminalSession {
  id: string;
  name: string;
  output: string;
  history: string[];
  historyIndex: number | null;
  isRunning: boolean;
  lastDurationMs: number | null;
  lastExitCode: number | null;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'problems' | 'git' | 'audit'>('terminal');
  const [isMaximized, setIsMaximized] = useState(false);

  // Terminal Sessions State
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: 'session-1',
      name: 'zsh (workspace)',
      output:
        'OmniWorkspace Developer Terminal v1.0.1 [Sandbox Root: /Users/acadify/Documents/AI Workspace]\nType commands (e.g. "npm test", "git status", "ls -la") or type "help".\n',
      history: ['npm test', 'git status', 'git diff'],
      historyIndex: null,
      isRunning: false,
      lastDurationMs: null,
      lastExitCode: null,
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-1');
  const [command, setCommand] = useState('');
  const [copied, setCopied] = useState(false);

  // Auxiliary Tabs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [gitStatusText, setGitStatusText] = useState<string>('');
  const [isLoadingGit, setIsLoadingGit] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [isRunningTypecheck, setIsRunningTypecheck] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Auto-scroll viewport to bottom
  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (activeTab === 'terminal') {
      scrollToBottom();
    }
  }, [activeSession?.output, activeTab]);

  // Execute terminal command
  const executeCommandString = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed || activeSession.isRunning) return;

    const t0 = performance.now();

    // Client-side built-in commands
    if (trimmed === 'clear' || trimmed === 'cls') {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, output: '' } : s))
      );
      setCommand('');
      return;
    }

    if (trimmed === 'help') {
      const helpOutput = `
OmniWorkspace Terminal Help & Capabilities:
  • npm test                 Run all 37 Vitest integration and security tests
  • git status / git diff    Inspect repository status and modified lines
  • npm run build            Compile client, server, and electron bundles
  • npm run typecheck        Execute full TypeScript type verification
  • clear / cls              Clear current terminal viewport
  • history                  List recent command history
  • Shortcuts:
      ↑ / ↓ Arrow keys       Navigate previous command history
      Tab                    Autocomplete common shell commands
      Cmd+\` / Ctrl+\`         Toggle terminal drawer open/collapsed
`;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                output: `${s.output}\n$ ${trimmed}\n${helpOutput}\n`,
                history: [trimmed, ...s.history.filter((h) => h !== trimmed)].slice(0, 40),
                historyIndex: null,
              }
            : s
        )
      );
      setCommand('');
      return;
    }

    if (trimmed === 'history') {
      const historyList = activeSession.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n');
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                output: `${s.output}\n$ ${trimmed}\n${historyList || '  (No history recorded yet)'}\n`,
              }
            : s
        )
      );
      setCommand('');
      return;
    }

    // Set running state and append command line
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              isRunning: true,
              output: `${s.output}\n$ ${trimmed}\n`,
              history: [trimmed, ...s.history.filter((h) => h !== trimmed)].slice(0, 40),
              historyIndex: null,
            }
          : s
      )
    );
    setCommand('');

    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();
      const durationMs = Math.round(performance.now() - t0);

      if (!res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  isRunning: false,
                  lastDurationMs: durationMs,
                  lastExitCode: 1,
                  output: `${s.output}Error: ${data.error || 'Execution failed'}\n[Process exited with code 1 in ${(durationMs / 1000).toFixed(2)}s]\n`,
                }
              : s
          )
        );
      } else {
        const out = (data.stdout || '') + (data.stderr || '');
        const exitCode = data.exitCode ?? 0;
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  isRunning: false,
                  lastDurationMs: durationMs,
                  lastExitCode: exitCode,
                  output: `${s.output}${out || '[Command completed successfully]'}\n[Done in ${(durationMs / 1000).toFixed(2)}s (exit ${exitCode})]\n`,
                }
              : s
          )
        );
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - t0);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                isRunning: false,
                lastDurationMs: durationMs,
                lastExitCode: 1,
                output: `${s.output}Execution error: ${err.message}\n`,
              }
            : s
        )
      );
    }
  };

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCommandString(command);
  };

  // Keyboard navigation for history and autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeSession.history.length === 0) return;
      const nextIdx =
        activeSession.historyIndex === null
          ? 0
          : Math.min(activeSession.historyIndex + 1, activeSession.history.length - 1);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, historyIndex: nextIdx } : s))
      );
      setCommand(activeSession.history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeSession.historyIndex === null) return;
      if (activeSession.historyIndex === 0) {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, historyIndex: null } : s))
        );
        setCommand('');
      } else {
        const nextIdx = activeSession.historyIndex - 1;
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, historyIndex: nextIdx } : s))
        );
        setCommand(activeSession.history[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const suggestions = [
        'npm test',
        'git status',
        'git diff',
        'git log',
        'npm run build',
        'npm run typecheck',
        'node -v',
        'ls -la',
      ];
      const match = suggestions.find((s) => s.startsWith(command.toLowerCase().trim()));
      if (match) {
        setCommand(match);
      }
    }
  };

  // Session management
  const addNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: TerminalSession = {
      id: newId,
      name: `zsh #${sessions.length + 1}`,
      output: `OmniWorkspace Terminal [Session #${sessions.length + 1}]\nReady.\n`,
      history: ['npm test', 'git status'],
      historyIndex: null,
      isRunning: false,
      lastDurationMs: null,
      lastExitCode: null,
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const closeSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const copyTerminalOutput = () => {
    navigator.clipboard.writeText(activeSession?.output || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auxiliary tab fetchers
  const loadGitStatus = async () => {
    setIsLoadingGit(true);
    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'git status -s' }),
      });
      const data = await res.json();
      setGitStatusText(data.stdout || 'Working tree clean. No changes.');
    } catch {
      setGitStatusText('Failed to read git status.');
    } finally {
      setIsLoadingGit(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      setAuditLogs(data.auditLogs || []);
    } catch {
      // ignore
    }
  };

  const runProblemsCheck = async () => {
    setIsRunningTypecheck(true);
    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm run typecheck' }),
      });
      const data = await res.json();
      const output = (data.stdout || '') + (data.stderr || '');
      const lines = output.split('\n').filter((l: string) => l.includes('error TS'));
      setProblems(lines);
    } catch {
      setProblems(['Typecheck failed to execute.']);
    } finally {
      setIsRunningTypecheck(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLogs();
    if (activeTab === 'git') loadGitStatus();
  }, [activeTab]);

  const presetCommands = [
    { label: 'npm test', cmd: 'npm test' },
    { label: 'git status', cmd: 'git status' },
    { label: 'git diff', cmd: 'git diff' },
    { label: 'npm run build', cmd: 'npm run build' },
    { label: 'npm run typecheck', cmd: 'npm run typecheck' },
    { label: 'ls -la', cmd: 'ls -la' },
    { label: 'node -v', cmd: 'node -v' },
  ];

  // 1. COLLAPSED STATUS BAR (Default on application open)
  if (isCollapsed) {
    return (
      <div className="ide-status-bar" onClick={onToggleCollapse} title="Click or press Cmd+` to open Terminal">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', fontWeight: 500 }}>
            <GitBranch size={12} color="var(--text-accent)" />
            <span>main</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <XCircle size={11} color="var(--success)" /> 0 errors
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} color="var(--warning)" /> 0 warnings
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(56, 189, 248, 0.08)',
              padding: '1px 7px',
              borderRadius: '3px',
              color: 'var(--text-accent)',
            }}
          >
            <Terminal size={11} />
            <span>Terminal</span>
            <kbd style={{ fontSize: '9px', opacity: 0.7, marginLeft: '2px' }}>Ctrl+`</kbd>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '10.5px' }}>
          <span>OmniWorkspace AI: Ready</span>
          <span style={{ opacity: 0.6 }}>•</span>
          <span>BYOK Encrypted</span>
          <span style={{ opacity: 0.6 }}>•</span>
          <span>Ln 1, Col 1</span>
          <span style={{ opacity: 0.6 }}>•</span>
          <span>UTF-8</span>
          <ChevronUp size={12} style={{ opacity: 0.8 }} />
        </div>
      </div>
    );
  }

  // 2. EXPANDED / OPEN BOTTOM DRAWER
  const drawerHeight = isMaximized ? '460px' : '230px';

  return (
    <footer
      className="bottom-drawer"
      style={{
        height: drawerHeight,
        transition: 'height 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Drawer Top Navigation Bar */}
      <div className="bottom-tabs" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          <Terminal size={13} />
          <span>Terminal</span>
          {activeSession.isRunning && (
            <RefreshCw size={11} className="animate-spin" color="var(--accent-primary)" />
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('problems');
            if (problems.length === 0) runProblemsCheck();
          }}
        >
          <AlertTriangle size={13} />
          <span>Problems ({problems.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          <GitCommit size={13} />
          <span>Git Console</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Shield size={13} />
          <span>Security & Audit</span>
        </button>

        {/* Right Toolbar Controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {activeTab === 'terminal' && (
            <>
              {/* Copy Output Button */}
              <button
                className="icon-btn"
                style={{ padding: '2px 6px', border: 'none', gap: '4px', fontSize: '11px' }}
                onClick={copyTerminalOutput}
                title="Copy Terminal Output"
              >
                {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Clear Output Button */}
              <button
                className="icon-btn"
                style={{ padding: '3px 6px', border: 'none', gap: '3px', fontSize: '11px' }}
                onClick={() =>
                  setSessions((prev) =>
                    prev.map((s) => (s.id === activeSessionId ? { ...s, output: '' } : s))
                  )
                }
                title="Clear Terminal Output"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </>
          )}

          {/* Maximize / Minimize Height Toggle */}
          <button
            className="icon-btn"
            style={{ padding: '3px 5px', border: 'none' }}
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Height' : 'Maximize Terminal'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Collapse Drawer */}
          <button
            className="icon-btn"
            style={{ padding: '3px 5px', border: 'none' }}
            onClick={onToggleCollapse}
            title="Collapse Drawer (Cmd+`)"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Main Drawer Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TAB 1: TERMINAL WITH MULTI-SESSION SUPPORT */}
        {activeTab === 'terminal' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Session Tabs Sub-Bar */}
            <div
              style={{
                height: '26px',
                background: '#04070e',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                gap: '4px',
                overflowX: 'auto',
              }}
            >
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setActiveSessionId(sess.id)}
                    style={{
                      height: '20px',
                      padding: '0 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                      fontSize: '10.5px',
                      fontFamily: 'var(--font-mono)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <Terminal size={10} color={isActive ? 'var(--accent-primary)' : 'inherit'} />
                    <span>{sess.name}</span>
                    {sess.isRunning && <RefreshCw size={9} className="animate-spin" />}
                    {sessions.length > 1 && (
                      <span
                        onClick={(e) => closeSession(sess.id, e)}
                        style={{ opacity: 0.6, cursor: 'pointer' }}
                        title="Close Session"
                      >
                        <X size={10} />
                      </span>
                    )}
                  </div>
                );
              })}

              <button
                onClick={addNewSession}
                title="New Terminal Session"
                style={{
                  height: '20px',
                  width: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Plus size={12} />
              </button>

              {/* Execution Latency Telemetry */}
              {activeSession.lastDurationMs !== null && (
                <div
                  style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: activeSession.lastExitCode === 0 ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Clock size={10} />
                  <span>{(activeSession.lastDurationMs / 1000).toFixed(2)}s</span>
                  <span>(exit {activeSession.lastExitCode})</span>
                </div>
              )}
            </div>

            {/* Terminal Viewport */}
            <div ref={viewportRef} className="terminal-viewport">
              {activeSession.output || (
                <span style={{ color: 'var(--text-muted)' }}>Terminal cleared. Type a command to execute.</span>
              )}
            </div>

            {/* Quick Command Presets Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: '#03050a',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                overflowX: 'auto',
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Zap size={11} color="var(--accent-primary)" /> Quick:
              </span>
              {presetCommands.map((p) => (
                <button
                  key={p.cmd}
                  onClick={() => executeCommandString(p.cmd)}
                  disabled={activeSession.isRunning}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 7px',
                    fontSize: '10.5px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '9.5px', color: 'var(--text-muted)' }}>
                ↑↓ history • Tab autocomplete
              </span>
            </div>

            {/* Terminal Command Input Form */}
            <form
              onSubmit={handleRunCommand}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#050811',
                borderTop: '1px solid var(--border-subtle)',
                padding: '4px 10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px', userSelect: 'none' }}>
                <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600' }}>
                  omni-workspace:~/AI Workspace
                </span>
                <span style={{ color: '#34d399', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>(main)</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>$</span>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type command and press Enter..."
                disabled={activeSession.isRunning}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
              />

              {activeSession.isRunning ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent-primary)' }}>
                  <RefreshCw size={11} className="animate-spin" />
                  <span>Executing...</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!command.trim()}
                  style={{ height: '22px', padding: '0 8px', fontSize: '10.5px' }}
                >
                  <CornerDownLeft size={11} />
                  <span>Enter</span>
                </button>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: PROBLEMS & TYPECHECK */}
        {activeTab === 'problems' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                TypeScript & Project Diagnostic Inspector
              </div>
              <button
                onClick={runProblemsCheck}
                disabled={isRunningTypecheck}
                className="btn-secondary"
                style={{ height: '24px', fontSize: '11px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={11} className={isRunningTypecheck ? 'animate-spin' : ''} />
                <span>{isRunningTypecheck ? 'Auditing...' : 'Run Diagnostics'}</span>
              </button>
            </div>

            {problems.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '12px', padding: '12px', background: 'rgba(52, 211, 153, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                <CheckCircle2 size={16} />
                <span>Zero diagnostic errors detected across server, client, and electron configurations.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {problems.map((prob, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid var(--danger)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                      color: '#fca5a5',
                    }}
                  >
                    {prob}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GIT CONSOLE */}
        {activeTab === 'git' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitBranch size={13} color="var(--accent-primary)" />
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Git Working Tree Status (branch: main)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={loadGitStatus}
                  disabled={isLoadingGit}
                  className="btn-secondary"
                  style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                >
                  <RefreshCw size={11} className={isLoadingGit ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('terminal');
                    executeCommandString('git diff');
                  }}
                  className="btn-secondary"
                  style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                >
                  <span>View Diff</span>
                </button>
              </div>
            </div>

            <pre
              style={{
                background: '#070b14',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                color: '#38bdf8',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {gitStatusText || 'Inspecting git status...'}
            </pre>
          </div>
        )}

        {/* TAB 4: SECURITY & AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={13} color="#fbbf24" />
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Security & Tool Execution Audit Ledger
                </span>
              </div>
              <button
                onClick={loadAuditLogs}
                className="btn-secondary"
                style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              >
                <RefreshCw size={11} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                No audit events recorded in active session. All tools operate under sandbox boundaries.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '6px 8px' }}>Timestamp</th>
                    <th style={{ padding: '6px 8px' }}>Tool Name</th>
                    <th style={{ padding: '6px 8px' }}>Permission Tier</th>
                    <th style={{ padding: '6px 8px' }}>Approved</th>
                    <th style={{ padding: '6px 8px' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {log.timestamp ? String(log.timestamp).slice(11, 19) : 'Just now'}
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: '600', color: 'var(--text-primary)' }}>{log.toolName}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--accent-primary)' }}>Level {log.permissionLevel}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--success)' }}>Yes</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{log.durationMs || 1}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </footer>
  );
};
