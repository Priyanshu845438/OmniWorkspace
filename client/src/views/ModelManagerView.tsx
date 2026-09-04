import React, { useState, useEffect } from 'react';
import { Cpu, Key, CheckCircle, XCircle, RefreshCw, Sliders, Shield, Zap, AlertTriangle } from 'lucide-react';

interface ModelDef {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  priority: number;
  enabled: boolean;
  isLocal?: boolean;
}

interface ProviderDef {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  isLocal: boolean;
  enabled: boolean;
}

export const ModelManagerView: React.FC = () => {
  const [providers, setProviders] = useState<ProviderDef[]>([]);
  const [models, setModels] = useState<ModelDef[]>([]);
  const [configuredKeys, setConfiguredKeys] = useState<string[]>([]);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; error?: string }>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keySaved, setKeySaved] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setProviders(data.providers || []);
      setModels(data.models || []);

      const vaultRes = await fetch('/api/vault/configured');
      const vaultData = await vaultRes.json();
      setConfiguredKeys(vaultData.configuredSecrets || []);
    } catch {
      // ignore
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const res = await fetch(`/api/providers/${providerId}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [providerId]: data }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: false, error: err.message },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveKey = async (providerSecretName: string) => {
    const val = keyInputs[providerSecretName];
    if (!val) return;

    try {
      await fetch('/api/vault/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: providerSecretName, secret: val }),
      });
      setKeySaved((prev) => ({ ...prev, [providerSecretName]: true }));
      setKeyInputs((prev) => ({ ...prev, [providerSecretName]: '' }));
      loadData();
      setTimeout(() => {
        setKeySaved((prev) => ({ ...prev, [providerSecretName]: false }));
      }, 2000);
    } catch {
      // ignore
    }
  };

  const handleToggleModel = async (modelId: string, currentEnabled: boolean) => {
    try {
      await fetch(`/api/models/${modelId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      setModels((prev) =>
        prev.map((m) => (m.id === modelId ? { ...m, enabled: !currentEnabled } : m))
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-blue">Model Manager & Registry</span>
          <span className="badge badge-green">BYOK Vault Encrypted</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>AI Providers & Capability Registry</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Connect your own API keys. Keys are stored locally with AES-256-GCM encryption and never transmitted to any third-party proxy.
        </p>
      </div>

      {/* Provider Connectivity Cards */}
      <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Configured Providers</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {providers.map((p) => {
          const secretKeyName =
            p.type === 'nvidia'
              ? 'NVIDIA_API_KEY'
              : p.type === 'openrouter'
              ? 'OPENROUTER_API_KEY'
              : p.type === 'openai'
              ? 'OPENAI_API_KEY'
              : 'CUSTOM_API_KEY';

          const hasKey = p.isLocal || configuredKeys.includes(secretKeyName);
          const testStatus = testResults[p.id];

          return (
            <div
              key={p.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>{p.name}</span>
                  {p.isLocal ? (
                    <span className="badge badge-green">Offline Local</span>
                  ) : hasKey ? (
                    <span className="badge badge-blue">Key Configured</span>
                  ) : (
                    <span className="badge badge-amber">Key Required</span>
                  )}
                </div>

                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '14px' }}>
                  {p.baseUrl}
                </div>

                {!p.isLocal && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="password"
                        placeholder={`Paste ${p.name} API Key...`}
                        value={keyInputs[secretKeyName] || ''}
                        onChange={(e) =>
                          setKeyInputs((prev) => ({ ...prev, [secretKeyName]: e.target.value }))
                        }
                        style={{
                          flex: 1,
                          height: '32px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0 10px',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                        }}
                      />
                      <button
                        className="btn-primary"
                        style={{ height: '32px', fontSize: '11.5px', padding: '0 10px' }}
                        onClick={() => handleSaveKey(secretKeyName)}
                      >
                        {keySaved[secretKeyName] ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                {testStatus && (
                  <div
                    style={{
                      fontSize: '11.5px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '10px',
                      background: testStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: testStatus.success ? 'var(--success)' : 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {testStatus.success ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    <span>
                      {testStatus.success
                        ? `Connected (${testStatus.latencyMs}ms)`
                        : testStatus.error || 'Connection failed'}
                    </span>
                  </div>
                )}

                <button
                  className="btn-secondary"
                  style={{ width: '100%', height: '30px', fontSize: '12px', justifyContent: 'center' }}
                  onClick={() => handleTestConnection(p.id)}
                  disabled={testingProvider === p.id}
                >
                  <RefreshCw size={12} className={testingProvider === p.id ? 'animate-spin' : ''} />
                  <span>{testingProvider === p.id ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Registry Matrix */}
      <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Cataloged Models</h2>

      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 16px' }}>Model</th>
              <th style={{ padding: '10px 16px' }}>Provider</th>
              <th style={{ padding: '10px 16px' }}>Capabilities</th>
              <th style={{ padding: '10px 16px' }}>Priority</th>
              <th style={{ padding: '10px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.id}</div>
                </td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{m.provider}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {m.capabilities.slice(0, 4).map((c) => (
                      <span key={c} className="badge badge-blue" style={{ fontSize: '10px' }}>
                        {c}
                      </span>
                    ))}
                    {m.capabilities.length > 4 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        +{m.capabilities.length - 4} more
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                  {m.priority}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    className={`badge ${m.enabled ? 'badge-green' : 'badge-red'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                    onClick={() => handleToggleModel(m.id, m.enabled)}
                  >
                    {m.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
