import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  AlertTriangle,
  GitCommit,
  Shield,
  Play,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface BottomPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRunExternalCommand?: (cmd: string) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'problems' | 'git' | 'audit'>('terminal');
  const [command, setCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string>(
    'OmniWorkspace Sandbox Terminal initialized.\nType any command (e.g. npm test, git status, ls -la)...\n'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // Command History States
  const [history, setHistory] = useState<string[]>([
    'npm test',
    'git status',
    'git diff',
  ]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const executeCommandString = async (cmdToRun: string) => {
    if (!cmdToRun.trim() || isRunning) return;

    setTerminalOutput((prev) => `${prev}\n$ ${cmdToRun}\n`);
    setHistory((prev) => [cmdToRun, ...prev.filter((c) => c !== cmdToRun)].slice(0, 30));
    setHistoryIndex(null);
    setCommand('');
    setIsRunning(true);

    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdToRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTerminalOutput((prev) => `${prev}Error: ${data.error}\n`);
      } else {
        const out = (data.stdout || '') + (data.stderr || '');
        setTerminalOutput((prev) => `${prev}${out || '[Command completed with exit code 0]'}\n`);
      }
    } catch (err: any) {
      setTerminalOutput((prev) => `${prev}Failed to execute: ${err.message}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCommandString(command);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === null ? 0 : Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIdx);
      setCommand(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      if (historyIndex === 0) {
        setHistoryIndex(null);
        setCommand('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommand(history[nextIdx]);
      }
    }
  };

  const copyTerminalOutput = () => {
    navigator.clipboard.writeText(terminalOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const presetCommands = [
    { label: 'npm test', cmd: 'npm test' },
    { label: 'git status', cmd: 'git status' },
    { label: 'git diff', cmd: 'git diff' },
    { label: 'npm run build', cmd: 'npm run build' },
    { label: 'node -v', cmd: 'node -v' },
  ];

  if (isCollapsed) {
    return (
      <div
        style={{
          height: '30px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
        onClick={onToggleCollapse}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={13} />
          <span>Terminal • Problems • Git • Security Audit</span>
        </div>
        <ChevronUp size={14} />
      </div>
    );
  }

  return (
    <footer className="bottom-drawer">
      {/* Bottom Tabs Bar */}
      <div className="bottom-tabs">
        <button
          className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          <Terminal size={14} />
          <span>Terminal</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
          onClick={() => setActiveTab('problems')}
        >
          <AlertTriangle size={14} />
          <span>Problems (0)</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          <GitCommit size={14} />
          <span>Git Console</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Shield size={14} />
          <span>Security & Audit</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'terminal' && (
            <button
              className="icon-btn"
              style={{ padding: '2px 6px', border: 'none', gap: '4px', fontSize: '11px' }}
              onClick={copyTerminalOutput}
              title="Copy Output"
            >
              {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
          <button
            className="icon-btn"
            style={{ padding: '2px', border: 'none' }}
            onClick={() => setTerminalOutput('')}
            title="Clear Output"
          >
            <Trash2 size={13} />
          </button>
          <button
            className="icon-btn"
            style={{ padding: '2px', border: 'none' }}
            onClick={onToggleCollapse}
            title="Collapse Drawer"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'terminal' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="terminal-viewport">{terminalOutput}</div>

            {/* Quick Command Preset Pills Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
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
                  disabled={isRunning}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 6px',
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
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                ↑↓ arrow keys for history
              </span>
            </div>

            {/* Terminal Input Form */}
            <form
              onSubmit={handleRunCommand}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#04060c',
                borderTop: '1px solid var(--border-subtle)',
                padding: '4px 8px',
              }}
            >
              <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', marginRight: '8px' }}>
                $
              </span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type command and press Enter (or use ↑↓ for history)..."
                disabled={isRunning}
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
              <button
                type="submit"
                className="btn-primary"
                disabled={isRunning || !command.trim()}
                style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              >
                Run
              </button>
            </form>
          </div>
        )}

        {activeTab === 'problems' && (
          <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            No errors or warnings detected in current project workspace.
          </div>
        )}

        {activeTab === 'git' && (
          <div style={{ padding: '16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Git Working Tree: Staged changes ready for commit. Run <code>git commit</code> or use the Code view Git bar.
          </div>
        )}

        {activeTab === 'audit' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '6px 8px' }}>Timestamp</th>
                  <th style={{ padding: '6px 8px' }}>Tool</th>
                  <th style={{ padding: '6px 8px' }}>Permission Level</th>
                  <th style={{ padding: '6px 8px' }}>Approved</th>
                  <th style={{ padding: '6px 8px' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {log.timestamp.slice(11, 19)}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: '600' }}>{log.toolName}</td>
                    <td style={{ padding: '6px 8px' }}>Level {log.permissionLevel}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--success)' }}>Yes</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{log.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </footer>
  );
};
