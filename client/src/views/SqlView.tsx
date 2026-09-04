import React, { useState, useEffect } from 'react';
import {
  Database,
  Play,
  Eye,
  Table2,
  AlertTriangle,
  Download,
  History,
  Sparkles,
  Search,
  BookOpen,
} from 'lucide-react';

export const SqlView: React.FC = () => {
  const [query, setQuery] = useState(
    'SELECT e.name, d.name AS department, e.salary, s.product, s.amount\nFROM employees e\nJOIN departments d ON e.department_id = d.id\nJOIN sales s ON s.employee_id = e.id\nORDER BY s.amount DESC;'
  );
  const [schema, setSchema] = useState<any>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [plan, setPlan] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [tableFilter, setTableFilter] = useState('');

  const PRESETS = [
    {
      title: 'Top Sales by Product',
      sql: 'SELECT product, SUM(amount) AS total_revenue, COUNT(*) AS deals\nFROM sales\nGROUP BY product\nORDER BY total_revenue DESC;',
    },
    {
      title: 'Department Salary Aggregations',
      sql: 'SELECT d.name, COUNT(e.id) AS total_staff, AVG(e.salary) AS avg_salary, d.budget\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id\nGROUP BY d.id;',
    },
    {
      title: 'High Earner Employees (>180k)',
      sql: 'SELECT name, role, salary, hire_date\nFROM employees\nWHERE salary >= 180000\nORDER BY salary DESC;',
    },
  ];

  const loadSchema = async () => {
    try {
      const res = await fetch('/api/sql/schema');
      const data = await res.json();
      setSchema(data);
    } catch {
      // ignore
    }
  };

  const handleExecute = async (queryToRun?: string) => {
    const q = queryToRun || query;
    setIsRunning(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.rows || []);

      // Add to history
      setQueryHistory((prev) => {
        const filtered = prev.filter((item) => item !== q);
        return [q, ...filtered].slice(0, 10);
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExplain = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `EXPLAIN QUERY PLAN ${query}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlan(data.rows || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const exportResultsCsv = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results.map((r) => Object.values(r).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sql-results-${Date.now()}.csv`;
    a.click();
  };

  useEffect(() => {
    loadSchema();
    handleExecute();
  }, []);

  const filteredTables = (schema?.tables || []).filter((t: string) =>
    t.toLowerCase().includes(tableFilter.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1px', background: 'var(--border-subtle)' }}>
      {/* Schema Browser Side Pane */}
      <div style={{ width: '260px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: '38px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '11.5px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} color="var(--accent-primary)" />
            <span>SCHEMA EXPLORER</span>
          </div>
        </div>

        {/* Filter Input */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Search tables..."
              style={{
                width: '100%',
                height: '24px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 8px 0 24px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <Search size={11} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {filteredTables.map((table: string) => (
            <div key={table} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '12.5px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                <Table2 size={13} color="var(--accent-primary)" />
                <span>{table}</span>
              </div>
              <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {(schema.schema[table] || []).map((col: any) => (
                  <div key={col.name} style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{col.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Query History Bar */}
        {queryHistory.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 12px', maxHeight: '140px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <History size={12} />
              <span>RECENT QUERIES</span>
            </div>
            {queryHistory.slice(0, 3).map((h, i) => (
              <div
                key={i}
                onClick={() => {
                  setQuery(h);
                  handleExecute(h);
                }}
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  background: 'var(--bg-primary)',
                  marginBottom: '4px',
                }}
              >
                {h.replace(/\n/g, ' ')}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query Console and Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Editor Controls Bar */}
        <div
          style={{
            padding: '8px 14px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Templates:</span>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                className="btn-secondary"
                style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
                onClick={() => {
                  setQuery(p.sql);
                  handleExecute(p.sql);
                }}
              >
                <span>{p.title}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {results && results.length > 0 && (
              <button className="btn-secondary" style={{ height: '28px', fontSize: '11.5px' }} onClick={exportResultsCsv}>
                <Download size={12} />
                <span>Export CSV</span>
              </button>
            )}
            <button className="btn-secondary" style={{ height: '28px', fontSize: '11.5px' }} onClick={handleExplain} disabled={isRunning}>
              <Eye size={12} />
              <span>EXPLAIN</span>
            </button>
            <button className="btn-primary" style={{ height: '28px', fontSize: '11.5px' }} onClick={() => handleExecute()} disabled={isRunning}>
              <Play size={12} />
              <span>Run Query</span>
            </button>
          </div>
        </div>

        {/* SQL Query Textarea */}
        <div style={{ height: '130px', borderBottom: '1px solid var(--border-subtle)' }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              height: '100%',
              background: '#070b14',
              color: '#38bdf8',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              lineHeight: '1.5',
              padding: '12px 14px',
              border: 'none',
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>

        {/* Results / Plan Display */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '12.5px', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={15} color="var(--danger)" />
              <span>{error}</span>
            </div>
          )}

          {plan && (
            <div>
              <h3 style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Query Execution Plan
              </h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                {JSON.stringify(plan, null, 2)}
              </pre>
            </div>
          )}

          {results && results.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  {Object.keys(results[0]).map((k) => (
                    <th key={k} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {Object.values(row).map((v: any, j) => (
                      <td key={j} style={{ padding: '8px 12px', fontFamily: typeof v === 'number' ? 'var(--font-mono)' : 'inherit' }}>
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
