import React, { useState } from 'react';
import { Shield, Lock, Moon, Sun } from 'lucide-react';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ theme, onToggleTheme }) => {
  const [autoApproveLevel, setAutoApproveLevel] = useState<number>(1);
  const [confirmTerminal, setConfirmTerminal] = useState<boolean>(false);
  const [confirmDestructive] = useState<boolean>(true);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-blue">Platform Settings</span>
          <span className="badge badge-green">Zero Telemetry</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Workspace Preferences & Security Policies</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Configure execution policies, permission thresholds, theme preferences, and local-first privacy enforcement.
        </p>
      </div>

      {/* Privacy Guarantee Section */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Lock size={18} color="var(--success)" />
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Local-First Privacy Manifesto</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
          OmniWorkspace does not track, collect telemetry, or synchronize workspace files to any centralized cloud.
          All project files, SQLite databases, and git histories remain strictly on your local machine.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span className="badge badge-green">Telemetry: 0% (Disabled)</span>
          <span className="badge badge-green">Tracking: None</span>
          <span className="badge badge-green">Direct-to-Provider AI Calls</span>
        </div>
      </div>

      {/* Agent Permission Policies */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Shield size={18} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Agent Tool Permission Levels</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '13.5px' }}>Auto-Approve Threshold</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Tools requiring permission up to this level run without prompting.
              </div>
            </div>
            <select
              value={autoApproveLevel}
              onChange={(e) => setAutoApproveLevel(Number(e.target.value))}
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '12.5px',
              }}
            >
              <option value={0}>Level 0 (Read-Only)</option>
              <option value={1}>Level 1 (Modify Files)</option>
              <option value={2}>Level 2 (Terminal Execute)</option>
            </select>
          </div>

          <hr style={{ borderColor: 'var(--border-subtle)', borderStyle: 'solid' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '13.5px' }}>Require Approval for Terminal Commands</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Shows command preview and confirmation dialog before running shell commands.
              </div>
            </div>
            <input
              type="checkbox"
              checked={confirmTerminal}
              onChange={(e) => setConfirmTerminal(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '13.5px' }}>Always Require Approval for Destructive Operations</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Deleting files or executing destructive git clean operations (Level 4).
              </div>
            </div>
            <input
              type="checkbox"
              checked={confirmDestructive}
              disabled
              style={{ width: '18px', height: '18px' }}
            />
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Theme Appearance</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Currently using {theme === 'dark' ? 'Slate Dark' : 'Clean Light'} theme.
            </div>
          </div>
          <button className="btn-secondary" onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostics & Observability Export */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Safe Diagnostic Export</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Export system metrics, tool latencies, and provider logs. All secrets are cryptographically redacted.
            </div>
          </div>
          <button
            className="btn-primary"
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
              } catch {
                // ignore
              }
            }}
          >
            <span>Download Report (.json)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
