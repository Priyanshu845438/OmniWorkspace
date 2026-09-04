import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Lock,
  Moon,
  Sun,
  Cpu,
  Database,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Download,
  Sparkles,
  Search,
  RotateCcw,
  Save,
  CheckCircle2,
  HardDrive,
  Palette,
  Settings,
} from 'lucide-react';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeModelName?: string;
  onChangeModel?: (model: string) => void;
  onNavigatePerspective?: (perspective: string) => void;
}

export interface SystemSettingsState {
  // General & Appearance
  theme: 'dark' | 'light';
  accentColor: string;
  fontSize: 'compact' | 'standard' | 'comfortable';
  editorFontFamily: string;
  enableFontLigatures: boolean;
  enableSoundEffects: boolean;
  defaultPerspective: string;
  compactMode: boolean;

  // AI & Inference
  defaultModel: string;
  temperature: number;
  maxOutputTokens: number;
  streamingSpeedThrottled: boolean;
  systemPromptOverride: string;
  memoryHistoryDepth: number;
  autoFallbackToLocal: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';

  // Security & Permissions
  autoApproveLevel: number;
  confirmTerminal: boolean;
  confirmDestructive: boolean;
  promptInjectionDefense: 'strict' | 'balanced' | 'off';
  sandboxIsolationPath: string;

  // Workspace & Storage
  maxFileIndexCount: number;
  excludedDirectories: string;
  offlineMode: boolean;
  corsProxyUrl: string;
}

const DEFAULT_SETTINGS: SystemSettingsState = {
  theme: 'dark',
  accentColor: 'cyan',
  fontSize: 'standard',
  editorFontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  enableFontLigatures: true,
  enableSoundEffects: false,
  defaultPerspective: 'home',
  compactMode: false,

  defaultModel: 'Optimal Auto Router',
  temperature: 0.3,
  maxOutputTokens: 4096,
  streamingSpeedThrottled: false,
  systemPromptOverride: '',
  memoryHistoryDepth: 12,
  autoFallbackToLocal: true,
  reasoningEffort: 'medium',

  autoApproveLevel: 1,
  confirmTerminal: true,
  confirmDestructive: true,
  promptInjectionDefense: 'strict',
  sandboxIsolationPath: '',

  maxFileIndexCount: 10000,
  excludedDirectories: 'node_modules, .git, dist, dist-client, dist-server, coverage',
  offlineMode: false,
  corsProxyUrl: '',
};

interface AuditEvent {
  id: number;
  tool_name: string;
  permission_level: number;
  approved: number;
  success: number;
  error: string | null;
  timestamp: string;
}

const PERSONA_TEMPLATES = [
  {
    title: 'Staff Full-Stack Architect',
    prompt:
      'You are a Staff Full-Stack Software Architect and Principal Engineer. Provide modular, production-ready TypeScript/React and Node.js solutions with robust error handling, defense-in-depth security, and strict typing.',
  },
  {
    title: 'Security & Injection Auditor',
    prompt:
      'You are a Security Vulnerability Specialist. Thoroughly examine code for arbitrary command injections, SSRF, SQL vulnerabilities, buffer handling issues, and insecure deserialization. Flag all threat vectors explicitly.',
  },
  {
    title: 'High-Velocity Pragmatic Coder',
    prompt:
      'You are a high-velocity senior developer. Deliver ultra-concise, battle-tested solutions directly without unnecessary preamble. Prioritize immediate working implementations.',
  },
  {
    title: 'Data & SQL Specialist',
    prompt:
      'You are a Principal Database Engineer and Data Analyst. Produce optimized SQL queries with precise execution plan analysis, index recommendations, and statistical summaries.',
  },
];

const KEYBOARD_SHORTCUTS = [
  { key: '⌘ + K / Ctrl + K', description: 'Open Universal Command Palette', category: 'Global' },
  { key: '⌘ + ` / Ctrl + `', description: 'Toggle Integrated Terminal Drawer', category: 'Global' },
  { key: '⌘ + 1', description: 'Navigate to Home Dashboard', category: 'Navigation' },
  { key: '⌘ + 2', description: 'Navigate to AI Co-Pilot Chat', category: 'Navigation' },
  { key: '⌘ + 3', description: 'Navigate to Code & File Studio', category: 'Navigation' },
  { key: '⌘ + 4', description: 'Navigate to Deep Web Research', category: 'Navigation' },
  { key: '⌘ + 5', description: 'Navigate to Data Analytics Canvas', category: 'Navigation' },
  { key: '⌘ + 6', description: 'Navigate to SQL Studio & Schema Browser', category: 'Navigation' },
  { key: '⌘ + 7', description: 'Navigate to Document Analyzer', category: 'Navigation' },
  { key: '⌘ + 8', description: 'Navigate to Architecture & Topology', category: 'Navigation' },
  { key: '⌘ + 9', description: 'Navigate to Model & Vault Registry', category: 'Navigation' },
  { key: '⌘ + ,', description: 'Navigate to System Settings', category: 'Navigation' },
  { key: 'Enter', description: 'Send Prompt / Execute OmniBar Input', category: 'Execution' },
  { key: 'Shift + Enter', description: 'Insert Newline in Chat Prompt', category: 'Execution' },
  { key: 'Esc', description: 'Close Modals / Cancel Dropdowns', category: 'Global' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  activeModelName,
  onChangeModel,
  onNavigatePerspective,
}) => {
  const [activeTab, setActiveTab] = useState<
    'security' | 'ai' | 'appearance' | 'workspace' | 'shortcuts' | 'privacy'
  >('security');

  const [settings, setSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Vacuum / Maintenance state
  const [vacuuming, setVacuuming] = useState(false);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
    fetchAuditLogs();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          setSavedSettings(data.settings);
        }
      }
    } catch {
      // fallback to local defaults
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/settings/audit-log?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          setAuditLogs(data.events);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSave = async (customSettings?: SystemSettingsState) => {
    setSaving(true);
    const toSave = customSettings || settings;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          setSavedSettings(data.settings);
          showToast('System settings successfully saved to SQLite database.');

          // Apply model if changed
          if (onChangeModel && data.settings.defaultModel !== activeModelName) {
            onChangeModel(data.settings.defaultModel);
          }
        }
      }
    } catch (err: any) {
      showToast(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all system settings to factory defaults?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          setSavedSettings(data.settings);
          showToast('Settings restored to factory defaults.');
        }
      }
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVacuumDatabase = async () => {
    setVacuuming(true);
    try {
      const res = await fetch('/api/settings/vacuum', { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'SQLite database vacuumed and optimized.');
    } catch (err: any) {
      showToast(`Optimization failed: ${err.message}`);
    } finally {
      setVacuuming(false);
    }
  };

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(
      (a) =>
        a.tool_name.toLowerCase().includes(q) ||
        (a.error && a.error.toLowerCase().includes(q)) ||
        a.timestamp.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--accent-primary)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <CheckCircle2 size={16} color="var(--success)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Settings size={11} />
              Platform Governance
            </span>
            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={11} />
              Zero Telemetry
            </span>
            {loading ? (
              <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={11} className="animate-spin" />
                Loading...
              </span>
            ) : (
              <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HardDrive size={11} />
                SQLite Persistent
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            System Preferences & Engine Governance
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0, maxWidth: '650px' }}>
            Configure autonomous execution permissions, LLM inference hyperparameters, local sandbox boundaries, and developer cockpit ergonomics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDirty && (
            <button
              className="btn-primary"
              onClick={() => handleSave()}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Changes</span>
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={handleResetDefaults}
            title="Reset to factory settings"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button
            className="btn-secondary"
            onClick={async () => {
              try {
                const res = await fetch('/api/diagnostics/export');
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data.json, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `omni-diagnostics-${Date.now()}.json`;
                a.click();
                showToast('Diagnostic telemetry bundle exported.');
              } catch {
                showToast('Failed to export diagnostics');
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('security')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'security' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'security' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'security' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            fontSize: '13px',
            fontWeight: activeTab === 'security' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Shield size={16} color={activeTab === 'security' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Security & Permissions</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'ai' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'ai' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'ai' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            fontSize: '13px',
            fontWeight: activeTab === 'ai' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Cpu size={16} color={activeTab === 'ai' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>AI & Inference Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'appearance' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'appearance' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'appearance' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            fontSize: '13px',
            fontWeight: activeTab === 'appearance' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Palette size={16} color={activeTab === 'appearance' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Appearance & Cockpit</span>
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'workspace' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'workspace' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'workspace' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            fontSize: '13px',
            fontWeight: activeTab === 'workspace' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Database size={16} color={activeTab === 'workspace' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Workspace & Storage</span>
        </button>

        <button
          onClick={() => setActiveTab('shortcuts')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'shortcuts' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'shortcuts' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'shortcuts' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            fontSize: '13px',
            fontWeight: activeTab === 'shortcuts' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Terminal size={16} color={activeTab === 'shortcuts' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Keyboard Shortcuts</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          style={{
            padding: '10px 16px',
            background: activeTab === 'privacy' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'privacy' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderBottom: activeTab === 'privacy' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            fontSize: '13px',
            fontWeight: activeTab === 'privacy' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Lock size={16} color={activeTab === 'privacy' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Local Privacy Guarantee</span>
        </button>
      </div>

      {/* TAB CONTENT: Security & Permissions */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Shield size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Agent Tool Permission Policies</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '20px' }}>
              Control what tools the autonomous AI agents are permitted to execute without explicit user confirmation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Auto-Approve Level */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Auto-Approve Threshold
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Tools with a risk level up to this setting will execute autonomously without prompting you.
                  </div>
                </div>
                <select
                  value={settings.autoApproveLevel}
                  onChange={(e) => setSettings({ ...settings, autoApproveLevel: Number(e.target.value) })}
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 14px',
                    fontSize: '13px',
                    minWidth: '220px',
                  }}
                >
                  <option value={0}>Level 0 — Read-Only Tools (grep, view, ls)</option>
                  <option value={1}>Level 1 — File Modifications (edit, create)</option>
                  <option value={2}>Level 2 — Terminal Commands (shell execute)</option>
                  <option value={3}>Level 3 — Network & Web Research</option>
                  <option value={4}>Level 4 — Unrestricted Administrative</option>
                </select>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Confirm Terminal Commands */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Require Confirmation for Terminal Commands
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Always display command preview and wait for manual approval before running shell execution in terminal.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.confirmTerminal}
                  onChange={(e) => setSettings({ ...settings, confirmTerminal: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Prompt Injection Defense Sensitivity */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Prompt Injection Defense Sensitivity
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Heuristic analyzer screening incoming prompts and web search outputs for system prompt override vectors.
                  </div>
                </div>
                <select
                  value={settings.promptInjectionDefense}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      promptInjectionDefense: e.target.value as 'strict' | 'balanced' | 'off',
                    })
                  }
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 14px',
                    fontSize: '13px',
                    minWidth: '220px',
                  }}
                >
                  <option value="strict">Strict (Sanitize & Block Delimiters)</option>
                  <option value="balanced">Balanced (Screen High Risk Vectors)</option>
                  <option value="off">Off (Raw Pass-Through)</option>
                </select>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Destructive Ops Hard Lock */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Destructive Operations Protection
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Hard lock on dangerous commands: `rm -rf`, `git reset --hard`, deleting SQLite tables, or dropping data.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-green">Hard Locked (Enforced)</span>
                  <input type="checkbox" checked={true} disabled style={{ width: '18px', height: '18px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Security Audit Log */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} color="var(--success)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Security & Permission Audit Trail</h3>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Live tamper-evident log of all tool permission evaluations recorded in SQLite database.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 10px',
                  }}
                >
                  <Search size={13} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Filter audit events..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      width: '140px',
                    }}
                  />
                </div>

                <button
                  className="btn-secondary"
                  onClick={fetchAuditLogs}
                  disabled={loadingAudit}
                  style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={13} className={loadingAudit ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tool Name</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Level</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Permission</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No audit events match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>#{item.id}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <code>{item.tool_name}</code>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              background: item.permission_level > 2 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                              color: item.permission_level > 2 ? 'var(--danger)' : 'var(--accent-primary)',
                            }}
                          >
                            Lvl {item.permission_level}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {item.approved ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Approved</span>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Blocked</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {item.success ? (
                            <span style={{ color: 'var(--success)' }}>Success</span>
                          ) : (
                            <span style={{ color: 'var(--danger)' }} title={item.error || 'Failed'}>
                              Failed
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '11px' }}>
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI & Inference Engine */}
      {activeTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Cpu size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Model Inference Hyperparameters</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Default Model Router */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Primary Model / Router Strategy
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Select the foundational reasoning engine used by Universal Co-Pilot and subagents.
                  </div>
                </div>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 14px',
                    fontSize: '13px',
                    minWidth: '240px',
                  }}
                >
                  <option value="Optimal Auto Router">⚡ Optimal Auto Router (Dynamic)</option>
                  <option value="NVIDIA DeepSeek R1">🧠 NVIDIA DeepSeek R1 (128k)</option>
                  <option value="Claude 3.5 Sonnet">🎭 Claude 3.5 Sonnet (200k)</option>
                  <option value="Gemini 2.0 Flash">✨ Gemini 2.0 Flash (1M tokens)</option>
                  <option value="OpenAI GPT-4o">🌟 OpenAI GPT-4o (128k)</option>
                  <option value="Qwen 2.5 Coder (Local)">💻 Qwen 2.5 Coder (Local Offline)</option>
                  <option value="Llama 3.2 (Local)">🦙 Llama 3.2 (Local Offline)</option>
                </select>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Temperature Slider */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      Inference Temperature: {settings.temperature.toFixed(2)}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                      }}
                    >
                      {settings.temperature < 0.3 ? 'Deterministic / Precise' : settings.temperature < 0.7 ? 'Balanced' : 'Creative / Exploratory'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Lower values provide structured, deterministic code; higher values encourage innovative synthesis.
                  </div>
                </div>
                <div style={{ width: '220px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.temperature}
                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, width: '32px', textAlign: 'right' }}>
                    {settings.temperature.toFixed(2)}
                  </span>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Max Output Tokens Slider */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Max Completion Generation: {settings.maxOutputTokens.toLocaleString()} tokens
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Maximum length allowed for generated code files and multi-step reasoning responses.
                  </div>
                </div>
                <div style={{ width: '220px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range"
                    min="1024"
                    max="16384"
                    step="1024"
                    value={settings.maxOutputTokens}
                    onChange={(e) => setSettings({ ...settings, maxOutputTokens: parseInt(e.target.value) })}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, width: '48px', textAlign: 'right' }}>
                    {(settings.maxOutputTokens / 1024).toFixed(0)}k
                  </span>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Multi-turn History Depth */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Multi-Turn Conversation Memory Depth: {settings.memoryHistoryDepth} turns
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Number of recent conversation turns supplied to the model to preserve multi-step context.
                  </div>
                </div>
                <div style={{ width: '220px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    step="2"
                    value={settings.memoryHistoryDepth}
                    onChange={(e) => setSettings({ ...settings, memoryHistoryDepth: parseInt(e.target.value) })}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, width: '32px', textAlign: 'right' }}>
                    {settings.memoryHistoryDepth}
                  </span>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Auto Fallback to Local Model */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Auto-Fallback to Local Ollama on Cloud Timeout
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    If external API keys expire, hit rate limits, or lose connectivity, automatically re-route to local Ollama.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoFallbackToLocal}
                  onChange={(e) => setSettings({ ...settings, autoFallbackToLocal: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* System Persona / Custom Instruction Override */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Custom Persona & System Instructions</h3>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Inject permanent instructions or persona directives into the AI Co-Pilot across all agent perspectives.
                </div>
              </div>

              <button
                className="btn-secondary"
                onClick={() => setSettings({ ...settings, systemPromptOverride: '' })}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Clear
              </button>
            </div>

            {/* Persona Preset Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
              {PERSONA_TEMPLATES.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => setSettings({ ...settings, systemPromptOverride: p.prompt })}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.title}
                </button>
              ))}
            </div>

            <textarea
              value={settings.systemPromptOverride}
              onChange={(e) => setSettings({ ...settings, systemPromptOverride: e.target.value })}
              placeholder="e.g. Always write clean TypeScript code with detailed comments, use functional programming style, and include unit tests for all edge cases."
              rows={4}
              style={{
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: Appearance & Cockpit */}
      {activeTab === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Palette size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Visual Theme & Interface Ergonomics</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Theme Mode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Color Theme Mode
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Currently using {theme === 'dark' ? 'Slate Obsidian Dark' : 'Clean Studio Light'}.
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={onToggleTheme}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                >
                  {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#3b82f6" />}
                  <span>Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Font Size Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Interface Typography Scale
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Adjust text density across navigation sidebars, chat bubbles, and tool inspection cards.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['compact', 'standard', 'comfortable'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSettings({ ...settings, fontSize: s })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        background: settings.fontSize === s ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: settings.fontSize === s ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        fontWeight: settings.fontSize === s ? 600 : 400,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Default Perspective */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Startup View Perspective
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Choose the initial workspace canvas displayed when OmniWorkspace launches.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={settings.defaultPerspective}
                    onChange={(e) => setSettings({ ...settings, defaultPerspective: e.target.value })}
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 14px',
                      fontSize: '13px',
                      minWidth: '200px',
                    }}
                  >
                    <option value="home">Home Dashboard</option>
                    <option value="chat">Universal AI Co-Pilot</option>
                    <option value="code">Code & File Studio</option>
                    <option value="research">Deep Web Research</option>
                    <option value="data">Data Analytics Canvas</option>
                    <option value="sql">SQL Studio</option>
                    <option value="document">Document Analyzer</option>
                  </select>
                  {onNavigatePerspective && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onNavigatePerspective(settings.defaultPerspective)}
                      title="Open this perspective now"
                      style={{ padding: '7px 12px', fontSize: '12px' }}
                    >
                      Open Now
                    </button>
                  )}
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Code Editor Font & Ligatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Monospace Font Family
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Used in Code Studio, Terminal Drawer, and AI markdown code blocks.
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.editorFontFamily}
                  onChange={(e) => setSettings({ ...settings, editorFontFamily: e.target.value })}
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    width: '260px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Font Ligatures Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Enable Coding Font Ligatures (=&gt;, !=, ===)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Render advanced typographical glyphs in supported developer fonts.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableFontLigatures}
                  onChange={(e) => setSettings({ ...settings, enableFontLigatures: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Workspace & Storage */}
      {activeTab === 'workspace' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <HardDrive size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>SQLite Storage & Project Indexing</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Database Vacuum & Compact */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Database Defragmentation & Compaction
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Executes `VACUUM` on SQLite database, reorganizing pages and reclaiming freed disk storage.
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={handleVacuumDatabase}
                  disabled={vacuuming}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '150px', justifyContent: 'center' }}
                >
                  <RefreshCw size={14} className={vacuuming ? 'animate-spin' : ''} />
                  <span>{vacuuming ? 'Compacting...' : 'Vacuum Database'}</span>
                </button>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Max File Index Count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Max File Index Capacity: {settings.maxFileIndexCount.toLocaleString()} files
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Upper boundary for recursive project tree parsing and fast fuzzy symbol search.
                  </div>
                </div>
                <div style={{ width: '220px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range"
                    min="1000"
                    max="50000"
                    step="1000"
                    value={settings.maxFileIndexCount}
                    onChange={(e) => setSettings({ ...settings, maxFileIndexCount: parseInt(e.target.value) })}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, width: '48px', textAlign: 'right' }}>
                    {(settings.maxFileIndexCount / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Excluded Directories */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Ignored Directory Glob Patterns
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Comma-separated directories ignored during deep search, grep, and AI file indexing.
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.excludedDirectories}
                  onChange={(e) => setSettings({ ...settings, excludedDirectories: e.target.value })}
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    width: '320px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

              {/* Offline Air-Gapped Mode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Strict Offline Air-Gapped Mode
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Disables all external HTTP network requests; enforces 100% local execution via Ollama and local SQLite.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.offlineMode}
                  onChange={(e) => setSettings({ ...settings, offlineMode: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Keyboard Shortcuts */}
      {activeTab === 'shortcuts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Terminal size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>OmniWorkspace Hotkeys & Productivity Matrix</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '20px' }}>
              All keyboard shortcuts are globally active across every perspective for rapid keyboard-first navigation.
            </p>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: 'var(--bg-primary)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Action Description</th>
                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Shortcut</th>
                  </tr>
                </thead>
                <tbody>
                  {KEYBOARD_SHORTCUTS.map((sc, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {sc.description}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <span
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {sc.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <kbd
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: 'var(--text-accent)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}
                        >
                          {sc.key}
                        </kbd>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Local-First Privacy Guarantee */}
      {activeTab === 'privacy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Lock size={20} color="var(--success)" />
              <h2 style={{ fontSize: '17px', fontWeight: '600', margin: 0 }}>Local-First Privacy Manifesto</h2>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '18px' }}>
              OmniWorkspace is engineered from the ground up as a zero-telemetry, offline-first development platform.
              We hold a steadfast commitment to developer privacy and digital sovereignty:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '22px' }}>
              <div
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <HardDrive size={15} color="var(--success)" />
                  <strong style={{ fontSize: '13px' }}>100% Local Storage</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  All conversations, embeddings, SQLite tables, and file modifications reside on your hard drive. No remote cloud database syncing.
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Shield size={15} color="var(--accent-primary)" />
                  <strong style={{ fontSize: '13px' }}>Direct-to-Provider AI Calls</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  When using cloud models (NVIDIA, Anthropic, Google, OpenAI), prompts flow directly to provider endpoints without passing through intermediary telemetry servers.
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Lock size={15} color="var(--warning)" />
                  <strong style={{ fontSize: '13px' }}>AES-256 Secret Vault</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  API keys and credentials are encrypted using AES-256-GCM authenticated encryption and stored in your local credential vault.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span className="badge badge-green">Telemetry Collection: 0%</span>
              <span className="badge badge-green">User Tracking: None</span>
              <span className="badge badge-green">Analytics Beacons: None</span>
              <span className="badge badge-green">Air-Gap Capable: Yes (via Ollama)</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Save Bar (if dirty) */}
      {isDirty && (
        <div
          style={{
            position: 'sticky',
            bottom: '16px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="var(--warning)" />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
              You have unsaved system preferences.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={() => setSettings(savedSettings)}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Revert
            </button>
            <button
              className="btn-primary"
              onClick={() => handleSave()}
              disabled={saving}
              style={{ fontSize: '12px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
