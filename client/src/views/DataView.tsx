import React, { useState } from 'react';
import { BarChart3, LineChart, PieChart, Table, FileSpreadsheet } from 'lucide-react';

interface DataRow {
  department: string;
  budget: number;
  headcount: number;
  growth: number;
}

const SAMPLE_DATA: DataRow[] = [
  { department: 'Engineering', budget: 2500000, headcount: 45, growth: 28 },
  { department: 'Research & AI', budget: 1800000, headcount: 22, growth: 55 },
  { department: 'Product Design', budget: 900000, headcount: 14, growth: 15 },
  { department: 'Marketing & Growth', budget: 750000, headcount: 12, growth: 22 },
  { department: 'DevOps & Security', budget: 1200000, headcount: 16, growth: 40 },
];

export const DataView: React.FC = () => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const maxBudget = Math.max(...SAMPLE_DATA.map((d) => d.budget));

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-blue">Data Analysis Studio</span>
            <span className="badge badge-green">Statistical Engine</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Dataset Analysis & Visualization</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
            Inspect columns, compute summary statistics, detect distribution anomalies, and render dynamic SVG visualizations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-secondary ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
            style={{ fontSize: '12px' }}
          >
            <BarChart3 size={14} />
            <span>Bar Chart</span>
          </button>
          <button
            className={`btn-secondary ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
            style={{ fontSize: '12px' }}
          >
            <LineChart size={14} />
            <span>Growth Curve</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL BUDGET</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: '4px' }}>$7,150,000</div>
          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px' }}>+32% YoY</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>MEAN BUDGET</div>
          <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>$1,430,000</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>StdDev: $640k</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL HEADCOUNT</div>
          <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>109 Engineers</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>5 Departments</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>NULL / MISSING</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>0.0%</div>
          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px' }}>Dataset Clean</div>
        </div>
      </div>

      {/* Dynamic SVG Chart Viewport */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {chartType === 'bar' ? <BarChart3 size={16} /> : <LineChart size={16} />}
          <span>Departmental Budget & Resource Allocation (Dynamic SVG)</span>
        </h3>

        {chartType === 'bar' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {SAMPLE_DATA.map((row, i) => {
              const widthPct = (row.budget / maxBudget) * 100;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '160px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {row.department}
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div style={{ width: '100px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: '600' }}>
                    ${(row.budget / 1000).toLocaleString()}k
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <svg width="100%" height="220" viewBox="0 0 700 200" style={{ overflow: 'visible' }}>
            {/* Grid lines */}
            <line x1="50" y1="20" x2="650" y2="20" stroke="var(--border-subtle)" strokeDasharray="4" />
            <line x1="50" y1="90" x2="650" y2="90" stroke="var(--border-subtle)" strokeDasharray="4" />
            <line x1="50" y1="160" x2="650" y2="160" stroke="var(--border-subtle)" strokeDasharray="4" />

            {/* Growth Curve Polyline */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              points="100,120 220,40 340,150 460,135 580,75"
            />

            {/* Points */}
            {[
              { x: 100, y: 120, label: 'Eng (28%)' },
              { x: 220, y: 40, label: 'AI (55%)' },
              { x: 340, y: 150, label: 'Des (15%)' },
              { x: 460, y: 135, label: 'Mkt (22%)' },
              { x: 580, y: 75, label: 'Sec (40%)' },
            ].map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#0284c7" stroke="#fff" strokeWidth="2" />
                <text x={p.x} y={p.y - 12} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontFamily="var(--font-mono)">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Raw Data Table */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Table size={15} />
          <span>Underlying Structured Records</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 16px' }}>Department</th>
              <th style={{ padding: '10px 16px' }}>Budget</th>
              <th style={{ padding: '10px 16px' }}>Headcount</th>
              <th style={{ padding: '10px 16px' }}>Growth Rate</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DATA.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 16px', fontWeight: '500' }}>{row.department}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>${row.budget.toLocaleString()}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{row.headcount}</td>
                <td style={{ padding: '10px 16px', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>+{row.growth}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
