import React, { useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Search,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  X,
  Cpu,
  Wrench,
  Layers,
  ArrowRightLeft,
  FileText,
  Radio,
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
  onClose?: () => void;
}

const getCategoryMeta = (type: string, title: string) => {
  if (title.toLowerCase().startsWith('fallback')) {
    return { label: 'FALLBACK', icon: ArrowRightLeft, color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.12)' };
  }
  switch (type) {
    case 'task_understanding':
      return { label: 'INTENT', icon: FileText, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
    case 'task_classification':
      return { label: 'AGENT', icon: Layers, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' };
    case 'capability_requirements':
      return { label: 'CAPS', icon: Cpu, color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)' };
    case 'context_collection':
      return { label: 'CONTEXT', icon: FileText, color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)' };
    case 'risk_analysis':
      return { label: 'RISK', icon: ShieldAlert, color: '#fb923c', bg: 'rgba(251, 146, 60, 0.12)' };
    case 'model_selection':
      return { label: 'ROUTER', icon: Cpu, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' };
    case 'plan':
      return { label: 'PLAN', icon: Layers, color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)' };
    case 'agent_execution':
      return { label: 'REASON', icon: Activity, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
    case 'tool_call':
    case 'tool_result':
      return { label: 'TOOL', icon: Wrench, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' };
    case 'verification':
      return { label: 'VERIFY', icon: CheckCircle, color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' };
    default:
      return { label: 'TRACE', icon: Activity, color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' };
  }
};

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  traces,
  activeAgent,
  activeModelName,
  onApprove,
  onCancel,
  onCancelExecution,
  isStreaming,
  onClose,
}) => {
  const handleCancel = onCancel || onCancelExecution;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Metrics
  const metrics = useMemo(() => {
    let completed = 0;
    let failed = 0;
    let running = 0;
    let totalDuration = 0;

    traces.forEach((t) => {
      if (t.status === 'completed') completed++;
      if (t.status === 'failed') failed++;
      if (t.status === 'running') running++;
      if (typeof t.durationMs === 'number') totalDuration += t.durationMs;
    });

    const modelsCount = traces.filter((t) => t.type === 'model_selection').length;
    const toolsCount = traces.filter((t) => t.type === 'tool_call' || t.type === 'tool_result').length;
    const verifyCount = traces.filter((t) => t.type === 'verification').length;

    return {
      total: traces.length,
      completed,
      failed,
      running,
      totalDuration,
      modelsCount,
      toolsCount,
      verifyCount,
    };
  }, [traces]);

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
      {/* Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={12} color="#38bdf8" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em' }}>
            OBSERVABILITY & TRACE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '3px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {activeAgent || 'ORCHESTRATOR'}
          </span>

          {isStreaming && handleCancel && (
            <button
              onClick={handleCancel}
              style={{
                height: '20px',
                padding: '0 6px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                fontSize: '9.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Abort Current Execution Stream"
            >
              STOP
            </button>
          )}

          {onClose && (
            <button
              className="icon-btn"
              onClick={onClose}
              title="Close Observability Panel"
              style={{ width: '22px', height: '22px', borderRadius: '4px' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Stream Status & Metrics Bar */}
      <div
        style={{
          padding: '6px 10px',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '10.5px',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {isStreaming ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
              <Radio size={11} className="animate-pulse" />
              <strong style={{ fontWeight: '600' }}>Live Stream</strong>
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
              <CheckCircle size={11} />
              <span>Idle</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{metrics.total}</strong> steps
          </span>
          {metrics.failed > 0 && (
            <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
              {metrics.failed} failed
            </span>
          )}
          {metrics.totalDuration > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {metrics.totalDuration}ms
            </span>
          )}
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      {traces.length > 0 && (
        <div
          style={{
            padding: '8px 10px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {/* Search + Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Filter trace steps..."
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
              <Search size={11} style={{ position: 'absolute', left: '6px', color: 'var(--text-muted)' }} />
            </div>

            <button
              className="icon-btn"
              onClick={expandAll}
              title="Expand All Steps"
              style={{ width: '22px', height: '22px', borderRadius: '4px' }}
            >
              <Maximize2 size={11} />
            </button>
            <button
              className="icon-btn"
              onClick={collapseAll}
              title="Collapse All Steps"
              style={{ width: '22px', height: '22px', borderRadius: '4px' }}
            >
              <Minimize2 size={11} />
            </button>
            <button
              className="icon-btn"
              onClick={exportTraceReport}
              title="Export Trace JSON"
              style={{ width: '22px', height: '22px', borderRadius: '4px' }}
            >
              <Download size={11} />
            </button>
          </div>

          {/* Filter Chips with Count Badges */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'all', label: 'All', count: metrics.total },
              { id: 'models', label: 'Models', count: metrics.modelsCount },
              { id: 'tools', label: 'Tools', count: metrics.toolsCount },
              { id: 'verification', label: 'Verify', count: metrics.verifyCount },
              { id: 'failed', label: 'Failed', count: metrics.failed },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                style={{
                  background: filterType === f.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: filterType === f.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: filterType === f.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: filterType === f.id ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{f.label}</span>
                <span
                  style={{
                    fontSize: '9px',
                    padding: '0 3px',
                    borderRadius: '2px',
                    background:
                      f.id === 'failed' && f.count > 0
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'var(--border-subtle)',
                    color:
                      f.id === 'failed' && f.count > 0 ? 'var(--danger)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Timeline Scrollable Body */}
      <div className="timeline-scroll">
        {traces.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            <Activity size={22} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
            <p style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Trace stream awaiting execution</p>
            <p style={{ fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
              Sub-step reasoning, dynamic model routing, tool outputs, and verification results stream here live.
            </p>
          </div>
        ) : (
          <div className="timeline-connector-wrap">
            {filteredTraces.map((trace, idx) => {
              const isExpanded = expanded[trace.id];
              const isRunning = trace.status === 'running';
              const isCompleted = trace.status === 'completed';
              const isFailed = trace.status === 'failed';
              const isWaiting = trace.status === 'waiting_approval';
              const isCancelled = trace.status === 'cancelled';
              const cat = getCategoryMeta(trace.type, trace.title);

              // Extract readable error text if step failed
              const errorText = isFailed
                ? (trace.details?.error as string) ||
                  (trace.details?.details as string) ||
                  (trace.details?.message as string) ||
                  'Step execution encountered an error.'
                : null;

              return (
                <div key={trace.id} className="timeline-step-row">
                  {/* Left Marker & Connecting Line */}
                  <div className="timeline-node-col">
                    <div
                      className={`timeline-marker ${isRunning ? 'running' : ''} ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''}`}
                    >
                      {isRunning ? (
                        <Clock size={10} color="#38bdf8" className="animate-spin" />
                      ) : isCompleted ? (
                        <Check size={9} color="var(--success)" strokeWidth={3} />
                      ) : isWaiting ? (
                        <ShieldAlert size={10} color="var(--warning)" />
                      ) : isFailed ? (
                        <AlertCircle size={10} color="var(--danger)" />
                      ) : (
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                      )}
                    </div>
                    {idx < filteredTraces.length - 1 && <div className="timeline-connector-line" />}
                  </div>

                  {/* Step Card */}
                  <div
                    className={`trace-card ${isRunning ? 'running' : ''} ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''}`}
                  >
                    <div
                      className="trace-header"
                      onClick={() => toggleExpand(trace.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '8.5px',
                            fontWeight: '700',
                            padding: '1px 4px',
                            borderRadius: '2px',
                            background: cat.bg,
                            color: cat.color,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          {cat.label}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: isFailed ? 'var(--danger)' : 'var(--text-primary)',
                          }}
                          title={trace.title}
                        >
                          {trace.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        {trace.durationMs !== undefined && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {trace.durationMs}ms
                          </span>
                        )}
                        {trace.details ? (
                          isExpanded ? <ChevronDown size={11} color="var(--text-muted)" /> : <ChevronRight size={11} color="var(--text-muted)" />
                        ) : null}
                      </div>
                    </div>

                    {/* Inline Error Callout Box (Instantly shows why reasoning or model failed) */}
                    {isFailed && errorText && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '6px 8px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10.5px',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                          lineHeight: '1.4',
                        }}
                      >
                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ wordBreak: 'break-word' }}>{errorText}</span>
                      </div>
                    )}

                    {/* Human Approval Required Action */}
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
                        <div style={{ fontSize: '10.5px', color: 'var(--warning)', marginBottom: '6px' }}>
                          Level 2-4 Action requires explicit confirmation.
                        </div>
                        <button
                          className="btn-primary"
                          style={{ height: '22px', fontSize: '10.5px', padding: '0 8px' }}
                          onClick={() => onApprove?.(trace.id)}
                        >
                          Approve Execution
                        </button>
                      </div>
                    )}

                    {/* Expanded Technical Details */}
                    {isExpanded && trace.details && (
                      <div style={{ marginTop: '7px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                          <button
                            onClick={() => copyTraceJson(trace)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '1px 4px',
                              borderRadius: '2px',
                            }}
                          >
                            {copiedId === trace.id ? <Check size={10} color="var(--success)" /> : <Copy size={10} />}
                            <span>{copiedId === trace.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="trace-details" style={{ margin: 0 }}>
                          {JSON.stringify(trace.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
