import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Settings2,
  Trash2,
  Sparkles,
  Info,
  X,
  AlertCircle,
  Layers,
} from 'lucide-react';

interface NodeStatus {
  state: 'idle' | 'running' | 'completed' | 'failed';
  durationMs?: number;
  output?: any;
}

export const AutomationView: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWf, setActiveWf] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({});
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNodeType, setNewNodeType] = useState<'trigger' | 'action' | 'condition' | 'transform' | 'output'>('action');
  const [newNodeLabel, setNewNodeLabel] = useState('');

  const loadWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      setWorkflows(data.workflows || []);
      if (data.workflows?.length > 0 && !activeWf) {
        setActiveWf(data.workflows[0]);
      }
    } catch {
      // ignore
    }
  };

  const handleRunWorkflow = async () => {
    if (!activeWf || isRunning) return;
    setIsRunning(true);
    setRunResult(null);

    // Reset node statuses
    const initialStatuses: Record<string, NodeStatus> = {};
    activeWf.nodes.forEach((n: any) => {
      initialStatuses[n.id] = { state: 'idle' };
    });
    setNodeStatuses(initialStatuses);

    // Step-by-step visual animation through nodes
    const nodes = activeWf.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      setNodeStatuses((prev) => ({
        ...prev,
        [node.id]: { state: 'running' },
      }));

      // Simulate execution time per node
      const latency = Math.floor(Math.random() * 200) + 120;
      await new Promise((resolve) => setTimeout(resolve, latency));

      setNodeStatuses((prev) => ({
        ...prev,
        [node.id]: {
          state: 'completed',
          durationMs: latency,
          output: {
            step: node.label,
            type: node.type,
            status: 'OK',
            timestamp: new Date().toISOString(),
          },
        },
      }));
    }

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

  const handleAddNode = () => {
    if (!activeWf || !newNodeLabel.trim()) return;
    const newId = `node_${Date.now()}`;
    const newNode = {
      id: newId,
      type: newNodeType,
      label: newNodeLabel.trim(),
      config: { timeoutMs: 5000 },
    };

    const updatedNodes = [...activeWf.nodes, newNode];
    const updatedEdges = [...activeWf.edges];
    if (activeWf.nodes.length > 0) {
      const lastNode = activeWf.nodes[activeWf.nodes.length - 1];
      updatedEdges.push({ id: `edge_${Date.now()}`, source: lastNode.id, target: newId });
    }

    const updatedWf = { ...activeWf, nodes: updatedNodes, edges: updatedEdges };
    setActiveWf(updatedWf);

    fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedWf),
    }).then(() => loadWorkflows());

    setNewNodeLabel('');
    setShowAddNodeModal(false);
  };

  const handleDeleteNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeWf) return;
    const updatedNodes = activeWf.nodes.filter((n: any) => n.id !== nodeId);
    const updatedEdges = activeWf.edges.filter((e: any) => e.source !== nodeId && e.target !== nodeId);
    const updatedWf = { ...activeWf, nodes: updatedNodes, edges: updatedEdges };
    setActiveWf(updatedWf);
    if (selectedNode?.id === nodeId) setSelectedNode(null);

    fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedWf),
    }).then(() => loadWorkflows());
  };

  const handleExportWorkflow = () => {
    if (!activeWf) return;
    const blob = new Blob([JSON.stringify(activeWf, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWf.id}-workflow.json`;
    a.click();
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return '#38bdf8';
      case 'action':
        return '#a855f7';
      case 'condition':
        return '#f59e0b';
      case 'transform':
        return '#06b6d4';
      case 'output':
        return '#10b981';
      default:
        return 'var(--accent-primary)';
    }
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-blue">Automation Studio</span>
            <span className="badge badge-green">DAG Engine</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Workflow Automation & Orchestration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
            Directed Acyclic Graph (DAG) visual workflow builder with step execution simulation and output inspection.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={handleExportWorkflow} disabled={!activeWf}>
            <Download size={14} />
            <span>Export DAG</span>
          </button>
          <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={() => setShowAddNodeModal(true)} disabled={!activeWf}>
            <Plus size={14} />
            <span>Add Node</span>
          </button>
          <button className="btn-primary" onClick={handleRunWorkflow} disabled={isRunning || !activeWf}>
            <Play size={14} className={isRunning ? 'animate-spin' : ''} />
            <span>{isRunning ? 'Executing DAG...' : 'Execute Workflow'}</span>
          </button>
        </div>
      </div>

      {/* Add Node Modal */}
      {showAddNodeModal && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontWeight: '600', fontSize: '13px' }}>Configure New Workflow Step Node</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Node Type
              </label>
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as any)}
                style={{
                  width: '100%',
                  height: '32px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 8px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="trigger">Trigger (Webhook / Schedule)</option>
                <option value="action">Action (Execute Script / Tool)</option>
                <option value="condition">Condition (Branch Logic)</option>
                <option value="transform">Transform (Map / Aggregate)</option>
                <option value="output">Output (Export / Alert)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Node Label / Task Summary
              </label>
              <input
                type="text"
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                placeholder="e.g. 'Audit Modified Files' or 'Notify Slack Channel'..."
                style={{
                  width: '100%',
                  height: '32px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 10px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => setShowAddNodeModal(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleAddNode} disabled={!newNodeLabel.trim()}>
              Add to DAG
            </button>
          </div>
        </div>
      )}

      {/* Main DAG Canvas with Node Inspector Layout */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left: Interactive Visual DAG Pipeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{activeWf?.name || 'Pipeline DAG'}</span>
                <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                  {activeWf?.nodes?.length || 0} Nodes
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Click any step to inspect payload & logs
              </span>
            </div>

            {/* Visual Step Pipeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeWf?.nodes?.map((node: any, idx: number) => {
                const status = nodeStatuses[node.id] || { state: 'idle' };
                const isSelected = selectedNode?.id === node.id;

                let borderColor = 'var(--border-subtle)';
                let glow = 'none';
                if (status.state === 'running') {
                  borderColor = 'var(--accent-primary)';
                  glow = '0 0 12px rgba(56, 189, 248, 0.3)';
                } else if (status.state === 'completed') {
                  borderColor = 'var(--success)';
                }

                return (
                  <React.Fragment key={node.id}>
                    <div
                      onClick={() => setSelectedNode(node)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                        border: `1px solid ${borderColor}`,
                        boxShadow: glow,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: getNodeColor(node.type) + '22',
                            border: `1px solid ${getNodeColor(node.type)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: getNodeColor(node.type),
                          }}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                            {node.label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            Type: {node.type}
                          </div>
                        </div>
                      </div>

                      {/* Right Status Indicator & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {status.state === 'running' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontSize: '11.5px' }}>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>Running...</span>
                          </div>
                        )}

                        {status.state === 'completed' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '11.5px' }}>
                            <CheckCircle size={13} />
                            <span>{status.durationMs}ms</span>
                          </div>
                        )}

                        {status.state === 'idle' && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Idle</span>
                        )}

                        <button
                          className="icon-btn"
                          onClick={(e) => handleDeleteNode(node.id, e)}
                          title="Delete Node"
                          style={{ padding: '2px', border: 'none' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Edge arrow down */}
                    {idx < activeWf.nodes.length - 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                        <ArrowRight size={14} color="var(--border-strong)" style={{ transform: 'rotate(90deg)' }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Step Node Inspector Panel */}
        {selectedNode && (
          <div
            className="card"
            style={{
              width: '320px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              height: 'fit-content',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <div style={{ fontWeight: '600', fontSize: '13px' }}>Node Details</div>
              <button className="icon-btn" onClick={() => setSelectedNode(null)} style={{ padding: '2px' }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ID: </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedNode.id}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Label: </span>
                <span style={{ fontWeight: '600' }}>{selectedNode.label}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Type: </span>
                <span className="badge badge-blue" style={{ fontSize: '10.5px' }}>{selectedNode.type}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Step Execution Payload & Output
              </div>
              <pre
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  maxHeight: '160px',
                }}
              >
                {JSON.stringify(nodeStatuses[selectedNode.id]?.output || selectedNode.config || { status: 'idle' }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Execution Run Summary Log */}
      {runResult && (
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px', color: 'var(--success)' }}>
            <CheckCircle size={15} />
            <span>Workflow Execution Completed Successfully</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Execution ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{runResult.executionId}</span> • Duration: {runResult.durationMs}ms
          </div>
        </div>
      )}
    </div>
  );
};
