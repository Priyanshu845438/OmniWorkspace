import React, { useState } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Search,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface TraceStep {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  details?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval' | 'cancelled';
  durationMs?: number;
}

export interface ExecutionTimelineProps {
  traces: TraceStep[];
  activeAgent?: string;
  activeModelName?: string;
  onApprove?: (stepId: string) => void;
  onCancel?: () => Promise<void> | void;
  onCancelExecution?: () => Promise<void> | void;
  isStreaming?: boolean;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  traces,
  activeAgent,
  activeModelName,
  onApprove,
  onCancel,
  onCancelExecution,
  isStreaming,
}) => {
  const handleCancel = onCancel || onCancelExecution;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    traces.forEach((t) => {
      allExp[t.id] = true;
    });
    setExpanded(allExp);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const copyTraceJson = (trace: TraceStep) => {
    navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
    setCopiedId(trace.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportTraceReport = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      agent: activeAgent,
      model: activeModelName,
      totalSteps: traces.length,
      traces,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-trace-${Date.now()}.json`;
    a.click();
  };

  const filteredTraces = traces.filter((t) => {
    if (filterType !== 'all') {
      if (filterType === 'tools' && t.type !== 'tool_call' && t.type !== 'tool_result') return false;
      if (filterType === 'models' && t.type !== 'model_selection') return false;
      if (filterType === 'verification' && t.type !== 'verification') return false;
      if (filterType === 'failed' && t.status !== 'failed') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDetails = t.details ? JSON.stringify(t.details).toLowerCase().includes(q) : false;
      return matchTitle || matchDetails;
    }
    return true;
  });

  return (
    <aside className="right-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={13} color="var(--text-accent)" />
          <span>Observability & Trace</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span className="badge badge-blue">{activeAgent || 'Orchestrator'}</span>
          {isStreaming && handleCancel && (
            <button
              onClick={handleCancel}
              style={{
                height: '20px',
                padding: '0 5px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                fontSize: '9.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              title="Cancel Current Execution"
            >
              STOP
            </button>
          )}
        </div>
      </div>

      {/* Observability Toolbar */}
      {traces.length > 0 && (
        <div
          style={{
            padding: '6px 10px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Filter trace steps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '22px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 6px 0 18px',
                  fontSize: '10.5px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <Search size={9} style={{ position: 'absolute', left: '5px', color: 'var(--text-muted)' }} />
            </div>

            <button className="icon-btn" onClick={expandAll} title="Expand All" style={{ padding: '2px', width: '20px', height: '20px' }}>
              <Maximize2 size={11} />
            </button>
            <button className="icon-btn" onClick={collapseAll} title="Collapse All" style={{ padding: '2px', width: '20px', height: '20px' }}>
              <Minimize2 size={11} />
            </button>
            <button className="icon-btn" onClick={exportTraceReport} title="Export Trace JSON" style={{ padding: '2px', width: '20px', height: '20px' }}>
              <Download size={11} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '3px', overflowX: 'auto' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'models', label: 'Models' },
              { id: 'tools', label: 'Tools' },
              { id: 'verification', label: 'Verify' },
              { id: 'failed', label: 'Failed' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                style={{
                  background: filterType === f.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: filterType === f.id ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '1px 5px',
                  fontSize: '9.5px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="timeline-scroll">
        {traces.length === 0 ? (
          <div
            style={{
              padding: '30px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            <Activity size={20} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
            <p>Awaiting task execution</p>
            <p style={{ fontSize: '11px', marginTop: '3px' }}>
              Agent steps, tool calls, and model decisions stream here live.
            </p>
          </div>
        ) : (
          filteredTraces.map((trace) => {
            const isExpanded = expanded[trace.id];
            const isRunning = trace.status === 'running';
            const isCompleted = trace.status === 'completed';
            const isFailed = trace.status === 'failed';
            const isWaiting = trace.status === 'waiting_approval';
            const isCancelled = trace.status === 'cancelled';

            return (
              <div
                key={trace.id}
                className={`trace-card ${isRunning ? 'running' : ''} ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''}`}
              >
                <div
                  className="trace-header"
                  onClick={() => toggleExpand(trace.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isRunning ? (
                      <Clock size={12} color="var(--text-accent)" className="animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle size={12} color="var(--success)" />
                    ) : isWaiting ? (
                      <ShieldAlert size={12} color="var(--warning)" />
                    ) : isCancelled ? (
                      <AlertCircle size={12} color="var(--text-muted)" />
                    ) : (
                      <AlertCircle size={12} color="var(--danger)" />
                    )}
                    <span style={{ fontSize: '11.5px' }}>{trace.title}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {trace.durationMs !== undefined && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {trace.durationMs}ms
                      </span>
                    )}
                    {trace.details ? (
                      isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                    ) : null}
                  </div>
                </div>

                {isWaiting && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '8px',
                      background: 'rgba(204, 167, 0, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(204, 167, 0, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--warning)', marginBottom: '6px' }}>
                      Level 2-4 Action requires explicit confirmation.
                    </div>
                    <button
                      className="btn-primary"
                      style={{ height: '22px', fontSize: '11px', padding: '0 8px' }}
                      onClick={() => onApprove?.(trace.id)}
                    >
                      Approve
                    </button>
                  </div>
                )}

                {isExpanded && trace.details && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                      <button
                        onClick={() => copyTraceJson(trace)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '10.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {copiedId === trace.id ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                        <span>{copiedId === trace.id ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="trace-details" style={{ margin: 0 }}>
                      {JSON.stringify(trace.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
