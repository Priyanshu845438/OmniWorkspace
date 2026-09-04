import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Copy,
  Check,
  BarChart3,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  Trash2,
  RefreshCw,
  Layers,
  Zap,
  Key,
  Hash,
  FileSpreadsheet,
  Code2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface SqlViewProps {
  onAskAi?: (prompt: string) => void;
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

interface SchemaData {
  tables: string[];
  schema: Record<string, ColumnInfo[]>;
  rowCounts: Record<string, number>;
}

export const SqlView: React.FC<SqlViewProps> = ({ onAskAi }) => {
  const [query, setQuery] = useState(
    'SELECT e.name, d.name AS department, e.salary, s.product, s.amount\nFROM employees e\nJOIN departments d ON e.department_id = d.id\nJOIN sales s ON s.employee_id = e.id\nORDER BY s.amount DESC;'
  );
  const [schema, setSchema] = useState<SchemaData | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [plan, setPlan] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDestructiveBlocked, setIsDestructiveBlocked] = useState(false);
  const [queryHistory, setQueryHistory] = useState<Array<{ sql: string; time: string }>>([
    {
      sql: 'SELECT e.name, d.name AS department, e.salary, s.product, s.amount\nFROM employees e\nJOIN departments d ON e.department_id = d.id\nJOIN sales s ON s.employee_id = e.id\nORDER BY s.amount DESC;',
      time: 'Just now',
    },
  ]);

  // UI state
  const [activeTab, setActiveTab] = useState<'results' | 'explain' | 'chart' | 'ai'>('results');
  const [tableSearch, setTableSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    employees: true,
    sales: true,
    departments: false,
    customers: false,
    products: false,
  });
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRowIdx, setCopiedRowIdx] = useState<number | null>(null);

  // Results table interactive state
  const [tableFilter, setTableFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Chart state
  const [chartX, setChartX] = useState<string>('');
  const [chartY, setChartY] = useState<string>('');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');

  // AI Architect state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    sql?: string;
    explanation?: string;
    suggestedIndexes?: string[];
    insights?: string[];
  } | null>(null);
  const [indexCreationStatus, setIndexCreationStatus] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const PRESETS = [
    {
      title: 'Top Sales by Product',
      sql: 'SELECT product, SUM(amount) AS total_revenue, COUNT(*) AS deals\nFROM sales\nGROUP BY product\nORDER BY total_revenue DESC;',
    },
    {
      title: 'Department Budget & Payroll',
      sql: 'SELECT d.name AS department, d.budget, COUNT(e.id) AS staff_count, ROUND(AVG(e.salary), 2) AS avg_salary, SUM(e.salary) AS total_payroll\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id\nGROUP BY d.id\nORDER BY total_payroll DESC;',
    },
    {
      title: 'High Earner Staff (>180k)',
      sql: 'SELECT e.name, e.role, e.salary, d.name AS department, e.hire_date\nFROM employees e\nJOIN departments d ON e.department_id = d.id\nWHERE e.salary >= 180000\nORDER BY e.salary DESC;',
    },
    {
      title: 'Customer Lifetime Deals',
      sql: 'SELECT c.company_name, c.tier, c.country, COUNT(s.id) AS total_deals, COALESCE(SUM(s.amount), 0) AS total_spend\nFROM customers c\nLEFT JOIN sales s ON s.product LIKE "%" || c.company_name || "%" OR s.amount > 0\nGROUP BY c.id\nORDER BY total_spend DESC;',
    },
    {
      title: 'Product Stock Valuation',
      sql: 'SELECT name, category, unit_price, stock_quantity, (unit_price * stock_quantity) AS inventory_value\nFROM products\nORDER BY inventory_value DESC;',
    },
    {
      title: 'Recent Security Audit Events',
      sql: 'SELECT id, tool_name, permission_level, approved, success, timestamp\nFROM audit_events\nORDER BY id DESC\nLIMIT 25;',
    },
  ];

  const loadSchema = async () => {
    try {
      const res = await fetch('/api/sql/schema');
      const data = await res.json();
      setSchema(data);
      if (data?.tables) {
        // Expand first 2 tables by default
        const initialExpanded: Record<string, boolean> = {};
        data.tables.slice(0, 3).forEach((t: string) => {
          initialExpanded[t] = true;
        });
        setExpandedTables((prev) => ({ ...initialExpanded, ...prev }));
      }
    } catch {
      // ignore
    }
  };

  const handleExecute = async (queryToRun?: string, isConfirmed?: boolean) => {
    const q = queryToRun || query;
    setIsRunning(true);
    setError(null);
    setIsDestructiveBlocked(false);
    setPage(1);

    try {
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, isUserConfirmed: isConfirmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.includes('DESTRUCTIVE OPERATION BLOCKED')) {
          setIsDestructiveBlocked(true);
        }
        throw new Error(data.error);
      }

      const rows = data.rows || [];
      setResults(rows);
      setDurationMs(data.durationMs ?? null);

      if (rows.length > 0) {
        const cols = Object.keys(rows[0]);
        setResultColumns(cols);

        // Auto-configure chart columns if not already configured
        const numericCol = cols.find((c) => typeof rows[0][c] === 'number');
        const textCol = cols.find((c) => typeof rows[0][c] === 'string') || cols[0];
        if (textCol) setChartX(textCol);
        if (numericCol) setChartY(numericCol);
      } else {
        setResultColumns([]);
      }

      // Switch to results tab if on explain and it wasn't an explain query
      if (activeTab === 'explain' && !/^explain/i.test(q.trim())) {
        setActiveTab('results');
      }

      // Add to history
      setQueryHistory((prev) => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const filtered = prev.filter((item) => item.sql !== q);
        return [{ sql: q, time: now }, ...filtered].slice(0, 15);
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
    try {
      const res = await fetch('/api/sql/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlan(data.plan || []);
      setDurationMs(data.durationMs ?? null);
      setActiveTab('explain');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAiAction = async (action: 'generate' | 'optimize' | 'explain', userPrompt?: string) => {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sql/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          prompt: userPrompt || aiPrompt,
          currentQuery: query,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      setAiResult(data);
      setActiveTab('ai');
    } catch (err: any) {
      setError(`AI Assistant Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunSuggestedIndex = async (indexSql: string) => {
    try {
      setIndexCreationStatus('Executing...');
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: indexSql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIndexCreationStatus(`Index applied successfully: ${indexSql}`);
      loadSchema();
      setTimeout(() => setIndexCreationStatus(null), 4000);
    } catch (err: any) {
      setIndexCreationStatus(`Index creation failed: ${err.message}`);
    }
  };

  // Format SQL basic keywords
  const handleFormatSql = () => {
    let formatted = query;
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
      'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INSERT INTO',
      'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE',
      'AS', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'COALESCE', 'ROUND', 'DESC', 'ASC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];
    keywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(regex, kw);
    });
    setQuery(formatted);
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyRow = (row: any, idx: number) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    setCopiedRowIdx(idx);
    setTimeout(() => setCopiedRowIdx(null), 2000);
  };

  // Keyboard shortcut Cmd/Ctrl + Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query]);

  // Initial load
  useEffect(() => {
    loadSchema();
    handleExecute();
  }, []);

  // Filter and sort results
  const processedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    let list = [...results];

    // Filter
    if (tableFilter.trim()) {
      const filterLower = tableFilter.toLowerCase();
      list = list.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(filterLower)
        )
      );
    }

    // Sort
    if (sortColumn) {
      list.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [results, tableFilter, sortColumn, sortDirection]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    if (pageSize === -1) return processedResults;
    const start = (page - 1) * pageSize;
    return processedResults.slice(start, start + pageSize);
  }, [processedResults, page, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(processedResults.length / pageSize));

  const handleHeaderSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Export functions
  const exportResultsCsv = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results
      .map((r) =>
        Object.values(r)
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sql_results_${Date.now()}.csv`;
    a.click();
  };

  const exportResultsJson = () => {
    if (!results || results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sql_results_${Date.now()}.json`;
    a.click();
  };

  const copyMarkdownTable = () => {
    if (!results || results.length === 0) return;
    const cols = Object.keys(results[0]);
    const headerRow = `| ${cols.join(' | ')} |`;
    const separatorRow = `| ${cols.map(() => '---').join(' | ')} |`;
    const dataRows = results
      .map((row) => `| ${cols.map((c) => String(row[c] ?? '')).join(' | ')} |`)
      .join('\n');
    const md = `${headerRow}\n${separatorRow}\n${dataRows}`;
    navigator.clipboard.writeText(md);
  };

  // Line count for editor
  const lineCount = query.split('\n').length;

  // Filter tables in schema explorer
  const filteredTables = (schema?.tables || []).filter((table) => {
    if (!tableSearch.trim()) return true;
    const s = tableSearch.toLowerCase();
    if (table.toLowerCase().includes(s)) return true;
    const cols = schema?.schema[table] || [];
    return cols.some((c) => c.name.toLowerCase().includes(s));
  });

  const totalDbRows = useMemo(() => {
    if (!schema?.rowCounts) return 0;
    return Object.values(schema.rowCounts).reduce((acc, c) => acc + c, 0);
  }, [schema]);

  // Chart data calculation
  const chartData = useMemo(() => {
    if (!results || results.length === 0 || !chartX || !chartY) return null;
    const items = results.slice(0, 20).map((r) => ({
      label: String(r[chartX] ?? ''),
      value: Number(r[chartY]) || 0,
    }));
    const maxValue = Math.max(...items.map((i) => i.value), 1);
    const sumValue = items.reduce((a, b) => a + b.value, 0);
    const avgValue = Math.round((sumValue / items.length) * 100) / 100;
    return { items, maxValue, sumValue, avgValue };
  }, [results, chartX, chartY]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* 1. SCHEMA EXPLORER SIDEBAR */}
      <div
        style={{
          width: '280px',
          minWidth: '280px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            height: '42px',
            padding: '0 12px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color="var(--accent-primary)" />
            <span style={{ fontSize: '11.5px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              SCHEMA EXPLORER
            </span>
          </div>
          <button
            onClick={loadSchema}
            title="Refresh Schema"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Database Status Pill */}
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(56, 189, 248, 0.04)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 6px var(--success)',
              }}
            />
            <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>SQLite (workspace.db)</span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {schema?.tables?.length || 0} tables
          </span>
        </div>

        {/* Search Tables Input */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter tables & columns..."
              style={{
                width: '100%',
                height: '26px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 8px 0 26px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Tables and Columns Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {filteredTables.length === 0 ? (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px' }}>
              No matching tables found.
            </div>
          ) : (
            filteredTables.map((tableName) => {
              const columns = schema?.schema[tableName] || [];
              const rowCount = schema?.rowCounts?.[tableName] ?? 0;
              const isExpanded = !!expandedTables[tableName];

              return (
                <div
                  key={tableName}
                  style={{
                    marginBottom: '6px',
                    borderRadius: 'var(--radius-sm)',
                    background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    border: isExpanded ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  }}
                >
                  {/* Table Header Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      userSelect: 'none',
                    }}
                    onClick={() =>
                      setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }))
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      {isExpanded ? (
                        <ChevronDown size={13} color="var(--text-muted)" />
                      ) : (
                        <ChevronRight size={13} color="var(--text-muted)" />
                      )}
                      <Table2 size={13} color="var(--accent-primary)" />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {tableName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          background: 'var(--bg-tertiary)',
                          padding: '1px 5px',
                          borderRadius: '10px',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {rowCount}
                      </span>
                    </div>
                  </div>

                  {/* Table Quick Query Actions Toolbar (Shown when expanded) */}
                  {isExpanded && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '4px 8px 6px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const q = `SELECT * FROM ${tableName} LIMIT 50;`;
                          setQuery(q);
                          handleExecute(q);
                        }}
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          background: 'var(--btn-secondary-bg)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-accent)',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                        title="Query all rows"
                      >
                        SELECT *
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const q = `SELECT COUNT(*) AS total_rows FROM ${tableName};`;
                          setQuery(q);
                          handleExecute(q);
                        }}
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          background: 'var(--btn-secondary-bg)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                        title="Count rows"
                      >
                        COUNT
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const q = `PRAGMA table_info("${tableName}");`;
                          setQuery(q);
                          handleExecute(q);
                        }}
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          background: 'var(--btn-secondary-bg)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                        title="Inspect schema columns"
                      >
                        SCHEMA
                      </button>
                    </div>
                  )}

                  {/* Columns List */}
                  {isExpanded && (
                    <div style={{ padding: '4px 8px 6px 24px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {columns.map((col) => (
                        <div
                          key={col.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            padding: '2px 4px',
                            borderRadius: '2px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {col.pk === 1 ? (
                              <span title="Primary Key">
                                <Key size={10} color="#fbbf24" />
                              </span>
                            ) : (
                              <Hash size={10} color="var(--text-muted)" />
                            )}
                            <span
                              style={{
                                color: col.pk === 1 ? '#fde047' : 'var(--text-secondary)',
                                fontWeight: col.pk === 1 ? '600' : '400',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {col.name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {col.pk === 1 && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  color: '#fbbf24',
                                  background: 'rgba(251, 191, 36, 0.1)',
                                  padding: '1px 3px',
                                  borderRadius: '2px',
                                  fontWeight: '700',
                                }}
                              >
                                PK
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontFamily: 'var(--font-mono)',
                                color:
                                  col.type.toUpperCase().includes('INT')
                                    ? '#60a5fa'
                                    : col.type.toUpperCase().includes('TEXT')
                                    ? '#34d399'
                                    : col.type.toUpperCase().includes('REAL')
                                    ? '#c084fc'
                                    : 'var(--text-muted)',
                              }}
                            >
                              {col.type || 'ANY'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Database Stats Card */}
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Total Database Rows:</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
            {totalDbRows.toLocaleString()}
          </span>
        </div>

        {/* Query History Panel */}
        {queryHistory.length > 0 && (
          <div
            style={{
              maxHeight: '150px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-sidebar)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '10.5px',
                fontWeight: '600',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <History size={11} />
                <span>QUERY HISTORY</span>
              </div>
              <button
                onClick={() => setQueryHistory([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title="Clear History"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '6px 8px' }}>
              {queryHistory.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setQuery(item.sql);
                    handleExecute(item.sql);
                  }}
                  style={{
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    fontSize: '10.5px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.sql}
                >
                  {item.sql.replace(/\s+/g, ' ')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN SQL STUDIO WORKSPACE */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Presets Toolbar */}
        <div
          style={{
            padding: '7px 12px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Presets:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                className="btn-secondary"
                style={{
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => {
                  setQuery(p.sql);
                  handleExecute(p.sql);
                }}
              >
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Controls & Action Bar */}
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleFormatSql}
              className="btn-secondary"
              style={{ height: '26px', fontSize: '11px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Format SQL Keywords"
            >
              <Code2 size={12} />
              <span>Format SQL</span>
            </button>

            <button
              onClick={() => setQuery('')}
              className="btn-secondary"
              style={{ height: '26px', fontSize: '11px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Clear SQL Editor"
            >
              <span>Clear</span>
            </button>

            <button
              onClick={handleCopyQuery}
              className="btn-secondary"
              style={{ height: '26px', fontSize: '11px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Copy Query to Clipboard"
            >
              {copiedSql ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
              <span>{copiedSql ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={() => {
                setActiveTab('ai');
                handleAiAction('optimize');
              }}
              className="btn-secondary"
              style={{
                height: '28px',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderColor: 'rgba(56, 189, 248, 0.4)',
              }}
              title="Optimize Query with AI"
              disabled={aiLoading}
            >
              <Sparkles size={13} color="var(--accent-primary)" />
              <span>AI Architect</span>
            </button>

            {/* Explain Query Plan */}
            <button
              onClick={handleExplain}
              className="btn-secondary"
              style={{ height: '28px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
              disabled={isRunning}
              title="Explain Query Execution Plan"
            >
              <Eye size={13} />
              <span>EXPLAIN</span>
            </button>

            {/* Execute Button */}
            <button
              onClick={() => handleExecute()}
              className="btn-primary"
              style={{
                height: '28px',
                fontSize: '11.5px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                boxShadow: '0 0 10px rgba(56, 189, 248, 0.25)',
              }}
              disabled={isRunning}
            >
              <Play size={12} fill="currentColor" />
              <span>{isRunning ? 'Running...' : 'Run Query'}</span>
              <kbd
                style={{
                  fontSize: '9.5px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '1px 4px',
                  borderRadius: '2px',
                  marginLeft: '4px',
                  opacity: 0.8,
                }}
              >
                ⌘↵
              </kbd>
            </button>
          </div>
        </div>

        {/* Destructive Warning Confirmation Banner */}
        {isDestructiveBlocked && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#fca5a5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color="var(--danger)" />
              <span>
                <strong>DESTRUCTIVE OPERATION GUARD:</strong> This query will permanently alter or drop database records/schema. Explicit confirmation is required.
              </span>
            </div>
            <button
              style={{
                height: '26px',
                padding: '0 12px',
                fontSize: '11.5px',
                background: 'var(--danger)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onClick={() => handleExecute(query, true)}
            >
              Confirm & Execute Destructive SQL
            </button>
          </div>
        )}

        {/* Code Editor with Line Numbers */}
        <div
          style={{
            height: '145px',
            minHeight: '120px',
            borderBottom: '1px solid var(--border-subtle)',
            background: '#070b14',
            display: 'flex',
            position: 'relative',
          }}
        >
          {/* Line Numbers Gutter */}
          <div
            style={{
              width: '42px',
              background: '#04070d',
              borderRight: '1px solid var(--border-subtle)',
              padding: '10px 0',
              textAlign: 'right',
              color: '#475569',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: '1.5',
              userSelect: 'none',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: Math.max(lineCount, 6) }).map((_, i) => (
              <div key={i} style={{ paddingRight: '8px' }}>
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea Code Input */}
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            placeholder="Write SQL query here... (e.g. SELECT * FROM employees;)"
            style={{
              flex: 1,
              height: '100%',
              background: 'transparent',
              color: '#38bdf8',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              lineHeight: '1.5',
              padding: '10px 14px',
              border: 'none',
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>

        {/* Execution Telemetry Bar */}
        <div
          style={{
            height: '32px',
            padding: '0 12px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Status Pill */}
            {error ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--danger)' }}>
                <AlertTriangle size={13} />
                <span>Execution Failed</span>
              </div>
            ) : results ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--success)' }}>
                <Check size={13} />
                <span>Ready ({results.length} rows)</span>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Ready</span>
            )}

            {/* Execution Duration */}
            {durationMs !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <Zap size={12} color="var(--accent-primary)" />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{durationMs} ms</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '10.5px' }}>
            <span>Shortcut: Press <strong>⌘ + Enter</strong> to run query</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderBottom: '1px solid var(--danger)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: '#fca5a5',
            }}
          >
            <AlertTriangle size={15} color="var(--danger)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{error}</span>
          </div>
        )}

        {/* 3. TABBED RESULTS & ANALYTICS WORKSPACE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Workspace Tabs Header */}
          <div
            style={{
              height: '38px',
              background: 'var(--bg-sidebar)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
            }}
          >
            <div style={{ display: 'flex', gap: '4px', height: '100%' }}>
              <button
                onClick={() => setActiveTab('results')}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  background: activeTab === 'results' ? 'var(--bg-primary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'results' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'results' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <Table2 size={13} color={activeTab === 'results' ? 'var(--accent-primary)' : 'inherit'} />
                <span>Results Grid</span>
                {results && (
                  <span
                    style={{
                      fontSize: '10px',
                      background: 'var(--bg-tertiary)',
                      padding: '1px 5px',
                      borderRadius: '8px',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {results.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('explain');
                  if (!plan) handleExplain();
                }}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  background: activeTab === 'explain' ? 'var(--bg-primary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'explain' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'explain' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <Layers size={13} color={activeTab === 'explain' ? 'var(--accent-primary)' : 'inherit'} />
                <span>Query Plan (EXPLAIN)</span>
              </button>

              <button
                onClick={() => setActiveTab('chart')}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  background: activeTab === 'chart' ? 'var(--bg-primary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'chart' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'chart' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <BarChart3 size={13} color={activeTab === 'chart' ? 'var(--accent-primary)' : 'inherit'} />
                <span>Instant Data Chart</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  background: activeTab === 'ai' ? 'var(--bg-primary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'ai' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'ai' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={13} color={activeTab === 'ai' ? 'var(--accent-primary)' : 'inherit'} />
                <span>AI SQL Architect</span>
              </button>
            </div>

            {/* Export Actions for Data Grid */}
            {activeTab === 'results' && results && results.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={exportResultsCsv}
                  className="btn-secondary"
                  style={{ height: '24px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Export to CSV"
                >
                  <Download size={11} />
                  <span>CSV</span>
                </button>
                <button
                  onClick={exportResultsJson}
                  className="btn-secondary"
                  style={{ height: '24px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Export to JSON"
                >
                  <FileSpreadsheet size={11} />
                  <span>JSON</span>
                </button>
                <button
                  onClick={copyMarkdownTable}
                  className="btn-secondary"
                  style={{ height: '24px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Copy as Markdown Table"
                >
                  <Copy size={11} />
                  <span>Markdown</span>
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: DATA GRID */}
          {activeTab === 'results' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Filter and Table Tools Bar */}
              {results && results.length > 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ position: 'relative', width: '220px' }}>
                    <input
                      type="text"
                      value={tableFilter}
                      onChange={(e) => {
                        setTableFilter(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search across rows..."
                      style={{
                        width: '100%',
                        height: '24px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0 8px 0 24px',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                    <Filter size={11} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-muted)' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>
                      Showing {processedResults.length === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
                      {Math.min(page * pageSize, processedResults.length)} of {processedResults.length} rows
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        style={{
                          height: '22px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '0 4px',
                          outline: 'none',
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={-1}>All</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {!results || results.length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      gap: '8px',
                    }}
                  >
                    <Table2 size={32} strokeWidth={1.5} color="var(--border-strong)" />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>No query results to display</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Execute a query or click one of the presets above.
                    </span>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)' }}>
                      <tr>
                        <th
                          style={{
                            width: '40px',
                            padding: '8px 10px',
                            borderBottom: '1px solid var(--border-subtle)',
                            color: 'var(--text-muted)',
                            fontSize: '10.5px',
                            fontWeight: '600',
                            textAlign: 'center',
                          }}
                        >
                          #
                        </th>
                        {resultColumns.map((col) => {
                          const isSorted = sortColumn === col;
                          return (
                            <th
                              key={col}
                              onClick={() => handleHeaderSort(col)}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--border-subtle)',
                                color: isSorted ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontWeight: '600',
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>{col}</span>
                                <ArrowUpDown size={11} color={isSorted ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                              </div>
                            </th>
                          );
                        })}
                        <th
                          style={{
                            width: '50px',
                            padding: '8px 10px',
                            borderBottom: '1px solid var(--border-subtle)',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '10.5px',
                          }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((row, rowIdx) => {
                        const globalIdx = (page - 1) * pageSize + rowIdx + 1;
                        return (
                          <tr
                            key={rowIdx}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                rowIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)')
                            }
                          >
                            <td
                              style={{
                                padding: '7px 10px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                              }}
                            >
                              {globalIdx}
                            </td>
                            {resultColumns.map((col, colIdx) => {
                              const val = row[col];
                              const isNumeric = typeof val === 'number';
                              return (
                                <td
                                  key={colIdx}
                                  style={{
                                    padding: '7px 12px',
                                    color: val === null ? 'var(--text-muted)' : 'var(--text-primary)',
                                    fontFamily: isNumeric ? 'var(--font-mono)' : 'inherit',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {val === null ? (
                                    <span style={{ fontStyle: 'italic', opacity: 0.5 }}>NULL</span>
                                  ) : isNumeric ? (
                                    val.toLocaleString()
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleCopyRow(row, rowIdx)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: copiedRowIdx === rowIdx ? 'var(--success)' : 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                }}
                                title="Copy row as JSON"
                              >
                                {copiedRowIdx === rowIdx ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              {results && results.length > 0 && totalPages > 1 && (
                <div
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                  }}
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary"
                    style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary"
                    style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VISUAL QUERY PLAN (EXPLAIN) */}
          {activeTab === 'explain' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      SQLite Execution Plan
                    </h3>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Visual representation of table scans, index lookups, and sorting operations.
                    </p>
                  </div>
                  {durationMs !== null && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      Latency: {durationMs} ms
                    </span>
                  )}
                </div>

                {!plan || plan.length === 0 ? (
                  <div
                    style={{
                      padding: '32px',
                      textAlign: 'center',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '12.5px',
                    }}
                  >
                    Click "EXPLAIN" above to inspect the execution pipeline for this query.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.map((step: any, idx: number) => {
                      const detail = step.detail || '';
                      const isIndexSearch = /using\s+index/i.test(detail);
                      const isScan = /scan\s+table/i.test(detail);
                      const isTempBTree = /use\s+temp\s+b-tree/i.test(detail);

                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                          }}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'var(--bg-tertiary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--accent-primary)',
                              flexShrink: 0,
                            }}
                          >
                            {step.id ?? idx + 1}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              {isIndexSearch && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    background: 'rgba(52, 211, 153, 0.15)',
                                    color: '#34d399',
                                    border: '1px solid rgba(52, 211, 153, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  INDEX SEARCH (OPTIMAL)
                                </span>
                              )}
                              {isScan && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  FULL TABLE SCAN
                                </span>
                              )}
                              {isTempBTree && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    background: 'rgba(96, 165, 250, 0.15)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(96, 165, 250, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  TEMP B-TREE SORT
                                </span>
                              )}
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                parent: {step.parent ?? 0}
                              </span>
                            </div>

                            <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                              {detail}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Optimization Recommendation Box */}
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px 14px',
                        background: 'rgba(56, 189, 248, 0.05)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11.5px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '4px' }}>
                        Performance Tip:
                      </strong>
                      Full table scans (`SCAN TABLE`) load all pages sequentially. On tables with over 10,000 rows,
                      adding covering indexes on joined or filtered keys transforms scans into logarithmic O(log N)
                      B-tree searches.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INSTANT DATA CHART */}
          {activeTab === 'chart' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Chart Controls Bar */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Category (X):</span>
                      <select
                        value={chartX}
                        onChange={(e) => setChartX(e.target.value)}
                        style={{
                          height: '26px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          padding: '0 8px',
                          outline: 'none',
                        }}
                      >
                        {resultColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Metric (Y):</span>
                      <select
                        value={chartY}
                        onChange={(e) => setChartY(e.target.value)}
                        style={{
                          height: '26px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '11.5px',
                          padding: '0 8px',
                          outline: 'none',
                        }}
                      >
                        {resultColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['bar', 'line', 'area'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        style={{
                          height: '26px',
                          padding: '0 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                          background: chartType === type ? 'var(--btn-bg)' : 'transparent',
                          color: chartType === type ? 'var(--accent-primary)' : 'var(--text-muted)',
                          border: `1px solid ${chartType === type ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                        }}
                      >
                        {type} Chart
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Visualizer */}
                {!chartData || chartData.items.length === 0 ? (
                  <div
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '12.5px',
                    }}
                  >
                    Select an X category column and numeric Y column to generate a chart.
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      position: 'relative',
                    }}
                  >
                    {/* KPI Highlights */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Sum</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {chartData.sumValue.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>
                          {chartData.avgValue.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Maximum</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                          {chartData.maxValue.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Observations</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {chartData.items.length}
                        </div>
                      </div>
                    </div>

                    {/* SVG Chart */}
                    <div style={{ width: '100%', height: '280px', position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox="0 0 800 240" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
                          </linearGradient>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                          const yPos = 200 - ratio * 170;
                          return (
                            <g key={i}>
                              <line x1="0" y1={yPos} x2="800" y2={yPos} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                              <text x="5" y={yPos - 4} fill="var(--text-muted)" fontSize="9.5" fontFamily="monospace">
                                {Math.round(chartData.maxValue * ratio).toLocaleString()}
                              </text>
                            </g>
                          );
                        })}

                        {/* Render Bar Chart */}
                        {chartType === 'bar' &&
                          chartData.items.map((item, idx) => {
                            const barWidth = Math.min(60, 680 / chartData.items.length - 12);
                            const xStep = 760 / chartData.items.length;
                            const xPos = 40 + idx * xStep + (xStep - barWidth) / 2;
                            const barHeight = Math.max(4, (item.value / chartData.maxValue) * 170);
                            const yPos = 200 - barHeight;

                            return (
                              <g key={idx}>
                                <rect
                                  x={xPos}
                                  y={yPos}
                                  width={barWidth}
                                  height={barHeight}
                                  rx="3"
                                  fill="url(#barGrad)"
                                  style={{ transition: 'all 0.3s ease' }}
                                >
                                  <title>{`${item.label}: ${item.value.toLocaleString()}`}</title>
                                </rect>
                                <text
                                  x={xPos + barWidth / 2}
                                  y="220"
                                  fill="var(--text-secondary)"
                                  fontSize="10"
                                  textAnchor="middle"
                                  fontFamily="monospace"
                                >
                                  {item.label.length > 12 ? `${item.label.slice(0, 10)}...` : item.label}
                                </text>
                              </g>
                            );
                          })}

                        {/* Render Line / Area Chart */}
                        {(chartType === 'line' || chartType === 'area') && (
                          <>
                            {chartType === 'area' && (
                              <polygon
                                points={`40,200 ${chartData.items
                                  .map((item, idx) => {
                                    const xStep = 720 / Math.max(chartData.items.length - 1, 1);
                                    const x = 40 + idx * xStep;
                                    const y = 200 - (item.value / chartData.maxValue) * 170;
                                    return `${x},${y}`;
                                  })
                                  .join(' ')} ${40 + (chartData.items.length - 1) * (720 / Math.max(chartData.items.length - 1, 1))},200`}
                                fill="url(#areaGrad)"
                              />
                            )}

                            <polyline
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2.5"
                              points={chartData.items
                                .map((item, idx) => {
                                  const xStep = 720 / Math.max(chartData.items.length - 1, 1);
                                  const x = 40 + idx * xStep;
                                  const y = 200 - (item.value / chartData.maxValue) * 170;
                                  return `${x},${y}`;
                                })
                                .join(' ')}
                            />

                            {chartData.items.map((item, idx) => {
                              const xStep = 720 / Math.max(chartData.items.length - 1, 1);
                              const x = 40 + idx * xStep;
                              const y = 200 - (item.value / chartData.maxValue) * 170;
                              return (
                                <g key={idx}>
                                  <circle cx={x} cy={y} r="4" fill="#38bdf8" stroke="var(--bg-card)" strokeWidth="2">
                                    <title>{`${item.label}: ${item.value.toLocaleString()}`}</title>
                                  </circle>
                                  <text x={x} y="220" fill="var(--text-secondary)" fontSize="10" textAnchor="middle" fontFamily="monospace">
                                    {item.label.length > 10 ? `${item.label.slice(0, 8)}..` : item.label}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        )}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AI SQL ARCHITECT */}
          {activeTab === 'ai' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sparkles size={16} color="var(--accent-primary)" />
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      AI SQL Architect & Query Generator
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    Synthesize complex queries from natural language, optimize execution bottlenecks, and discover indexing recommendations.
                  </p>
                </div>

                {/* Natural Language Prompt Input */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe what data you want (e.g. 'Show total sales by product with employee and department names')..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAiAction('generate');
                      }}
                      style={{
                        flex: 1,
                        height: '34px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0 12px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleAiAction('generate')}
                      disabled={aiLoading}
                      className="btn-primary"
                      style={{ height: '34px', padding: '0 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Sparkles size={13} />
                      <span>{aiLoading ? 'Generating...' : 'Generate SQL'}</span>
                    </button>
                  </div>

                  {/* Prompt Idea Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Try:</span>
                    {[
                      'Top 5 sales by revenue',
                      'Average salary by department',
                      'Customers by deal count',
                      'Products with low stock',
                    ].map((sample, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setAiPrompt(sample);
                          handleAiAction('generate', sample);
                        }}
                        style={{
                          fontSize: '10.5px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '12px',
                          color: 'var(--text-secondary)',
                          padding: '2px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Status / Index message */}
                {indexCreationStatus && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(52, 211, 153, 0.1)',
                      border: '1px solid var(--success)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#a7f3d0',
                      fontSize: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    {indexCreationStatus}
                  </div>
                )}

                {/* AI Result Card */}
                {aiResult && (
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {/* Generated SQL Block */}
                    {aiResult.sql && (
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                            Generated SQL Statement
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                if (aiResult.sql) setQuery(aiResult.sql);
                              }}
                              className="btn-secondary"
                              style={{ height: '22px', fontSize: '10.5px', padding: '0 8px' }}
                            >
                              Insert in Editor
                            </button>
                            <button
                              onClick={() => {
                                if (aiResult.sql) {
                                  setQuery(aiResult.sql);
                                  handleExecute(aiResult.sql);
                                  setActiveTab('results');
                                }
                              }}
                              className="btn-primary"
                              style={{ height: '22px', fontSize: '10.5px', padding: '0 8px' }}
                            >
                              Run Immediately
                            </button>
                          </div>
                        </div>
                        <pre
                          style={{
                            background: '#070b14',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: '#38bdf8',
                            overflowX: 'auto',
                            margin: 0,
                          }}
                        >
                          {aiResult.sql}
                        </pre>
                      </div>
                    )}

                    {/* Explanation */}
                    {aiResult.explanation && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                          Architectural Logic:
                        </strong>
                        {aiResult.explanation}
                      </div>
                    )}

                    {/* Suggested Indexes */}
                    {aiResult.suggestedIndexes && aiResult.suggestedIndexes.length > 0 && (
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                          Recommended Covering Indexes
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {aiResult.suggestedIndexes.map((idxSql, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '6px 10px',
                              }}
                            >
                              <code style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                {idxSql}
                              </code>
                              <button
                                onClick={() => handleRunSuggestedIndex(idxSql)}
                                className="btn-secondary"
                                style={{ height: '22px', fontSize: '10.5px', padding: '0 8px', whiteSpace: 'nowrap' }}
                              >
                                Apply Index
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Performance Insights */}
                    {aiResult.insights && aiResult.insights.length > 0 && (
                      <div
                        style={{
                          background: 'rgba(56, 189, 248, 0.04)',
                          border: '1px solid rgba(56, 189, 248, 0.15)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                        }}
                      >
                        <strong style={{ fontSize: '11px', color: 'var(--accent-primary)', display: 'block', marginBottom: '4px' }}>
                          Database Best Practices:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {aiResult.insights.map((ins, i) => (
                            <li key={i} style={{ marginBottom: '2px' }}>
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Send to Universal Co-pilot Option */}
                {onAskAi && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 14px',
                      background: 'var(--bg-card)',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Need Multi-Step Pipeline or Data Migration?
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Send this database context and active query directly to the Universal AI Co-Pilot chat.
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        onAskAi(
                          `Please assist me with this SQLite query and database schema:\n\nActive Query:\n${query}\n\nSchema Tables: ${(
                            schema?.tables || []
                          ).join(', ')}`
                        )
                      }
                      className="btn-secondary"
                      style={{ height: '28px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Open Co-Pilot Chat</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
