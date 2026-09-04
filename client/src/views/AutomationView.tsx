import React, { useState, useEffect } from 'react';
import { Cpu, Play, CheckCircle, Clock, ArrowRight, Plus, RefreshCw } from 'lucide-react';

export const AutomationView: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWf, setActiveWf] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  const loadWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      setWorkflows(data.workflows || []);
      if (data.workflows?.length > 0) {
        setActiveWf(data.workflows[0]);
      }
    } catch {
      // ignore
    }
  };

  const handleRunWorkflow = async () => {
    if (!activeWf) return;
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/workflows/${activeWf.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { triggeredBy: 'user_manual', isClean: true } }),
      });
      const data = await res.json();
      setRunResult(data);
    } catch (err: any) {
      // ignore
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-blue">Automation Studio</span>
            <span className="badge badge-green">DAG Engine</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Workflow Automation & Orchestration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
            Directed Acyclic Graph (DAG) visual workflow builder with step-level condition branches and audit logs.
          </p>
        </div>

        <button className="btn-primary" onClick={handleRunWorkflow} disabled={isRunning || !activeWf}>
          <Play size={14} />
          <span>{isRunning ? 'Running DAG...' : 'Execute Workflow'}</span>
        </button>
      </div>

      {/* Visual DAG Node Pipeline Canvas */}
      {activeWf && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600' }}>{activeWf.name}</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Workflow ID: {activeWf.id}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              overflowX: 'auto',
              padding: '16px 0',
            }}
          >
            {activeWf.nodes.map((node: any, idx: number) => {
              const typeColor =
                node.type === 'trigger'
                  ? 'var(--accent-primary)'
                  : node.type === 'condition'
                  ? 'var(--warning)'
                  : node.type === 'output'
                  ? 'var(--success)'
                  : 'var(--info)';

              return (
                <React.Fragment key={node.id}>
                  <div
                    style={{
                      minWidth: '180px',
                      background: 'var(--bg-primary)',
                      border: `1px solid var(--border-subtle)`,
                      borderTop: `3px solid ${typeColor}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: typeColor, fontWeight: '700' }}>
                      {node.type}
                    </span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{node.label}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {node.id}
                    </span>
                  </div>

                  {idx < activeWf.nodes.length - 1 && (
                    <ArrowRight size={20} color="var(--border-strong)" style={{ flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Execution Run Logs */}
      {runResult && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--success)" />
              <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Workflow Execution Succeeded</h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Total Duration: {runResult.totalDurationMs}ms
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {runResult.stepLogs.map((step: any, i: number) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-primary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12.5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontWeight: '600', marginRight: '8px' }}>{step.label}</span>
                  <span className="badge badge-green" style={{ fontSize: '10px' }}>{step.status}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  {step.durationMs}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
