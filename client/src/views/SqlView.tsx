import React, { useState, useEffect } from 'react';
import { Database, Play, Eye, Table2, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const SqlView: React.FC = () => {
  const [query, setQuery] = useState(
    'SELECT e.name, d.name AS department, e.salary, s.product, s.amount\nFROM employees e\nJOIN departments d ON e.department_id = d.id\nJOIN sales s ON s.employee_id = e.id\nORDER BY s.amount DESC;'
  );
  const [schema, setSchema] = useState<any>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [plan, setPlan] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchema = async () => {
    try {
      const res = await fetch('/api/sql/schema');
      const data = await res.json();
      setSchema(data);
    } catch {
      // ignore
    }
  };

  const handleExecute = async () => {
    setIsRunning(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.rows || []);
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

  useEffect(() => {
    loadSchema();
    handleExecute();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1px', background: 'var(--border-subtle)' }}>
      {/* Schema Browser Side Pane */}
      <div style={{ width: '260px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: '38px',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
          }}
        >
          <Database size={14} color="var(--accent-primary)" />
          <span>SCHEMA EXPLORER</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {schema?.tables?.map((table: string) => (
            <div key={table} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                <Table2 size={13} color="var(--accent-primary)" />
                <span>{table}</span>
              </div>
              <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {(schema.schema[table] || []).map((col: any) => (
                  <div key={col.name} style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{col.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query Console and Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Editor Controls Bar */}
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-green">SQLite Workspace DB</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Read/Write Sandbox</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ height: '30px', fontSize: '12px' }} onClick={handleExplain} disabled={isRunning}>
              <Eye size={13} />
              <span>EXPLAIN Plan</span>
            </button>
            <button className="btn-primary" style={{ height: '30px', fontSize: '12px' }} onClick={handleExecute} disabled={isRunning}>
              <Play size={13} />
              <span>Run Query</span>
            </button>
          </div>
        </div>

        {/* SQL Query Textarea */}
        <div style={{ height: '140px', borderBottom: '1px solid var(--border-subtle)' }}>
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
              fontSize: '13px',
              lineHeight: '1.5',
              padding: '12px 16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>

        {/* Results / Plan Display */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '13px', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={16} color="var(--danger)" />
              <span>{error}</span>
            </div>
          )}

          {plan && (
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                SQLite Query Bytecode / Execution Plan
              </h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                {JSON.stringify(plan, null, 2)}
              </pre>
            </div>
          )}

          {results && results.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
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
