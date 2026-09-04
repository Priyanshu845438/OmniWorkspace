import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Network,
  Search,
  RefreshCw,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Sparkles,
  Copy,
  Check,
  Layers,
  Grid,
  Info,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface SymbolInfo {
  name: string;
  kind: string;
  line: number;
}

interface FileNode {
  id: string;
  name: string;
  extension: string;
  category: string;
  size: number;
  symbols: SymbolInfo[];
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
  onAskAi?: (prompt: string) => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ onOpenFile, onAskAi }) => {
  const [data, setData] = useState<ArchitectureData | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'high-impact' | 'leaf' | 'isolated'>('all');
  const [viewMode, setViewMode] = useState<'graph' | 'grid'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Pan & Zoom Canvas State
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 80, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchArchitecture = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspace/architecture?refresh=true');
      const json = await res.json();
      setData(json);
      if (json.nodes?.length > 0 && !selectedNodeId) {
        const defaultNode =
          json.nodes.find((n: FileNode) => n.id.includes('orchestrator') || n.id.includes('index.ts')) ||
          json.nodes[0];
        setSelectedNodeId(defaultNode.id);
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

  // Compute In-Degree & Out-Degree mappings
  const { inDegreeMap, outDegreeMap, dependentsMap } = useMemo(() => {
    const inDeg: Record<string, number> = {};
    const outDeg: Record<string, number> = {};
    const deps: Record<string, string[]> = {};

    if (data) {
      data.nodes.forEach((n) => {
        inDeg[n.id] = 0;
        outDeg[n.id] = n.imports.length;
        deps[n.id] = [];
      });

      data.edges.forEach((edge) => {
        inDeg[edge.target] = (inDeg[edge.target] || 0) + 1;
        if (!deps[edge.target]) deps[edge.target] = [];
        deps[edge.target].push(edge.source);
      });
    }

    return { inDegreeMap: inDeg, outDegreeMap: outDeg, dependentsMap: deps };
  }, [data]);

  // Filter nodes by category, search, and role
  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return [];
    return data.nodes.filter((node) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        node.id.toLowerCase().includes(q) ||
        node.name.toLowerCase().includes(q) ||
        node.symbols.some((s) => s.name.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;

      let matchesRole = true;
      const inCount = inDegreeMap[node.id] || 0;
      const outCount = outDegreeMap[node.id] || 0;

      if (roleFilter === 'high-impact') {
        matchesRole = inCount >= 2;
      } else if (roleFilter === 'leaf') {
        matchesRole = outCount === 0 && inCount > 0;
      } else if (roleFilter === 'isolated') {
        matchesRole = inCount === 0 && outCount === 0;
      }

      return matchesSearch && matchesCategory && matchesRole;
    });
  }, [data, search, selectedCategory, roleFilter, inDegreeMap, outDegreeMap]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filter edges where both source and target are in filteredNodes
  const visibleEdges = useMemo(() => {
    if (!data?.edges) return [];
    return data.edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [data, filteredNodeIds]);

  // Categorize nodes into architectural tiers for smooth visual layout
  const nodePositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number; tier: number }> = {};
    if (!filteredNodes.length) return pos;

    const getTier = (node: FileNode): number => {
      if (node.category === 'config' || node.extension === 'json' || node.extension === 'yml') return 0;
      if (node.id.includes('types') || node.id.includes('security') || node.id.includes('credentials')) return 1;
      if (
        node.id.includes('gateway') ||
        node.id.includes('models') ||
        node.id.includes('router') ||
        node.id.includes('context')
      )
        return 2;
      if (node.id.includes('tools') || node.id.includes('workflows') || node.id.includes('db')) return 3;
      if (node.id.includes('server/src/index.ts') || node.id.includes('orchestrator')) return 4;
      if (node.category === 'frontend' || node.id.includes('client')) return 5;
      if (node.category === 'test' || node.id.includes('tests')) return 6;
      return 3;
    };

    const tiers: Record<number, FileNode[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    filteredNodes.forEach((node) => {
      const t = getTier(node);
      tiers[t].push(node);
    });

    const colWidth = 280;
    const rowHeight = 84;

    Object.entries(tiers).forEach(([tierStr, nodesInTier]) => {
      const tier = Number(tierStr);
      nodesInTier.forEach((node, rowIdx) => {
        pos[node.id] = {
          x: tier * colWidth + 50,
          y: rowIdx * rowHeight + 50,
          tier,
        };
      });
    });

    return pos;
  }, [filteredNodes]);

  const selectedNode = useMemo(() => {
    if (!data?.nodes || !selectedNodeId) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [data, selectedNodeId]);

  // Related nodes for selected node
  const activeRelated = useMemo(() => {
    const targetSet = new Set<string>();
    const sourceSet = new Set<string>();
    const targetNodeId = hoveredNodeId || selectedNodeId;

    if (targetNodeId && data?.edges) {
      data.edges.forEach((edge) => {
        if (edge.source === targetNodeId) targetSet.add(edge.target);
        if (edge.target === targetNodeId) sourceSet.add(edge.source);
      });
    }

    return { targetSet, sourceSet };
  }, [hoveredNodeId, selectedNodeId, data]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 2.5));
  };

  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 80, y: 80 });
  };

  const fitView = () => {
    if (!filteredNodes.length) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    Object.values(nodePositions).forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + 220);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + 60);
    });

    const width = maxX - minX + 100;
    const height = maxY - minY + 100;
    const containerWidth = svgRef.current?.clientWidth || 900;
    const containerHeight = svgRef.current?.clientHeight || 600;

    const scale = Math.min(containerWidth / width, containerHeight / height, 1.2);
    setZoom(Math.max(scale, 0.35));
    setPan({ x: 50, y: 50 });
  };

  // Export Mermaid Diagram
  const exportMermaid = () => {
    if (!data) return;
    let mmd = 'graph TD\n';
    mmd += '  %% Architecture Graph exported from OmniWorkspace\n';
    filteredNodes.forEach((node) => {
      const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
      mmd += `  ${cleanId}["${node.name} (${node.category})"]\n`;
    });
    visibleEdges.forEach((edge) => {
      const srcId = edge.source.replace(/[^a-zA-Z0-9_]/g, '_');
      const tgtId = edge.target.replace(/[^a-zA-Z0-9_]/g, '_');
      mmd += `  ${srcId} --> ${tgtId}\n`;
    });

    const blob = new Blob([mmd], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-graph-${Date.now()}.mmd`;
    a.click();
  };

  // Export JSON Graph
  const exportJson = () => {
    if (!data) return;
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      summary: data.summary,
      filteredNodesCount: filteredNodes.length,
      filteredEdgesCount: visibleEdges.length,
      nodes: filteredNodes,
      edges: visibleEdges,
      circularDependencies: data.circularDependencies,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-data-${Date.now()}.json`;
    a.click();
  };

  const copyPath = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'backend':
        return '#38bdf8';
      case 'frontend':
        return '#a855f7';
      case 'electron':
        return '#22c55e';
      case 'config':
        return '#eab308';
      case 'test':
        return '#f97316';
      case 'doc':
        return '#94a3b8';
      default:
        return 'var(--accent-primary)';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: '#050811', overflow: 'hidden' }}>
      {/* Main Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Control Bar */}
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Title & Integrity Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2))',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Network size={15} color="#38bdf8" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                Architecture & Dependency Topology
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {filteredNodes.length} modules • {visibleEdges.length} dependency links • {data?.summary.totalSymbols || 0} symbols
              </span>
            </div>

            {data?.circularDependencies && data.circularDependencies.length > 0 ? (
              <span className="badge badge-red" style={{ fontSize: '10.5px' }}>
                <AlertTriangle size={11} style={{ marginRight: '3px' }} />
                {data.circularDependencies.length} Circular Cycles
              </span>
            ) : (
              <span className="badge badge-green" style={{ fontSize: '10.5px' }}>
                <CheckCircle2 size={11} style={{ marginRight: '3px' }} />
                Clean DAG (0 Cycles)
              </span>
            )}
          </div>

          {/* Search, Filter, & Export Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                className={`tab-btn ${viewMode === 'graph' ? 'active' : ''}`}
                style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
                onClick={() => setViewMode('graph')}
                title="Visual Topology Graph"
              >
                <Layers size={12} />
                <span>Graph</span>
              </button>
              <button
                className={`tab-btn ${viewMode === 'grid' ? 'active' : ''}`}
                style={{ height: '24px', padding: '0 8px', fontSize: '11.5px' }}
                onClick={() => setViewMode('grid')}
                title="Card Matrix View"
              >
                <Grid size={12} />
                <span>Matrix</span>
              </button>
            </div>

            {/* Instant Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search module or symbol..."
                style={{
                  height: '28px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 8px 0 26px',
                  fontSize: '11.5px',
                  color: 'var(--text-primary)',
                  width: '180px',
                  outline: 'none',
                }}
              />
              <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Export Dropdown */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn-secondary"
                style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                onClick={exportMermaid}
                title="Export as Mermaid (.mmd) graph"
              >
                <Download size={11} />
                <span>Mermaid</span>
              </button>
              <button
                className="btn-secondary"
                style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                onClick={exportJson}
                title="Export architecture data as JSON"
              >
                <Download size={11} />
                <span>JSON</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              className="icon-btn"
              onClick={fetchArchitecture}
              title="Re-index workspace architecture"
              style={{ height: '28px', width: '28px' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Secondary Filter Bar */}
        <div
          style={{
            padding: '6px 16px',
            background: 'rgba(10, 15, 29, 0.9)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {/* Category Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginRight: '2px' }}>Category:</span>
            {['all', 'backend', 'frontend', 'electron', 'test', 'config', 'doc'].map((cat) => (
              <button
                key={cat}
                className={`btn-secondary ${selectedCategory === cat ? 'active' : ''}`}
                style={{
                  height: '22px',
                  padding: '0 7px',
                  fontSize: '10.5px',
                  textTransform: 'capitalize',
                  borderColor: selectedCategory === cat ? getCategoryColor(cat) : undefined,
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} ({cat === 'all' ? data?.nodes.length || 0 : data?.summary.categories[cat] || 0})
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Focus:</span>
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'high-impact', label: 'High Impact (≥2 Dependents)' },
              { id: 'leaf', label: 'Leaf Modules' },
              { id: 'isolated', label: 'Isolated' },
            ].map((r) => (
              <button
                key={r.id}
                className={`btn-secondary ${roleFilter === r.id ? 'active' : ''}`}
                style={{ height: '22px', padding: '0 7px', fontSize: '10.5px' }}
                onClick={() => setRoleFilter(r.id as any)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Body: Graph View vs Grid View */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#030712' }}>
          {viewMode === 'graph' ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                cursor: isPanning ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
            >
              {/* SVG Topology Graph */}
              <svg
                ref={svgRef}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                <defs>
                  {/* Arrowhead Markers */}
                  <marker
                    id="arrow-default"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(56, 189, 248, 0.4)" />
                  </marker>
                  <marker
                    id="arrow-active"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                  </marker>
                  <marker
                    id="arrow-dependent"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                  </marker>

                  {/* Canvas Grid Pattern */}
                  <pattern id="grid-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="12" cy="12" r="0.8" fill="rgba(255, 255, 255, 0.08)" />
                  </pattern>
                </defs>

                {/* Grid Background */}
                <rect width="100%" height="100%" fill="url(#grid-dots)" />

                {/* Transformable Canvas Group */}
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Tier Column Guides */}
                  {[
                    'Config & Root',
                    'Core Types & Security',
                    'Gateway & Routers',
                    'Tools & Workflows',
                    'Server & Pipeline',
                    'Frontend Client',
                    'Testing Suites',
                  ].map((tierName, idx) => (
                    <g key={idx} transform={`translate(${idx * 280 + 50}, 10)`}>
                      <text
                        x="100"
                        y="0"
                        textAnchor="middle"
                        fill="rgba(148, 163, 184, 0.35)"
                        fontSize="11px"
                        fontFamily="var(--font-mono)"
                        fontWeight="600"
                        letterSpacing="0.05em"
                      >
                        {tierName.toUpperCase()}
                      </text>
                      <line
                        x1="100"
                        y1="15"
                        x2="100"
                        y2="2000"
                        stroke="rgba(255, 255, 255, 0.02)"
                        strokeDasharray="4 4"
                      />
                    </g>
                  ))}

                  {/* Edges (Dependency Links) */}
                  {visibleEdges.map((edge, idx) => {
                    const src = nodePositions[edge.source];
                    const tgt = nodePositions[edge.target];
                    if (!src || !tgt) return null;

                    const isHighlightedSource = activeRelated.targetSet.has(edge.target) && (edge.source === selectedNodeId || edge.source === hoveredNodeId);
                    const isHighlightedTarget = activeRelated.sourceSet.has(edge.source) && (edge.target === selectedNodeId || edge.target === hoveredNodeId);

                    const x1 = src.x + 200;
                    const y1 = src.y + 26;
                    const x2 = tgt.x;
                    const y2 = tgt.y + 26;

                    const dx = Math.abs(x2 - x1) * 0.5;
                    const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                    let strokeColor = 'rgba(56, 189, 248, 0.15)';
                    let strokeWidth = 1.2;
                    let markerEnd = 'url(#arrow-default)';
                    let opacity = 0.8;

                    if (selectedNodeId || hoveredNodeId) {
                      if (isHighlightedSource) {
                        strokeColor = '#38bdf8';
                        strokeWidth = 2.4;
                        markerEnd = 'url(#arrow-active)';
                        opacity = 1;
                      } else if (isHighlightedTarget) {
                        strokeColor = '#10b981';
                        strokeWidth = 2.4;
                        markerEnd = 'url(#arrow-dependent)';
                        opacity = 1;
                      } else {
                        opacity = 0.06;
                      }
                    }

                    return (
                      <path
                        key={`edge_${idx}`}
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        markerEnd={markerEnd}
                        style={{ transition: 'stroke 0.15s, opacity 0.15s' }}
                      />
                    );
                  })}

                  {/* Visual Node Cards */}
                  {filteredNodes.map((node) => {
                    const pos = nodePositions[node.id];
                    if (!pos) return null;

                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;
                    const isImported = activeRelated.targetSet.has(node.id);
                    const isDependent = activeRelated.sourceSet.has(node.id);
                    const catColor = getCategoryColor(node.category);

                    let cardBorder = isSelected
                      ? '#38bdf8'
                      : isImported
                      ? '#38bdf8'
                      : isDependent
                      ? '#10b981'
                      : 'rgba(255, 255, 255, 0.08)';

                    let cardBg = isSelected
                      ? 'rgba(14, 165, 233, 0.16)'
                      : isImported
                      ? 'rgba(14, 165, 233, 0.08)'
                      : isDependent
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(15, 23, 42, 0.85)';

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(node.id);
                          setIsInspectorOpen(true);
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Node Halo for active nodes */}
                        {(isSelected || isHovered) && (
                          <rect
                            x="-3"
                            y="-3"
                            width="206"
                            height="58"
                            rx="10"
                            fill="none"
                            stroke={isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.5)'}
                            strokeWidth="2"
                            opacity={0.7}
                          />
                        )}

                        {/* Node Card Background */}
                        <rect
                          x="0"
                          y="0"
                          width="200"
                          height="52"
                          rx="8"
                          fill={cardBg}
                          stroke={cardBorder}
                          strokeWidth={isSelected ? '1.8' : '1'}
                          style={{ transition: 'all 0.15s ease' }}
                        />

                        {/* Left Category Accent Strip */}
                        <rect x="0" y="0" width="4" height="52" rx="2" fill={catColor} />

                        {/* Node Name */}
                        <text
                          x="12"
                          y="20"
                          fill={isSelected ? '#f8fafc' : '#e2e8f0'}
                          fontSize="12px"
                          fontWeight={isSelected ? '700' : '600'}
                          fontFamily="var(--font-sans)"
                        >
                          {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
                        </text>

                        {/* Relative Path & Stats */}
                        <text
                          x="12"
                          y="36"
                          fill="rgba(148, 163, 184, 0.7)"
                          fontSize="9.5px"
                          fontFamily="var(--font-mono)"
                        >
                          {node.category} • {node.symbols.length} syms
                        </text>

                        {/* In/Out Degree Indicator Badges */}
                        <g transform="translate(145, 12)">
                          <rect
                            x="0"
                            y="0"
                            width="46"
                            height="16"
                            rx="4"
                            fill="rgba(255, 255, 255, 0.04)"
                            stroke="rgba(255, 255, 255, 0.08)"
                          />
                          <text
                            x="23"
                            y="11"
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="9px"
                            fontFamily="var(--font-mono)"
                          >
                            ↓{inDegreeMap[node.id] || 0} ↑{outDegreeMap[node.id] || 0}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Floating Canvas Controls */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                }}
              >
                <button
                  className="icon-btn"
                  onClick={() => setZoom((z) => Math.min(z * 1.15, 2.5))}
                  title="Zoom In"
                  style={{ height: '26px', width: '26px' }}
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setZoom((z) => Math.max(z * 0.85, 0.25))}
                  title="Zoom Out"
                  style={{ height: '26px', width: '26px' }}
                >
                  <ZoomOut size={13} />
                </button>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    padding: '0 6px',
                  }}
                >
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  className="icon-btn"
                  onClick={fitView}
                  title="Fit to Screen"
                  style={{ height: '26px', width: '26px' }}
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  className="icon-btn"
                  onClick={resetView}
                  title="Reset Pan & Zoom"
                  style={{ height: '26px', width: '26px' }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Dependency Legend */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Imports (Outgoing)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Depended On By (Incoming)</span>
                </div>
              </div>
            </div>
          ) : (
            /* Card Matrix View */
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', height: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px',
                }}
              >
                {filteredNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const catColor = getCategoryColor(node.category);

                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setIsInspectorOpen(true);
                      }}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: `1px solid ${isSelected ? '#38bdf8' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            color: catColor,
                            fontWeight: '700',
                          }}
                        >
                          {node.category}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ↓{inDegreeMap[node.id] || 0} in • ↑{outDegreeMap[node.id] || 0} out
                        </span>
                      </div>

                      <div
                        style={{
                          fontWeight: '600',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          marginBottom: '4px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {node.name}
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          marginBottom: '8px',
                        }}
                      >
                        {node.id}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>{node.symbols.length} symbols</span>
                        <span>{(node.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Node Details & Deep Inspector Side Drawer */}
      {isInspectorOpen && (
        <div
          style={{
            width: '340px',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border-subtle)',
            height: '100%',
          }}
        >
          {/* Inspector Header */}
          <div
            style={{
              height: '42px',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-subtle)',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} color="var(--accent-primary)" />
              <span>MODULE INSPECTOR</span>
            </div>

            <button
              className="icon-btn"
              onClick={() => setIsInspectorOpen(false)}
              title="Close Inspector"
              style={{ padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Module Content */}
          {selectedNode ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* File Title & Category */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      color: getCategoryColor(selectedNode.category),
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {selectedNode.category}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {(selectedNode.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  {selectedNode.name}
                </h2>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    wordBreak: 'break-all',
                    background: 'var(--bg-primary)',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ flex: 1 }}>{selectedNode.id}</span>
                  <button
                    className="icon-btn"
                    onClick={() => copyPath(selectedNode.id)}
                    title="Copy path"
                    style={{ padding: '2px' }}
                  >
                    {copiedId ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Action Buttons: Open in Code Studio & Ask AI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                  {onOpenFile && (
                    <button
                      className="btn-primary"
                      style={{ height: '30px', fontSize: '11px', justifyContent: 'center', gap: '5px' }}
                      onClick={() => onOpenFile(selectedNode.id)}
                    >
                      <FileCode size={12} />
                      <span>Open in Code</span>
                    </button>
                  )}

                  {onAskAi && (
                    <button
                      className="btn-secondary"
                      style={{ height: '30px', fontSize: '11px', justifyContent: 'center', gap: '5px' }}
                      onClick={() =>
                        onAskAi(
                          `Analyze the architectural role, exported symbols, and dependencies of '${selectedNode.id}' in OmniWorkspace.`
                        )
                      }
                    >
                      <Sparkles size={12} color="#38bdf8" />
                      <span>Ask AI Co-Pilot</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Dependencies (Imports) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowRight size={12} />
                    <span>DIRECT IMPORTS ({selectedNode.imports.length})</span>
                  </span>
                </div>

                {selectedNode.imports.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedNode.imports.map((imp, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          const matchingNode = data?.nodes.find((n) => n.id === imp || n.id.endsWith(imp));
                          if (matchingNode) setSelectedNodeId(matchingNode.id);
                        }}
                        style={{
                          background: 'var(--bg-primary)',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: '#38bdf8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(56, 189, 248, 0.15)',
                        }}
                        title={`Focus ${imp}`}
                      >
                        <FileCode size={11} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {imp}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No outgoing local imports (Stand-alone module).
                  </div>
                )}
              </div>

              {/* Dependents (What depends on this file) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowLeft size={12} />
                    <span>DEPENDENTS ({(dependentsMap[selectedNode.id] || []).length})</span>
                  </span>
                </div>

                {(dependentsMap[selectedNode.id] || []).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(dependentsMap[selectedNode.id] || []).map((dep, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedNodeId(dep)}
                        style={{
                          background: 'var(--bg-primary)',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: '#10b981',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                        }}
                        title={`Focus ${dep}`}
                      >
                        <FileCode size={11} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dep}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No other modules currently import this file (Terminal/Leaf module).
                  </div>
                )}
              </div>

              {/* Exported Symbols & Definitions */}
              <div>
                <h3 style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  EXPORTED SYMBOLS ({selectedNode.symbols.length})
                </h3>
                {selectedNode.symbols.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedNode.symbols.map((sym, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--bg-primary)',
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {sym.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '9.5px',
                              textTransform: 'uppercase',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {sym.kind}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            L{sym.line}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No explicit top-level exported functions or classes detected.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '12.5px', textAlign: 'center' }}>
              Select any file node to inspect symbols and dependency links.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
