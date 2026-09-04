import React, { useState } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Zap,
  Filter,
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

interface ExecutionTimelineProps {
  traces: TraceStep[];
  activeAgent?: string;
  activeModelName?: string;
  onApprove?: (stepId: string) => void;
  onCancelExecution?: () => void;
  isStreaming?: boolean;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  traces,
  activeAgent,
  activeModelName,
  onApprove,
  onCancelExecution,
  isStreaming,
}) => {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="var(--accent-primary)" />
          <span>Execution Observability</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="badge badge-blue">{activeAgent || 'Orchestrator'}</span>
          {isStreaming && onCancelExecution && (
            <button
              onClick={onCancelExecution}
              style={{
                height: '22px',
                padding: '0 6px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
              title="Cancel Current Execution (Stop All Processes)"
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
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search trace steps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '24px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 6px 0 20px',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <Search size={10} style={{ position: 'absolute', left: '6px', color: 'var(--text-muted)' }} />
            </div>

            <button className="icon-btn" onClick={expandAll} title="Expand All" style={{ padding: '2px' }}>
              <Maximize2 size={12} />
            </button>
            <button className="icon-btn" onClick={collapseAll} title="Collapse All" style={{ padding: '2px' }}>
              <Minimize2 size={12} />
            </button>
            <button className="icon-btn" onClick={exportTraceReport} title="Export Safe Trace JSON" style={{ padding: '2px' }}>
              <Download size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
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
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '10px',
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
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            <Activity size={24} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p>Awaiting task execution.</p>
            <p style={{ fontSize: '11.5px', marginTop: '4px' }}>
              Every agent step, tool call, model routing decision, and verification check will appear here.
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isRunning ? (
                      <Clock size={14} color="var(--accent-primary)" className="animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle size={14} color="var(--success)" />
                    ) : isWaiting ? (
                      <ShieldAlert size={14} color="var(--warning)" />
                    ) : isCancelled ? (
                      <AlertCircle size={14} color="var(--text-muted)" />
                    ) : (
                      <AlertCircle size={14} color="var(--danger)" />
                    )}
                    <span style={{ fontSize: '12.5px' }}>{trace.title}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {trace.durationMs !== undefined && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {trace.durationMs}ms
                      </span>
                    )}
                    {trace.details ? (
                      isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : null}
                  </div>
                </div>

                {isWaiting && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--warning)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#fde68a', marginBottom: '8px' }}>
                      Level 2-4 Action requires explicit user confirmation.
                    </div>
                    <button
                      className="btn-primary"
                      style={{ height: '26px', fontSize: '11.5px', padding: '0 10px' }}
                      onClick={() => onApprove?.(trace.id)}
                    >
                      Approve & Execute
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
