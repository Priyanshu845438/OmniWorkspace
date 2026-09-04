import React, { useState, useRef, useMemo } from 'react';
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
  TrendingUp,
  Table,
  Plus,
  Trash2,
  Search,
  Zap,
  FileSpreadsheet,
  Layers,
  FileText,
  Activity,
} from 'lucide-react';

// Pre-packaged Enterprise Sample Datasets
const SAMPLE_DATASETS: Record<
  string,
  { name: string; description: string; rows: Record<string, any>[] }
> = {
  departments: {
    name: '🏢 Department Budgets & Headcount',
    description: 'Enterprise operational budgets, staffing, and YoY expansion metrics',
    rows: [
      { Department: 'Engineering', Budget: 2850000, Headcount: 48, Growth: 32, CostPerHead: 59375 },
      { Department: 'Research & AI', Budget: 2100000, Headcount: 24, Growth: 58, CostPerHead: 87500 },
      { Department: 'Product Design', Budget: 950000, Headcount: 15, Growth: 18, CostPerHead: 63333 },
      { Department: 'Growth Marketing', Budget: 820000, Headcount: 14, Growth: 26, CostPerHead: 58571 },
      { Department: 'DevOps & Cloud Sec', Budget: 1350000, Headcount: 18, Growth: 42, CostPerHead: 75000 },
      { Department: 'Customer Success', Budget: 680000, Headcount: 12, Growth: 20, CostPerHead: 56666 },
      { Department: 'Legal & IP', Budget: 480000, Headcount: 6, Growth: 10, CostPerHead: 80000 },
      { Department: 'People & Talent', Budget: 420000, Headcount: 7, Growth: 14, CostPerHead: 60000 },
    ],
  },
  saas: {
    name: '📈 SaaS Revenue & Retention',
    description: 'Monthly recurring revenue, churn rate, customer acquisition cost, and LTV',
    rows: [
      { Month: 'Jan 2026', MRR: 120000, NewARR: 45000, ChurnRate: 2.1, CAC: 420, LTV: 5200 },
      { Month: 'Feb 2026', MRR: 135000, NewARR: 52000, ChurnRate: 1.9, CAC: 390, LTV: 5600 },
      { Month: 'Mar 2026', MRR: 154000, NewARR: 61000, ChurnRate: 1.7, CAC: 375, LTV: 6100 },
      { Month: 'Apr 2026', MRR: 178000, NewARR: 74000, ChurnRate: 1.5, CAC: 360, LTV: 6800 },
      { Month: 'May 2026', MRR: 205000, NewARR: 88000, ChurnRate: 1.4, CAC: 340, LTV: 7400 },
      { Month: 'Jun 2026', MRR: 238000, NewARR: 102000, ChurnRate: 1.2, CAC: 320, LTV: 8200 },
    ],
  },
  ecommerce: {
    name: '🛒 Global Sales & Margin',
    description: 'Retail performance by region, product category, unit volume, and profitability',
    rows: [
      { Region: 'North America', Category: 'Electronics', Sales: 620000, Profit: 155000, Units: 4200, Margin: 25.0 },
      { Region: 'North America', Category: 'Apparel', Sales: 340000, Profit: 102000, Units: 8500, Margin: 30.0 },
      { Region: 'Europe', Category: 'Electronics', Sales: 480000, Profit: 115200, Units: 3300, Margin: 24.0 },
      { Region: 'Europe', Category: 'Apparel', Sales: 290000, Profit: 92800, Units: 7100, Margin: 32.0 },
      { Region: 'Asia Pacific', Category: 'Electronics', Sales: 750000, Profit: 165000, Units: 5600, Margin: 22.0 },
      { Region: 'Asia Pacific', Category: 'Apparel', Sales: 410000, Profit: 139400, Units: 11200, Margin: 34.0 },
      { Region: 'Latin America', Category: 'Electronics', Sales: 210000, Profit: 46200, Units: 1500, Margin: 22.0 },
      { Region: 'Latin America', Category: 'Apparel', Sales: 180000, Profit: 57600, Units: 4400, Margin: 32.0 },
    ],
  },
  llm_benchmarks: {
    name: '🤖 AI Model Benchmark Matrix',
    description: 'Evaluation leaderboard across context windows, MMLU score, latency, and token pricing',
    rows: [
      { Model: 'Nemotron 3 Ultra 550B', ContextK: 128, MMLU: 89.4, LatencyMs: 420, PricePerM: 1.2 },
      { Model: 'Qwen 2.5 Coder 32B', ContextK: 128, MMLU: 85.2, LatencyMs: 180, PricePerM: 0.3 },
      { Model: 'Gemini 1.5 Pro', ContextK: 1000, MMLU: 86.8, LatencyMs: 340, PricePerM: 1.25 },
      { Model: 'Claude 3.5 Sonnet', ContextK: 200, MMLU: 88.7, LatencyMs: 290, PricePerM: 3.0 },
      { Model: 'GPT-4o', ContextK: 128, MMLU: 88.2, LatencyMs: 270, PricePerM: 2.5 },
      { Model: 'DeepSeek V3', ContextK: 64, MMLU: 88.5, LatencyMs: 210, PricePerM: 0.27 },
      { Model: 'Llama 3.3 70B', ContextK: 128, MMLU: 86.1, LatencyMs: 230, PricePerM: 0.4 },
    ],
  },
};

type ChartType = 'bar' | 'horizontal_bar' | 'line' | 'pie' | 'scatter' | 'histogram';
type AggFunc = 'sum' | 'avg' | 'count' | 'max' | 'min';

interface FilterCondition {
  id: string;
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  value: string;
}

interface DataViewProps {
  onAskAi?: (prompt: string) => void;
}

export const DataView: React.FC<DataViewProps> = ({ onAskAi }) => {
  // Active Dataset State
  const [datasetKey, setDatasetKey] = useState<string>('departments');
  const [rows, setRows] = useState<Record<string, any>[]>(SAMPLE_DATASETS.departments.rows);
  const [datasetTitle, setDatasetTitle] = useState<string>(SAMPLE_DATASETS.departments.name);

  // Visualization Setup
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>('');
  const [yAxisCol, setYAxisCol] = useState<string>('');
  const [secondaryMetricCol, setSecondaryMetricCol] = useState<string>('');
  const [aggFunc, setAggFunc] = useState<AggFunc>('sum');

  // Sorting & Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Multi-Filter Builder
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  // Modals & Panels
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [rawTextInput, setRawTextInput] = useState('');
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColFormula, setNewColFormula] = useState('');

  // AI Insights State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisReport, setAiAnalysisReport] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'eda' | 'correlation'>('chart');

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Columns & Types derivation
  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const columnTypes = useMemo(() => {
    const types: Record<string, 'number' | 'string'> = {};
    columns.forEach((col) => {
      const nonNullRow = rows.find((r) => r[col] !== undefined && r[col] !== null && r[col] !== '');
      if (nonNullRow && typeof nonNullRow[col] === 'number') {
        types[col] = 'number';
      } else {
        types[col] = 'string';
      }
    });
    return types;
  }, [columns, rows]);

  const numericColumns = useMemo(() => {
    return columns.filter((c) => columnTypes[c] === 'number');
  }, [columns, columnTypes]);

  const stringColumns = useMemo(() => {
    return columns.filter((c) => columnTypes[c] === 'string');
  }, [columns, columnTypes]);

  // Set default axes when dataset changes
  React.useEffect(() => {
    if (stringColumns.length > 0 && !xAxisCol) {
      setXAxisCol(stringColumns[0]);
    } else if (columns.length > 0 && !xAxisCol) {
      setXAxisCol(columns[0]);
    }
    if (numericColumns.length > 0 && !yAxisCol) {
      setYAxisCol(numericColumns[0]);
      setSortCol(numericColumns[0]);
    }
  }, [columns, stringColumns, numericColumns, xAxisCol, yAxisCol]);

  // Handle Switch Dataset
  const handleSelectSample = (key: string) => {
    const d = SAMPLE_DATASETS[key];
    if (d) {
      setDatasetKey(key);
      setRows(d.rows);
      setDatasetTitle(d.name);
      setFilters([]);
      setSearchQuery('');
      setAiAnalysisReport(null);
      const cols = Object.keys(d.rows[0]);
      const strCols = cols.filter((c) => typeof d.rows[0][c] === 'string');
      const numCols = cols.filter((c) => typeof d.rows[0][c] === 'number');
      setXAxisCol(strCols[0] || cols[0]);
      setYAxisCol(numCols[0] || cols[1] || cols[0]);
      setSortCol(numCols[0] || cols[0]);
    }
  };

  // Filter & Search Logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = Object.values(row).some((val) =>
          String(val).toLowerCase().includes(q)
        );
        if (!matches) return false;
      }

      // Filter Conditions
      for (const f of filters) {
        if (!f.column || !f.value.trim()) continue;
        const cellVal = row[f.column];
        const isNum = columnTypes[f.column] === 'number';

        if (isNum) {
          const numCell = Number(cellVal);
          const numTarget = Number(f.value);
          if (isNaN(numTarget)) continue;

          if (f.operator === '=' && numCell !== numTarget) return false;
          if (f.operator === '!=' && numCell === numTarget) return false;
          if (f.operator === '>' && numCell <= numTarget) return false;
          if (f.operator === '<' && numCell >= numTarget) return false;
          if (f.operator === '>=' && numCell < numTarget) return false;
          if (f.operator === '<=' && numCell > numTarget) return false;
        } else {
          const strCell = String(cellVal || '').toLowerCase();
          const strTarget = f.value.toLowerCase();
          if (f.operator === '=' && strCell !== strTarget) return false;
          if (f.operator === '!=' && strCell === strTarget) return false;
          if (f.operator === 'contains' && !strCell.includes(strTarget)) return false;
        }
      }
      return true;
    });
  }, [rows, searchQuery, filters, columnTypes]);

  // Sort Logic
  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const vA = a[sortCol];
      const vB = b[sortCol];
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortDirection === 'asc' ? vA - vB : vB - vA;
      }
      return sortDirection === 'asc'
        ? String(vA || '').localeCompare(String(vB || ''))
        : String(vB || '').localeCompare(String(vA || ''));
    });
  }, [filteredRows, sortCol, sortDirection]);

  // Toggle Column Sort
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDirection('desc');
    }
  };

  // Group By & Aggregation for Visualizations
  const chartData = useMemo(() => {
    if (!xAxisCol || !yAxisCol || filteredRows.length === 0) return [];

    const grouped: Record<string, { label: string; values: number[]; secondaryValues: number[] }> = {};

    filteredRows.forEach((r) => {
      const key = String(r[xAxisCol] ?? 'Unknown');
      if (!grouped[key]) {
        grouped[key] = { label: key, values: [], secondaryValues: [] };
      }
      const val = Number(r[yAxisCol]);
      if (!isNaN(val)) grouped[key].values.push(val);

      if (secondaryMetricCol) {
        const secVal = Number(r[secondaryMetricCol]);
        if (!isNaN(secVal)) grouped[key].secondaryValues.push(secVal);
      }
    });

    return Object.values(grouped).map((g) => {
      let aggregatedValue = 0;
      if (g.values.length > 0) {
        if (aggFunc === 'sum') aggregatedValue = g.values.reduce((a, b) => a + b, 0);
        else if (aggFunc === 'avg') aggregatedValue = g.values.reduce((a, b) => a + b, 0) / g.values.length;
        else if (aggFunc === 'max') aggregatedValue = Math.max(...g.values);
        else if (aggFunc === 'min') aggregatedValue = Math.min(...g.values);
        else if (aggFunc === 'count') aggregatedValue = g.values.length;
      }

      let secVal = 0;
      if (g.secondaryValues.length > 0) {
        secVal = g.secondaryValues.reduce((a, b) => a + b, 0) / g.secondaryValues.length;
      }

      return {
        label: g.label,
        value: aggregatedValue,
        secondaryValue: secVal,
        count: g.values.length,
      };
    });
  }, [filteredRows, xAxisCol, yAxisCol, secondaryMetricCol, aggFunc]);

  // Compute Comprehensive Exploratory Statistics (EDA)
  const computeColumnStats = (col: string) => {
    const vals = filteredRows.map((r) => Number(r[col])).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    if (vals.length === 0) return null;

    const n = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const min = vals[0];
    const max = vals[n - 1];

    // Median
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;

    // Quartiles & IQR
    const q1 = vals[Math.floor(n * 0.25)] || min;
    const q3 = vals[Math.floor(n * 0.75)] || max;
    const iqr = q3 - q1;

    // Variance & StdDev
    const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Skewness
    const m3 = vals.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / n;
    const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;

    return { n, sum, mean, median, min, max, q1, q3, iqr, variance, stdDev, skewness };
  };

  const activeStats = useMemo(() => {
    if (!yAxisCol) return null;
    return computeColumnStats(yAxisCol);
  }, [yAxisCol, filteredRows]);

  // Pearson Correlation Matrix calculation
  const correlationMatrix = useMemo(() => {
    if (numericColumns.length < 2 || filteredRows.length < 3) return null;

    const matrix: Record<string, Record<string, number>> = {};

    numericColumns.forEach((colA) => {
      matrix[colA] = {};
      const valsA = filteredRows.map((r) => Number(r[colA]) || 0);
      const meanA = valsA.reduce((a, b) => a + b, 0) / valsA.length;

      numericColumns.forEach((colB) => {
        if (colA === colB) {
          matrix[colA][colB] = 1.0;
          return;
        }
        const valsB = filteredRows.map((r) => Number(r[colB]) || 0);
        const meanB = valsB.reduce((a, b) => a + b, 0) / valsB.length;

        let num = 0;
        let denA = 0;
        let denB = 0;

        for (let i = 0; i < filteredRows.length; i++) {
          const diffA = valsA[i] - meanA;
          const diffB = valsB[i] - meanB;
          num += diffA * diffB;
          denA += diffA * diffA;
          denB += diffB * diffB;
        }

        const denom = Math.sqrt(denA * denB);
        matrix[colA][colB] = denom === 0 ? 0 : Number((num / denom).toFixed(3));
      });
    });

    return matrix;
  }, [numericColumns, filteredRows]);

  // Detect Outliers using Z-Score (Z > 2.0)
  const detectedOutliers = useMemo(() => {
    if (!yAxisCol || !activeStats || activeStats.stdDev === 0) return [];
    return filteredRows
      .map((r, idx) => {
        const val = Number(r[yAxisCol]);
        const zScore = (val - activeStats.mean) / activeStats.stdDev;
        return { row: r, val, zScore, idx };
      })
      .filter((o) => Math.abs(o.zScore) >= 1.8)
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }, [filteredRows, yAxisCol, activeStats]);

  // Add Dynamic Calculated Field
  const handleAddCalculatedField = () => {
    if (!newColName.trim() || !newColFormula.trim()) return;
    const colName = newColName.trim();
    try {
      // Evaluate formula: e.g. "Budget / Headcount"
      const updated = rows.map((r) => {
        let evaluated = 0;
        try {
          let expr = newColFormula;
          columns.forEach((c) => {
            const regex = new RegExp(`\\b${c}\\b`, 'g');
            expr = expr.replace(regex, String(Number(r[c]) || 0));
          });
          // Only allow digits, basic math operators, parentheses, and spaces
          const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
          if (sanitized.trim()) {
            evaluated = Number(new Function(`"use strict"; return (${sanitized});`)()) || 0;
          }
        } catch {
          evaluated = 0;
        }
        return { ...r, [colName]: Math.round(evaluated * 100) / 100 };
      });

      setRows(updated);
      setShowAddColumnModal(false);
      setNewColName('');
      setNewColFormula('');
      setYAxisCol(colName);
    } catch {
      alert('Invalid formula expression. Example format: Budget / Headcount');
    }
  };

  // CSV / JSON File Ingestion
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRows(parsed);
            setDatasetTitle(file.name);
            setDatasetKey('custom');
          }
        } catch {
          alert('Invalid JSON file format');
        }
      } else {
        // Parse CSV/TSV
        parseRawDelimited(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const parseRawDelimited = (raw: string, title = 'Imported Dataset') => {
    const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;

    // Detect delimiter
    const headerLine = lines[0];
    const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';

    const parseLine = (line: string) => {
      const res: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === delimiter && !inQuotes) {
          res.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      res.push(cur.trim());
      return res;
    };

    const headers = parseLine(lines[0]);
    const parsedRows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        const rawVal = vals[idx];
        const num = Number(rawVal);
        rowObj[h] = !isNaN(num) && rawVal !== '' ? num : rawVal;
      });
      parsedRows.push(rowObj);
    }

    if (parsedRows.length > 0) {
      setRows(parsedRows);
      setDatasetTitle(title);
      setDatasetKey('custom');
      setShowUploadModal(false);
      setRawTextInput('');
    }
  };

  // Run AI Executive Data Science Analysis
  const handleRunAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setAiAnalysisReport(null);

    const statsPayload: Record<string, any> = {};
    numericColumns.forEach((col) => {
      const s = computeColumnStats(col);
      if (s) {
        statsPayload[col] = {
          mean: s.mean,
          median: s.median,
          min: s.min,
          max: s.max,
          stdDev: s.stdDev,
        };
      }
    });

    try {
      const res = await fetch('/api/data/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: datasetTitle,
          rowCount: filteredRows.length,
          columns,
          stats: statsPayload,
          sampleRows: filteredRows.slice(0, 5),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Analysis failed');
      setAiAnalysisReport(data.analysis);
    } catch (err: any) {
      alert(`AI Analysis error: ${err.message}`);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Exporters
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.current);
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni-chart-${chartType}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;
    const csvContent =
      columns.join(',') +
      '\n' +
      filteredRows
        .map((r) =>
          columns
            .map((c) => (typeof r[c] === 'string' ? `"${r[c]}"` : r[c] ?? ''))
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdownReport = () => {
    if (!activeStats) return;
    const md = `# 📊 Quantitative Data Report: ${datasetTitle}
*Generated on ${new Date().toLocaleString()} by OmniWorkspace Data Analytics Studio*

---

## 📈 Executive Key Metrics for "${yAxisCol}"
| Metric | Value |
| :--- | :--- |
| **Total Observations** | ${activeStats.n} rows |
| **Sum** | ${activeStats.sum.toLocaleString()} |
| **Mean (Average)** | ${activeStats.mean.toLocaleString()} |
| **Median (P50)** | ${activeStats.median.toLocaleString()} |
| **Min - Max Range** | [${activeStats.min.toLocaleString()} to ${activeStats.max.toLocaleString()}] |
| **Standard Deviation (σ)** | ±${Math.round(activeStats.stdDev).toLocaleString()} |
| **Interquartile Range (IQR)** | ${Math.round(activeStats.iqr).toLocaleString()} |
| **Skewness Coefficient** | ${activeStats.skewness.toFixed(3)} |

---

## 🔬 Detected Variance Anomalies (Z-Score > 1.8)
${
  detectedOutliers.length === 0
    ? '*No extreme statistical outliers detected.*'
    : detectedOutliers
        .map(
          (o) =>
            `- Observation #${o.idx + 1} (${o.row[xAxisCol]}): **${o.val.toLocaleString()}** (Z-Score: ${o.zScore.toFixed(2)})`
        )
        .join('\n')
}

---

## 💡 AI Findings
${aiAnalysisReport || '*Click "AI Data Report" in OmniWorkspace to synthesize deep qualitative findings.*'}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_report_${datasetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '60px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={12} /> Universal Data Studio 2.0
            </span>
            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} /> Multi-Vector EDA
            </span>
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> AI Quantitative Scientist
            </span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, color: '#f8fafc' }}>
            Data Analytics & Visualization Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            Dynamic multi-format data modeling, high-precision SVG chart studio, Pearson correlation matrix, anomaly detection, and automated AI data science reporting.
          </p>
        </div>

        {/* Global Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={handleRunAiAnalysis}
            disabled={isAiAnalyzing}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={14} />
            <span>{isAiAnalyzing ? 'Analyzing with AI...' : 'AI Data Report'}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowUploadModal(true)}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={14} />
            <span>Load Data</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleExportCsv}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleExportSvg}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} color="var(--accent-primary)" />
            <span>Export SVG</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleExportMarkdownReport}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={14} />
            <span>Report (.md)</span>
          </button>
        </div>
      </div>

      {/* Dataset Switcher & Quick Samples */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            PRESET DATASETS:
          </span>
          {Object.entries(SAMPLE_DATASETS).map(([key, sample]) => (
            <button
              key={key}
              onClick={() => handleSelectSample(key)}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: datasetKey === key ? '700' : '500',
                cursor: 'pointer',
                border: datasetKey === key ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                background: datasetKey === key ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-primary)',
                color: datasetKey === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              {sample.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span><strong>{filteredRows.length}</strong> / {rows.length} rows</span>
          <span>•</span>
          <span><strong>{columns.length}</strong> attributes</span>
        </div>
      </div>

      {/* AI Data Science Report Drawer / Banner (When triggered) */}
      {aiAnalysisReport && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 32px rgba(56, 189, 248, 0.12)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                Executive AI Data Science Synthesis: {datasetTitle}
              </h3>
            </div>
            <button
              onClick={() => setAiAnalysisReport(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.7',
              color: '#cbd5e1',
              whiteSpace: 'pre-wrap',
              background: 'var(--bg-primary)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {aiAnalysisReport}
          </div>

          {onAskAi && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                onClick={() =>
                  onAskAi(
                    `Discuss deeper quantitative strategies and optimizations based on this dataset analysis:\n\n${aiAnalysisReport}`
                  )
                }
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Zap size={14} />
                <span>Discuss Deeply with AI Co-Pilot</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* KPI Metric Strip for Active Y-Axis Column */}
      {activeStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { label: 'TOTAL SUM', val: activeStats.sum.toLocaleString() },
            { label: 'MEAN AVERAGE', val: Math.round(activeStats.mean).toLocaleString() },
            { label: 'MEDIAN (P50)', val: Math.round(activeStats.median).toLocaleString() },
            { label: 'STD DEV (σ)', val: `±${Math.round(activeStats.stdDev).toLocaleString()}` },
            { label: 'MIN — MAX', val: `${activeStats.min.toLocaleString()} - ${activeStats.max.toLocaleString()}` },
            { label: 'OUTLIERS (Z>1.8)', val: `${detectedOutliers.length} detected` },
          ].map((kpi, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                {kpi.label} ({yAxisCol})
              </span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                {kpi.val}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Visual Configuration & Navigation Tabs */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Main Navigation Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'chart', label: 'Interactive Charts', icon: BarChart3 },
              { id: 'table', label: 'Data Table & Grid', icon: Table },
              { id: 'eda', label: 'Statistical Summary (EDA)', icon: Activity },
              { id: 'correlation', label: 'Correlation Matrix', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12.5px',
                    fontWeight: active ? '700' : '500',
                    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    background: active ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-primary)',
                    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Add Custom Calculated Column */}
          <button
            className="btn-secondary"
            onClick={() => setShowAddColumnModal(true)}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Add Calculated Field</span>
          </button>
        </div>

        {/* Chart Configuration Bar (When on Chart tab) */}
        {activeTab === 'chart' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {/* Chart Type Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>CHART TYPE:</span>
              {[
                { id: 'bar', label: 'Vertical Bar', icon: BarChart3 },
                { id: 'horizontal_bar', label: 'Horizontal Ranking', icon: BarChart3 },
                { id: 'line', label: 'Area / Spline', icon: LineChart },
                { id: 'pie', label: 'Donut', icon: PieIcon },
                { id: 'scatter', label: 'Scatter (X vs Y)', icon: Activity },
                { id: 'histogram', label: 'Histogram', icon: BarChart3 },
              ].map((c) => {
                const active = chartType === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setChartType(c.id as ChartType)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: active ? '700' : '500',
                      cursor: 'pointer',
                      border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: active ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-primary)',
                      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Axes & Aggregation Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* X Axis */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>X-AXIS:</span>
                <select
                  value={xAxisCol}
                  onChange={(e) => setXAxisCol(e.target.value)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '12px',
                    padding: '4px 8px',
                  }}
                >
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Y Axis */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Y-METRIC:</span>
                <select
                  value={yAxisCol}
                  onChange={(e) => setYAxisCol(e.target.value)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '12px',
                    padding: '4px 8px',
                  }}
                >
                  {numericColumns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 2nd Metric */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>2ND METRIC:</span>
                <select
                  value={secondaryMetricCol}
                  onChange={(e) => setSecondaryMetricCol(e.target.value)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '12px',
                    padding: '4px 8px',
                  }}
                >
                  <option value="">(None)</option>
                  {numericColumns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Aggregation Function */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>AGG:</span>
                <select
                  value={aggFunc}
                  onChange={(e) => setAggFunc(e.target.value as AggFunc)}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '12px',
                    padding: '4px 8px',
                  }}
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                  <option value="max">Max</option>
                  <option value="min">Min</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Global Filter & Search Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-primary)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Global Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search across all columns & rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '13px',
                width: '100%',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Add Filter Condition Button */}
          <button
            onClick={() =>
              setFilters([
                ...filters,
                { id: `f_${Date.now()}`, column: numericColumns[0] || columns[0], operator: '>', value: '' },
              ])
            }
            style={{
              fontSize: '11.5px',
              padding: '4px 10px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid var(--accent-primary)',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Filter size={12} />
            <span>Add Condition</span>
          </button>
        </div>

        {/* Active Filters List */}
        {filters.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filters.map((f, i) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Condition #{i + 1}:</span>
                <select
                  value={f.column}
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[i].column = e.target.value;
                    setFilters(updated);
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '11.5px',
                    padding: '2px 6px',
                  }}
                >
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={f.operator}
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[i].operator = e.target.value as any;
                    setFilters(updated);
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '11.5px',
                    padding: '2px 6px',
                  }}
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value="contains">contains</option>
                </select>

                <input
                  type="text"
                  placeholder="Target value..."
                  value={f.value}
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[i].value = e.target.value;
                    setFilters(updated);
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '11.5px',
                    padding: '2px 8px',
                    width: '120px',
                  }}
                />

                <button
                  onClick={() => setFilters(filters.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 'auto' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'chart' && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              {aggFunc.toUpperCase()} of {yAxisCol} by {xAxisCol}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Interactive SVG Canvas • {chartData.length} Bins
            </span>
          </div>

          {/* SVG Chart Canvas */}
          <div
            style={{
              width: '100%',
              minHeight: '380px',
              background: '#030712',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {chartData.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                No data points to render. Adjust filters or axes.
              </div>
            ) : chartType === 'bar' ? (
              // 1. VERTICAL BAR CHART
              <svg ref={svgRef} width="100%" height="360" viewBox="0 0 800 360">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 300 - ratio * 240;
                  return (
                    <g key={idx}>
                      <line x1="60" y1={y} x2="760" y2={y} stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 3" />
                      <text x="50" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                        {Math.round((Math.max(...chartData.map((d) => d.value), 1) * ratio)).toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {(() => {
                  const maxVal = Math.max(...chartData.map((d) => d.value), 1);
                  const availableWidth = 700;
                  const barWidth = Math.max(Math.min(availableWidth / chartData.length - 12, 60), 16);
                  const step = availableWidth / chartData.length;

                  return chartData.map((d, i) => {
                    const barHeight = Math.max((d.value / maxVal) * 240, 4);
                    const x = 70 + i * step + (step - barWidth) / 2;
                    const y = 300 - barHeight;

                    return (
                      <g key={i} className="group">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          fill="url(#barGradient)"
                          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                        />
                        {/* Value text above bar */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          fill="#f8fafc"
                          fontSize="10"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {d.value > 1000000 ? `${(d.value / 1000000).toFixed(1)}M` : d.value > 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
                        </text>
                        {/* X-axis label */}
                        <text
                          x={x + barWidth / 2}
                          y={320}
                          fill="#94a3b8"
                          fontSize="11"
                          textAnchor="middle"
                          transform={`rotate(-25, ${x + barWidth / 2}, 320)`}
                        >
                          {d.label.length > 12 ? d.label.slice(0, 10) + '..' : d.label}
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
            ) : chartType === 'horizontal_bar' ? (
              // 2. HORIZONTAL BAR CHART
              <svg ref={svgRef} width="100%" height={Math.max(chartData.length * 40 + 40, 360)} viewBox={`0 0 800 ${Math.max(chartData.length * 40 + 40, 360)}`}>
                <defs>
                  <linearGradient id="hBarGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                {(() => {
                  const maxVal = Math.max(...chartData.map((d) => d.value), 1);
                  return chartData.map((d, i) => {
                    const y = 30 + i * 40;
                    const w = Math.max((d.value / maxVal) * 520, 8);
                    return (
                      <g key={i}>
                        <text x="140" y={y + 16} fill="#cbd5e1" fontSize="11.5" textAnchor="end" fontWeight="500">
                          {d.label.length > 18 ? d.label.slice(0, 16) + '..' : d.label}
                        </text>
                        <rect x="150" y={y} width={w} height="22" rx="4" fill="url(#hBarGrad)" />
                        <text x={160 + w} y={y + 15} fill="#f8fafc" fontSize="11" fontWeight="700">
                          {d.value.toLocaleString()}
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
            ) : chartType === 'line' ? (
              // 3. SPLINE LINE & AREA CHART
              <svg ref={svgRef} width="100%" height="360" viewBox="0 0 800 360">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 300 - ratio * 240;
                  return (
                    <line key={idx} x1="60" y1={y} x2="760" y2={y} stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 3" />
                  );
                })}

                {(() => {
                  const maxVal = Math.max(...chartData.map((d) => d.value), 1);
                  const step = 680 / Math.max(chartData.length - 1, 1);
                  const points = chartData.map((d, i) => {
                    const x = 70 + i * step;
                    const y = 300 - (d.value / maxVal) * 240;
                    return { x, y, val: d.value, label: d.label };
                  });

                  const pathD = points.reduce((acc, p, i) => {
                    if (i === 0) return `M ${p.x} ${p.y}`;
                    const prev = points[i - 1];
                    const cx = (prev.x + p.x) / 2;
                    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
                  }, '');

                  const areaD = `${pathD} L ${points[points.length - 1].x} 300 L ${points[0].x} 300 Z`;

                  return (
                    <g>
                      <path d={areaD} fill="url(#areaGrad)" />
                      <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="3" />
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#030712" stroke="#38bdf8" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 10} fill="#f8fafc" fontSize="10" fontWeight="700" textAnchor="middle">
                            {p.val > 1000 ? `${(p.val / 1000).toFixed(1)}k` : p.val}
                          </text>
                          <text x={p.x} y="325" fill="#94a3b8" fontSize="11" textAnchor="middle">
                            {p.label}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            ) : chartType === 'pie' ? (
              // 4. DONUT CHART
              <svg ref={svgRef} width="100%" height="360" viewBox="0 0 800 360">
                {(() => {
                  const total = chartData.reduce((a, b) => a + b.value, 0);
                  if (total === 0) return null;

                  const cx = 300;
                  const cy = 180;
                  const radius = 120;
                  const innerRadius = 65;
                  const colors = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#a855f7'];

                  let currentAngle = 0;

                  return (
                    <g>
                      {chartData.map((d, i) => {
                        const sliceAngle = (d.value / total) * 2 * Math.PI;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + sliceAngle;
                        currentAngle = endAngle;

                        const x1 = cx + radius * Math.cos(startAngle);
                        const y1 = cy + radius * Math.sin(startAngle);
                        const x2 = cx + radius * Math.cos(endAngle);
                        const y2 = cy + radius * Math.sin(endAngle);

                        const ix1 = cx + innerRadius * Math.cos(endAngle);
                        const iy1 = cy + innerRadius * Math.sin(endAngle);
                        const ix2 = cx + innerRadius * Math.cos(startAngle);
                        const iy2 = cy + innerRadius * Math.sin(startAngle);

                        const largeArc = sliceAngle > Math.PI ? 1 : 0;
                        const pathD = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

                        const color = colors[i % colors.length];
                        const pct = ((d.value / total) * 100).toFixed(1);

                        return (
                          <path
                            key={i}
                            d={pathD}
                            fill={color}
                            stroke="#030712"
                            strokeWidth="2"
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                          >
                            <title>{`${d.label}: ${pct}% (${d.value.toLocaleString()})`}</title>
                          </path>
                        );
                      })}

                      {/* Center Label */}
                      <text x={cx} y={cy - 6} fill="#94a3b8" fontSize="11" textAnchor="middle">
                        TOTAL
                      </text>
                      <text x={cx} y={cy + 16} fill="#f8fafc" fontSize="16" fontWeight="800" textAnchor="middle">
                        {total > 1000000 ? `${(total / 1000000).toFixed(1)}M` : total.toLocaleString()}
                      </text>

                      {/* Legend on right */}
                      {chartData.slice(0, 7).map((d, i) => {
                        const color = colors[i % colors.length];
                        const pct = ((d.value / total) * 100).toFixed(1);
                        const ly = 80 + i * 28;
                        return (
                          <g key={i}>
                            <rect x="520" y={ly} width="14" height="14" rx="3" fill={color} />
                            <text x="545" y={ly + 11} fill="#e2e8f0" fontSize="12" fontWeight="500">
                              {d.label}: <strong>{pct}%</strong> ({d.value.toLocaleString()})
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            ) : chartType === 'scatter' ? (
              // 5. SCATTER CORRELATION PLOT
              <svg ref={svgRef} width="100%" height="360" viewBox="0 0 800 360">
                {(() => {
                  const secCol = numericColumns.find((c) => c !== yAxisCol) || yAxisCol;
                  const pts = filteredRows.map((r) => ({
                    xVal: Number(r[secCol]) || 0,
                    yVal: Number(r[yAxisCol]) || 0,
                    label: r[xAxisCol],
                  }));

                  const maxX = Math.max(...pts.map((p) => p.xVal), 1);
                  const maxY = Math.max(...pts.map((p) => p.yVal), 1);

                  return (
                    <g>
                      {/* Grid */}
                      <line x1="80" y1="300" x2="740" y2="300" stroke="#475569" strokeWidth="1.5" />
                      <line x1="80" y1="40" x2="80" y2="300" stroke="#475569" strokeWidth="1.5" />
                      <text x="410" y="340" fill="#94a3b8" fontSize="12" textAnchor="middle">{secCol}</text>
                      <text x="30" y="170" fill="#94a3b8" fontSize="12" textAnchor="middle" transform="rotate(-90, 30, 170)">{yAxisCol}</text>

                      {pts.map((p, i) => {
                        const cx = 80 + (p.xVal / maxX) * 640;
                        const cy = 300 - (p.yVal / maxY) * 240;
                        return (
                          <g key={i}>
                            <circle cx={cx} cy={cy} r="6" fill="#38bdf8" fillOpacity="0.8" stroke="#f8fafc" strokeWidth="1.5" />
                            <text x={cx} y={cy - 10} fill="#cbd5e1" fontSize="10" textAnchor="middle">
                              {p.label}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            ) : (
              // 6. METRIC HISTOGRAM
              <svg ref={svgRef} width="100%" height="360" viewBox="0 0 800 360">
                {(() => {
                  if (!activeStats) return null;
                  const numBins = 7;
                  const binSize = (activeStats.max - activeStats.min) / numBins || 1;
                  const bins: number[] = new Array(numBins).fill(0);

                  filteredRows.forEach((r) => {
                    const val = Number(r[yAxisCol]);
                    if (!isNaN(val)) {
                      const bIdx = Math.min(Math.floor((val - activeStats.min) / binSize), numBins - 1);
                      bins[bIdx]++;
                    }
                  });

                  const maxBinCount = Math.max(...bins, 1);
                  const step = 640 / numBins;

                  return (
                    <g>
                      {bins.map((count, i) => {
                        const h = (count / maxBinCount) * 220;
                        const x = 90 + i * step;
                        const y = 300 - h;
                        const low = Math.round(activeStats.min + i * binSize);
                        const high = Math.round(activeStats.min + (i + 1) * binSize);
                        return (
                          <g key={i}>
                            <rect x={x} y={y} width={step - 10} height={h} rx="4" fill="#38bdf8">
                              <title>{`Range [${low} - ${high}]: ${count} occurrences`}</title>
                            </rect>
                            <text x={x + (step - 10) / 2} y={y - 8} fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">
                              {count}
                            </text>
                            <text x={x + (step - 10) / 2} y="325" fill="#94a3b8" fontSize="10" textAnchor="middle">
                              {low > 1000 ? `${Math.round(low / 1000)}k` : low}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Table & Grid Tab */}
      {activeTab === 'table' && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
              Dataset Grid View ({sortedRows.length} Rows)
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Click column headers to sort Asc / Desc
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ padding: '12px', textAlign: 'center', width: '50px', color: 'var(--text-muted)' }}>#</th>
                  {columns.map((c) => (
                    <th
                      key={c}
                      onClick={() => handleSort(c)}
                      style={{
                        padding: '12px 16px',
                        textAlign: columnTypes[c] === 'number' ? 'right' : 'left',
                        cursor: 'pointer',
                        color: sortCol === c ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{c}</span>
                        {sortCol === c && (
                          <ArrowUpDown size={12} color="var(--accent-primary)" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {i + 1}
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c}
                        style={{
                          padding: '10px 16px',
                          textAlign: columnTypes[c] === 'number' ? 'right' : 'left',
                          color: columnTypes[c] === 'number' ? '#f8fafc' : 'var(--text-primary)',
                          fontFamily: columnTypes[c] === 'number' ? 'var(--font-mono)' : undefined,
                        }}
                      >
                        {typeof row[c] === 'number' ? row[c].toLocaleString() : String(row[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDA Statistical Tab */}
      {activeTab === 'eda' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '16px',
          }}
        >
          {numericColumns.map((col) => {
            const stats = computeColumnStats(col);
            if (!stats) return null;
            return (
              <div
                key={col}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-primary)', margin: 0 }}>
                    {col}
                  </h4>
                  <span className="badge badge-blue">Numeric Distribution</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mean:</span>
                    <strong style={{ color: '#f8fafc' }}>{Math.round(stats.mean).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Median (P50):</span>
                    <strong style={{ color: '#f8fafc' }}>{Math.round(stats.median).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Min Value:</span>
                    <strong style={{ color: '#f8fafc' }}>{stats.min.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Max Value:</span>
                    <strong style={{ color: '#f8fafc' }}>{stats.max.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Std Dev (σ):</span>
                    <strong style={{ color: '#f8fafc' }}>±{Math.round(stats.stdDev).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IQR (Q3-Q1):</span>
                    <strong style={{ color: '#f8fafc' }}>{Math.round(stats.iqr).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Skewness:</span>
                    <strong style={{ color: '#f8fafc' }}>{stats.skewness.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Observations:</span>
                    <strong style={{ color: '#f8fafc' }}>{stats.n}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Correlation Matrix Tab */}
      {activeTab === 'correlation' && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', margin: '0 0 4px 0' }}>
              Pearson Correlation Coefficient Matrix
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Evaluates linear dependence $r \in [-1, 1]$. Values close to +1 denote strong positive correlation; values near -1 denote inverse correlation.
            </p>
          </div>

          {correlationMatrix ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                      Metric
                    </th>
                    {numericColumns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '10px 14px',
                          textAlign: 'center',
                          color: 'var(--accent-primary)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {numericColumns.map((colA) => (
                    <tr key={colA} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '600', color: '#f8fafc' }}>{colA}</td>
                      {numericColumns.map((colB) => {
                        const val = correlationMatrix[colA]?.[colB] ?? 0;
                        const isHigh = Math.abs(val) > 0.6 && colA !== colB;
                        const isPositive = val > 0;
                        return (
                          <td
                            key={colB}
                            style={{
                              padding: '10px 14px',
                              textAlign: 'center',
                              fontWeight: '700',
                              color: colA === colB ? '#64748b' : isHigh ? (isPositive ? '#34d399' : '#f87171') : '#cbd5e1',
                              background: colA === colB ? 'transparent' : isHigh ? (isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'transparent',
                            }}
                          >
                            {colA === colB ? '1.00' : val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
              At least 2 numeric columns and 3 rows required to calculate correlation matrix.
            </div>
          )}
        </div>
      )}

      {/* Upload / Custom Data Modal */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            style={{
              background: '#0b1120',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '600px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                  Load Custom Dataset
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '30px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <FileSpreadsheet size={32} color="var(--accent-primary)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
                Click to upload CSV, TSV, or JSON
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports standard comma/tab/semicolon delimited files
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.json,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Or Paste Raw Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                OR PASTE RAW CSV / TSV / JSON TEXT:
              </span>
              <textarea
                rows={5}
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder="Product,Sales,Units,Profit&#10;Alpha,12000,45,3400&#10;Beta,18500,60,5200"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  color: '#f8fafc',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setShowUploadModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => parseRawDelimited(rawTextInput)}
                disabled={!rawTextInput.trim()}
              >
                Parse & Visualize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Calculated Field Modal */}
      {showAddColumnModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
          onClick={() => setShowAddColumnModal(false)}
        >
          <div
            style={{
              background: '#0b1120',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                  Create Calculated Column
                </h3>
              </div>
              <button
                onClick={() => setShowAddColumnModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                COLUMN NAME:
              </label>
              <input
                type="text"
                placeholder="e.g. ProfitPerUnit or MarginRatio"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                MATHEMATICAL FORMULA:
              </label>
              <input
                type="text"
                placeholder={`e.g. ${numericColumns[0] || 'MetricA'} / ${numericColumns[1] || 'MetricB'}`}
                value={newColFormula}
                onChange={(e) => setNewColFormula(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Available variables: {numericColumns.join(', ')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button className="btn-secondary" onClick={() => setShowAddColumnModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddCalculatedField}>
                Calculate & Append
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
