import React, { useState, useEffect } from 'react';
import { Network, Search, Layers, RefreshCw, AlertTriangle, FileCode, CheckCircle2, ChevronRight } from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  extension: string;
  category: string;
  size: number;
  symbols: Array<{ name: string; kind: string; line: number }>;
  imports: string[];
}

interface ArchitectureData {
  nodes: FileNode[];
  edges: Array<{ source: string; target: string }>;
  circularDependencies: string[][];
  summary: {
    totalFiles: number;
    totalSymbols: number;
    categories: Record<string, number>;
  };
}

interface ArchitectureViewProps {
  onOpenFile?: (filePath: string) => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ onOpenFile }) => {
  const [data, setData] = useState<ArchitectureData | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchArchitecture = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/architecture');
      const json = await res.json();
      setData(json);
      if (json.nodes?.length > 0 && !selectedNode) {
        setSelectedNode(json.nodes[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchitecture();
  }, []);

  const filteredNodes = (data?.nodes || []).filter((node) => {
    const matchesSearch =
      node.id.toLowerCase().includes(search.toLowerCase()) ||
      node.symbols.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1px', background: 'var(--border-subtle)' }}>
      {/* Visual Graph & Explorer Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Controls Bar */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={16} color="var(--accent-primary)" />
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Project Architecture Explorer</span>
            {data?.circularDependencies && data.circularDependencies.length > 0 ? (
              <span className="badge badge-red" style={{ fontSize: '10px' }}>
                <AlertTriangle size={11} style={{ marginRight: '3px' }} />
                {data.circularDependencies.length} Circular Cycles
              </span>
            ) : (
              <span className="badge badge-green" style={{ fontSize: '10px' }}>
                <CheckCircle2 size={11} style={{ marginRight: '3px' }} />
                Zero Cycles (Clean DAG)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files or symbols..."
                style={{
                  height: '30px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 10px 0 28px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  width: '200px',
                }}
              />
              <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
            </div>

            <button
              className="icon-btn"
              onClick={fetchArchitecture}
              title="Refresh Architecture Graph"
              style={{ height: '30px', width: '30px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '6px',
          }}
        >
          {['all', 'backend', 'frontend', 'electron', 'test', 'config'].map((cat) => (
            <button
              key={cat}
              className={`btn-secondary ${selectedCategory === cat ? 'active' : ''}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px', textTransform: 'capitalize' }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat} ({cat === 'all' ? data?.summary.totalFiles || 0 : data?.summary.categories[cat] || 0})
            </button>
          ))}
        </div>

        {/* Nodes Grid Map */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px',
            }}
          >
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const catColor =
                node.category === 'backend'
                  ? 'var(--accent-primary)'
                  : node.category === 'frontend'
                  ? 'var(--info)'
                  : node.category === 'electron'
                  ? 'var(--success)'
                  : 'var(--warning)';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${isSelected ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, transform 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: catColor, fontWeight: '700' }}>
                      {node.category}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {node.symbols.length} symbols
                    </span>
                  </div>

                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px', wordBreak: 'break-all' }}>
                    {node.name}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {node.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Node Details & Relationship Inspector Side Panel */}
      <div
        style={{
          width: '320px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            height: '38px',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
          }}
        >
          <span>MODULE INSPECTOR</span>
        </div>

        {selectedNode ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{selectedNode.name}</h2>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                {selectedNode.id}
              </div>
              {onOpenFile && (
                <button
                  className="btn-primary"
                  style={{ width: '100%', height: '28px', fontSize: '11.5px', justifyContent: 'center', marginTop: '10px' }}
                  onClick={() => onOpenFile(selectedNode.id)}
                >
                  <FileCode size={13} />
                  <span>Open in Code Studio</span>
                </button>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                EXPORTED SYMBOLS & TYPES ({selectedNode.symbols.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedNode.symbols.map((sym, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{sym.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{sym.kind}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                OUTGOING IMPORTS ({selectedNode.imports.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedNode.imports.map((imp, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {imp}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '12.5px', textAlign: 'center' }}>
            Select any file node to inspect symbols and dependency links.
          </div>
        )}
      </div>
    </div>
  );
};
