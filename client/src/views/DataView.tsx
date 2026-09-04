import React, { useState, useRef } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart as PieIcon,
  Upload,
  Download,
  ArrowUpDown,
  Filter,
  X,
  Sparkles,
  Calculator,
} from 'lucide-react';

interface DataRow {
  department: string;
  budget: number;
  headcount: number;
  growth: number;
}

const DEFAULT_DATA: DataRow[] = [
  { department: 'Engineering', budget: 2500000, headcount: 45, growth: 28 },
  { department: 'Research & AI', budget: 1800000, headcount: 22, growth: 55 },
  { department: 'Product Design', budget: 900000, headcount: 14, growth: 15 },
  { department: 'Marketing & Growth', budget: 750000, headcount: 12, growth: 22 },
  { department: 'DevOps & Security', budget: 1200000, headcount: 16, growth: 40 },
  { department: 'Customer Success', budget: 600000, headcount: 10, growth: 18 },
  { department: 'Legal & Compliance', budget: 450000, headcount: 6, growth: 8 },
];

interface DataViewProps {
  onAskAi?: (prompt: string) => void;
}

export const DataView: React.FC<DataViewProps> = ({ onAskAi }) => {
  const [data, setData] = useState<DataRow[]>(DEFAULT_DATA);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [sortField, setSortField] = useState<keyof DataRow>('budget');
  const [sortAsc, setSortAsc] = useState(false);
  const [customCsvInput, setCustomCsvInput] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);

  // New Feature: Interactive Filtering
  const [deptFilter, setDeptFilter] = useState('');
  const [metricFilterField, setMetricFilterField] = useState<keyof DataRow>('budget');
  const [metricFilterOp, setMetricFilterOp] = useState<'>' | '<' | '>='>('>');
  const [metricFilterVal, setMetricFilterVal] = useState<string>('');

  const svgChartRef = useRef<SVGSVGElement>(null);

  // Apply filters
  const filteredData = data.filter((row) => {
    if (deptFilter && !row.department.toLowerCase().includes(deptFilter.toLowerCase())) {
      return false;
    }
    if (metricFilterVal.trim() !== '') {
      const targetVal = Number(metricFilterVal);
      if (!isNaN(targetVal)) {
        const rowVal = Number(row[metricFilterField]);
        if (metricFilterOp === '>' && !(rowVal > targetVal)) return false;
        if (metricFilterOp === '<' && !(rowVal < targetVal)) return false;
        if (metricFilterOp === '>=' && !(rowVal >= targetVal)) return false;
      }
    }
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  // Extended Statistical Computations for active dataset
  const computeStats = (field: 'budget' | 'headcount' | 'growth') => {
    const values = filteredData.map((d) => d[field]).sort((a, b) => a - b);
    if (values.length === 0) return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, iqr: 0 };

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const min = values[0];
    const max = values[values.length - 1];

    // Median
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

    // Percentiles
    const p25 = values[Math.floor(values.length * 0.25)] || min;
    const p75 = values[Math.floor(values.length * 0.75)] || max;
    const iqr = p75 - p25;

    // Standard Deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, median, min, max, stdDev, iqr };
  };

  const budgetStats = computeStats('budget');
  const growthStats = computeStats('growth');
  const headcountStats = computeStats('headcount');

  const totalBudget = filteredData.reduce((acc, curr) => acc + curr.budget, 0);
  const maxBudget = Math.max(...filteredData.map((d) => d.budget), 1);

  const handleParseCustomCsv = () => {
    if (!customCsvInput.trim()) return;
    try {
      const lines = customCsvInput.trim().split('\n');
      if (lines.length < 2) return;
      const parsed: DataRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 4) {
          parsed.push({
            department: parts[0],
            budget: Number(parts[1]) || 0,
            headcount: Number(parts[2]) || 0,
            growth: Number(parts[3]) || 0,
          });
        }
      }
      if (parsed.length > 0) {
        setData(parsed);
        setShowCsvModal(false);
      }
    } catch {
      // ignore
    }
  };

  const handleExportCsv = () => {
    const csvContent =
      'Department,Budget,Headcount,Growth\n' +
      filteredData.map((r) => `"${r.department}",${r.budget},${r.headcount},${r.growth}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-export-${Date.now()}.csv`;
    a.click();
  };

  // 1-Click SVG Vector Chart Exporter
  const handleExportSvg = () => {
    if (!svgChartRef.current) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgChartRef.current);
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniworkspace-chart-${chartType}-${Date.now()}.svg`;
    a.click();
  };

  const clearFilters = () => {
    setDeptFilter('');
    setMetricFilterVal('');
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-blue">Data Analysis Studio</span>
            <span className="badge badge-green">Statistical Engine</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Dataset Analysis & Visualization</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
            Multi-column filtering, standard deviation, IQR percentiles, and dynamic SVG vector export.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onAskAi && (
            <button
              className="btn-primary"
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                const bStats = computeStats('budget');
                const gStats = computeStats('growth');
                const hStats = computeStats('headcount');
                const prompt = `Perform deep statistical analysis and anomaly detection on this active dataset:\n- Total Rows: ${filteredData.length}\n- Budget (USD): Mean $${Math.round(bStats.mean).toLocaleString()}, Median $${Math.round(bStats.median).toLocaleString()}, Min $${bStats.min.toLocaleString()}, Max $${bStats.max.toLocaleString()}, StdDev $${Math.round(bStats.stdDev).toLocaleString()}\n- Growth Rate (%): Mean ${gStats.mean.toFixed(1)}%, Median ${gStats.median.toFixed(1)}%, Range [${gStats.min}%, ${gStats.max}%]\n- Headcount: Mean ${hStats.mean.toFixed(1)}, Median ${hStats.median}, Range [${hStats.min}, ${hStats.max}]\n- Top Departments:\n${filteredData.slice(0, 5).map((d) => `  * ${d.department}: Budget $${d.budget.toLocaleString()}, Headcount ${d.headcount}, Growth ${d.growth}%`).join('\n')}\n\nAnalyze correlations, evaluate budget efficiency, highlight outliers, and recommend concrete optimizations.`;
                onAskAi(prompt);
              }}
              title="Analyze dataset with AI Data Agent"
            >
              <Sparkles size={14} />
              <span>AI Analysis</span>
            </button>
          )}
          <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={handleExportSvg}>
            <Download size={14} color="var(--accent-primary)" />
            <span>Export SVG Chart</span>
          </button>
          <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={() => setShowCsvModal(true)}>
            <Upload size={14} />
            <span>Load CSV</span>
          </button>
          <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={handleExportCsv}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* CSV Input Modal */}
      {showCsvModal && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontWeight: '600', fontSize: '13px' }}>Paste Raw CSV Data</div>
          <textarea
            rows={4}
            value={customCsvInput}
            onChange={(e) => setCustomCsvInput(e.target.value)}
            placeholder="Department,Budget,Headcount,Growth&#10;Security,1200000,16,40&#10;Analytics,850000,10,35"
            style={{
              width: '100%',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              padding: '8px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowCsvModal(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleParseCustomCsv}>
              Parse & Visualize
            </button>
          </div>
        </div>
      )}

      {/* Interactive Filter Condition Builder Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Filters:</span>

          {/* Department Search */}
          <input
            type="text"
            placeholder="Filter department..."
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              height: '26px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 8px',
              fontSize: '11.5px',
              color: 'var(--text-primary)',
              width: '140px',
            }}
          />

          {/* Metric Threshold Condition */}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>where</span>
          <select
            value={metricFilterField}
            onChange={(e) => setMetricFilterField(e.target.value as keyof DataRow)}
            style={{
              height: '26px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 6px',
              fontSize: '11.5px',
              color: 'var(--text-primary)',
            }}
          >
            <option value="budget">Budget ($)</option>
            <option value="growth">Growth (%)</option>
            <option value="headcount">Headcount</option>
          </select>

          <select
            value={metricFilterOp}
            onChange={(e) => setMetricFilterOp(e.target.value as any)}
            style={{
              height: '26px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 6px',
              fontSize: '11.5px',
              color: 'var(--text-primary)',
            }}
          >
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value=">=">&gt;=</option>
          </select>

          <input
            type="number"
            placeholder="Threshold..."
            value={metricFilterVal}
            onChange={(e) => setMetricFilterVal(e.target.value)}
            style={{
              height: '26px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 8px',
              fontSize: '11.5px',
              color: 'var(--text-primary)',
              width: '110px',
            }}
          />

          {(deptFilter || metricFilterVal) && (
            <button
              className="icon-btn"
              onClick={clearFilters}
              title="Clear Filters"
              style={{ height: '24px', padding: '0 6px', gap: '4px', fontSize: '11px' }}
            >
              <X size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredData.length}</strong> of {data.length} records
        </div>
      </div>

      {/* Statistical Summary Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>TOTAL BUDGET</span>
            <Calculator size={13} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
            ${totalBudget.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Mean: ${(budgetStats.mean / 1000).toFixed(0)}k • Median: ${(budgetStats.median / 1000).toFixed(0)}k
          </div>
        </div>

        <div className="card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>BUDGET SPREAD (σ)</span>
            <span className="badge badge-blue" style={{ fontSize: '10px' }}>Std Dev</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-accent)' }}>
            ±${(budgetStats.stdDev / 1000).toFixed(0)}k
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            IQR: ${(budgetStats.iqr / 1000).toFixed(0)}k • Min: ${(budgetStats.min / 1000).toFixed(0)}k
          </div>
        </div>

        <div className="card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>AVG GROWTH RATE</span>
            <span className="badge badge-green" style={{ fontSize: '10px' }}>YoY</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>
            +{growthStats.mean.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Max: +{growthStats.max}% • Median: +{growthStats.median}%
          </div>
        </div>

        <div className="card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>TOTAL HEADCOUNT</span>
            <span className="badge badge-purple" style={{ fontSize: '10px' }}>Staff</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {filteredData.reduce((acc, curr) => acc + curr.headcount, 0)} employees
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Mean: {headcountStats.mean.toFixed(0)} / dept • Max: {headcountStats.max}
          </div>
        </div>
      </div>

      {/* Visual Chart Card */}
      <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>
            {chartType === 'bar' && 'Departmental Budget Allocation ($ USD)'}
            {chartType === 'line' && 'Growth Rate Distribution (%)'}
            {chartType === 'pie' && 'Budget Share Proportions'}
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            <button
              className={`tab-btn ${chartType === 'bar' ? 'active' : ''}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              onClick={() => setChartType('bar')}
            >
              <BarChart3 size={13} />
              <span>Bar</span>
            </button>
            <button
              className={`tab-btn ${chartType === 'line' ? 'active' : ''}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              onClick={() => setChartType('line')}
            >
              <LineChart size={13} />
              <span>Growth Line</span>
            </button>
            <button
              className={`tab-btn ${chartType === 'pie' ? 'active' : ''}`}
              style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
              onClick={() => setChartType('pie')}
            >
              <PieIcon size={13} />
              <span>Donut</span>
            </button>
          </div>
        </div>

        {/* Dynamic SVG Visualization Canvas */}
        <div style={{ width: '100%', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {filteredData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              No records match current filter criteria.
            </div>
          ) : chartType === 'bar' ? (
            <svg ref={svgChartRef} width="100%" height="260" viewBox="0 0 800 260" preserveAspectRatio="none">
              <line x1="60" y1="20" x2="60" y2="210" stroke="var(--border-subtle)" />
              <line x1="60" y1="210" x2="780" y2="210" stroke="var(--border-subtle)" />

              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map((p, idx) => (
                <g key={idx}>
                  <line
                    x1="60"
                    y1={210 - 180 * p}
                    x2="780"
                    y2={210 - 180 * p}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 4"
                  />
                  <text x="50" y={214 - 180 * p} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                    ${((maxBudget * p) / 1000000).toFixed(1)}M
                  </text>
                </g>
              ))}

              {/* Bars */}
              {filteredData.map((d, i) => {
                const barWidth = Math.min(50, 680 / filteredData.length - 12);
                const x = 80 + i * (680 / filteredData.length);
                const barHeight = (d.budget / maxBudget) * 180;
                const y = 210 - barHeight;

                return (
                  <g key={d.department}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill="url(#barGradient)"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      fill="var(--text-primary)"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ${(d.budget / 1000000).toFixed(2)}M
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y={225}
                      fill="var(--text-secondary)"
                      fontSize="9.5"
                      textAnchor="middle"
                    >
                      {d.department.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
          ) : chartType === 'line' ? (
            <svg ref={svgChartRef} width="100%" height="260" viewBox="0 0 800 260" preserveAspectRatio="none">
              <line x1="60" y1="20" x2="60" y2="210" stroke="var(--border-subtle)" />
              <line x1="60" y1="210" x2="780" y2="210" stroke="var(--border-subtle)" />

              {/* Sparkline curve */}
              {(() => {
                const maxGrowth = Math.max(...filteredData.map((d) => d.growth), 60);
                const points = filteredData.map((d, i) => {
                  const x = 80 + i * (680 / Math.max(1, filteredData.length - 1));
                  const y = 210 - (d.growth / maxGrowth) * 170;
                  return { x, y, growth: d.growth, dept: d.department };
                });

                const pathData = points.reduce(
                  (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                  ''
                );

                return (
                  <g>
                    <path d={pathData} fill="none" stroke="#10b981" strokeWidth="3" />
                    {points.map((pt, idx) => (
                      <g key={idx}>
                        <circle cx={pt.x} cy={pt.y} r="5" fill="#10b981" stroke="#04060d" strokeWidth="2" />
                        <text x={pt.x} y={pt.y - 10} fill="#10b981" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                          +{pt.growth}%
                        </text>
                        <text x={pt.x} y={225} fill="var(--text-secondary)" fontSize="9.5" textAnchor="middle">
                          {pt.dept.split(' ')[0]}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>
          ) : (
            /* Donut chart */
            <svg ref={svgChartRef} width="260" height="260" viewBox="0 0 260 260">
              {(() => {
                const colors = ['#38bdf8', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];
                let cumulativePercent = 0;

                return (
                  <g transform="translate(130, 130)">
                    {filteredData.map((d, idx) => {
                      const percent = d.budget / totalBudget;
                      const strokeDasharray = `${percent * 377} 377`;
                      const strokeDashoffset = -cumulativePercent * 377;
                      cumulativePercent += percent;

                      return (
                        <circle
                          key={d.department}
                          cx="0"
                          cy="0"
                          r="60"
                          fill="transparent"
                          stroke={colors[idx % colors.length]}
                          strokeWidth="28"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                        />
                      );
                    })}
                    <text x="0" y="-4" fill="var(--text-primary)" fontSize="15" fontWeight="bold" textAnchor="middle">
                      ${(totalBudget / 1000000).toFixed(1)}M
                    </text>
                    <text x="0" y="14" fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                      Total Allocated
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}
        </div>
      </div>

      {/* Tabular Dataset View */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th
                style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => {
                  setSortField('department');
                  setSortAsc(!sortAsc);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Department</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => {
                  setSortField('budget');
                  setSortAsc(!sortAsc);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Annual Budget</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => {
                  setSortField('headcount');
                  setSortAsc(!sortAsc);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Headcount</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => {
                  setSortField('growth');
                  setSortAsc(!sortAsc);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>YoY Growth</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}
              >
                <td style={{ padding: '10px 16px', fontWeight: '500' }}>{row.department}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>
                  ${row.budget.toLocaleString()}
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{row.headcount}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                  +{row.growth}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
