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
} from 'lucide-react';

export interface TraceStep {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  details?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  durationMs?: number;
}

interface ExecutionTimelineProps {
  traces: TraceStep[];
  activeAgent?: string;
  activeModelName?: string;
  onApprove?: (stepId: string) => void;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  traces,
  activeAgent,
  activeModelName,
  onApprove,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="right-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="var(--accent-primary)" />
          <span>Execution Timeline & Traces</span>
        </div>
        <span className="badge badge-blue">{activeAgent || 'Orchestrator'}</span>
      </div>

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
          traces.map((trace) => {
            const isExpanded = expanded[trace.id];
            const isRunning = trace.status === 'running';
            const isCompleted = trace.status === 'completed';
            const isFailed = trace.status === 'failed';
            const isWaiting = trace.status === 'waiting_approval';

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
                  <pre className="trace-details" style={{ marginTop: '8px' }}>
                    {JSON.stringify(trace.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
