import React, { useState, useEffect } from 'react';
import {
  Code2,
  Globe2,
  Database,
  BarChart3,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  GitBranch,
  Terminal,
  MessageSquare,
  Key,
  RefreshCw,
  Play,
  Layers,
  FileCode,
  ChevronRight,
  Copy,
  Check,
  Brain,
} from 'lucide-react';

interface HomeViewProps {
  onSelectPerspective: (perspective: string) => void;
  onExecutePrompt: (prompt: string, agent?: string) => void;
  onOpenFile?: (filePath: string) => void;
  healthInfo?: any;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectPerspective,
  onExecutePrompt,
  onOpenFile,
  healthInfo,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'engineering' | 'intelligence' | 'data'>('all');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Fetch live workspace summary
  const fetchSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch('/api/home/summary');
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch {
      // fallback gracefully
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handlePromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;
    onExecutePrompt(promptInput.trim(), selectedAgent);
  };

  // Autonomous Workflows
  const autonomousWorkflows = [
    {
      id: 'security_audit',
      title: 'Full Codebase Security Audit',
      desc: 'Scan filesystem boundaries, verify path traversal shields, and check prompt injection filters.',
      agent: 'general',
      prompt: 'Perform a comprehensive security audit of our workspace. Verify PathShield boundary enforcement, inspect database access patterns, and confirm prompt injection defense rules.',
      tag: 'Security & Safety',
      badgeColor: '#10b981',
    },
    {
      id: 'arch_graph',
      title: 'Architecture & Dependency Mapping',
      desc: 'Analyze codebase modules, trace component linkages, and verify layered boundaries.',
      agent: 'general',
      prompt: 'Inspect our workspace architecture modules. Detail the interactions between client views, orchestration core, SQLite db, and registered tools.',
      tag: 'System Design',
      badgeColor: '#38bdf8',
    },
    {
      id: 'git_review',
      title: 'Git Working Tree Review & Commit',
      desc: 'Analyze unstaged/staged diffs, identify breaking changes, and craft a conventional commit message.',
      agent: 'coding',
      prompt: 'Inspect current git status and diffs. Summarize all modifications made across client and server, and prepare a concise commit message.',
      tag: 'Version Control',
      badgeColor: '#a855f7',
    },
    {
      id: 'sql_analysis',
      title: 'SQL Ledger & Revenue Optimization',
      desc: 'Query SQLite business tables, rank top sales representatives, and compute department totals.',
      agent: 'sql',
      prompt: 'Query our SQLite database tables to calculate total sales revenue by department and rank top 5 performing employees.',
      tag: 'Database & SQL',
      badgeColor: '#f59e0b',
    },
  ];

  // Specialized Workspaces Grid
  const workspaces = [
    {
      id: 'chat',
      title: 'AI Co-Pilot Chat',
      desc: 'Multi-threaded assistant with cross-session memory learning, code execution, and executive email formatting.',
      category: 'intelligence',
      icon: MessageSquare,
      badge: `${summaryData?.conversations?.count || 1} Threads`,
      subBadge: `${summaryData?.memories?.count || 1} Learned Rules`,
      prompt: 'Summarize the active capabilities of OmniWorkspace and explain how long-term memory learning works.',
      color: '#38bdf8',
    },
    {
      id: 'code',
      title: 'Software Engineering Studio',
      desc: 'Monaco code editor with surgical AST manipulation, project symbol navigation, and test automation.',
      category: 'engineering',
      icon: Code2,
      badge: 'Surgical AST',
      subBadge: 'Monaco Editor',
      prompt: 'Inspect the project architecture, review package dependencies, and run automated tests.',
      color: '#60a5fa',
    },
    {
      id: 'graph',
      title: 'Architecture Graph Explorer',
      desc: 'Interactive 2D graph visualizer tracing modules, tools, and cross-layer dependencies.',
      category: 'engineering',
      icon: Layers,
      badge: 'Interactive Nodes',
      subBadge: '7 System Layers',
      prompt: 'Generate and explain the interactive architecture dependency graph for this repository.',
      color: '#818cf8',
    },
    {
      id: 'research',
      title: 'Deep Web Research Engine',
      desc: 'Multi-source synthesis engine gathering real-time web intelligence with explicit citations.',
      category: 'intelligence',
      icon: Globe2,
      badge: 'Multi-Source Synthesis',
      subBadge: 'Fact-Checked',
      prompt: 'Research the latest advancements in open-source AI models and synthesize key takeaways.',
      color: '#34d399',
    },
    {
      id: 'sql',
      title: 'Database & SQL Studio',
      desc: 'Full-featured SQLite developer studio with visual schema explorer, query execution, and EXPLAIN plans.',
      category: 'data',
      icon: Database,
      badge: `${summaryData?.database?.tablesCount || 11} Tables Active`,
      subBadge: 'EXPLAIN Planner',
      prompt: 'Inspect database tables and find top performing employees by sales revenue.',
      color: '#fbbf24',
    },
    {
      id: 'data',
      title: 'Data Analytics & Charts',
      desc: 'CSV and JSON data analyzer with instant statistical calculations, outlier detection, and dynamic visual charts.',
      category: 'data',
      icon: BarChart3,
      badge: 'Dynamic Charts',
      subBadge: 'Stats Engine',
      prompt: 'Inspect employee compensation distribution and compute salary summary statistics.',
      color: '#f472b6',
    },
    {
      id: 'documents',
      title: 'Document Analyzer',
      desc: 'Deep document parser extracting outlines, technical specifications, and security policies from Markdown/TXT.',
      category: 'intelligence',
      icon: FileText,
      badge: 'Spec Parser',
      subBadge: 'Markdown / TXT',
      prompt: 'Summarize the core security policies and instruction boundaries defined in this project.',
      color: '#a78bfa',
    },
    {
      id: 'models',
      title: 'Model & Vault Registry',
      desc: 'Multi-provider model orchestrator with AES-256 BYOK credential vault and latency routing.',
      category: 'engineering',
      icon: Key,
      badge: `${summaryData?.models?.count || 19} Models Active`,
      subBadge: 'AES-256 Vault',
      prompt: 'List all active AI providers and check connection latency for configured models.',
      color: '#e879f9',
    },
  ];

  const filteredWorkspaces = workspaces.filter((w) => {
    if (activeCategoryFilter === 'all') return true;
    return w.category === activeCategoryFilter;
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 1. TOP LIVE COCKPIT HUD & TELEMETRY */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Workspace Path Pill */}
          <div
            onClick={() => copyToClipboard(summaryData?.workspace?.root || '/Users/acadify/Documents/AI Workspace', 'path')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
            title="Click to copy workspace root path"
          >
            <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>DIR:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>
              {summaryData?.workspace?.name || 'AI Workspace'}
            </span>
            {copiedItem === 'path' ? <Check size={11} color="#10b981" /> : <Copy size={11} color="var(--text-muted)" />}
          </div>

          {/* Git Status Pill */}
          <div
            onClick={() => onExecutePrompt('Inspect git diff and status summary', 'coding')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
            title="Click to inspect git diff"
          >
            <GitBranch size={12} color="#a855f7" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>
              {summaryData?.git?.branch || 'main'}
            </span>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: summaryData?.git?.isClean ? '#10b981' : '#f59e0b',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {summaryData?.git?.isClean ? 'Clean' : 'Modified'}
            </span>
          </div>

          {/* Security Guardrail */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: '#10b981',
            }}
          >
            <ShieldCheck size={12} />
            <span style={{ fontSize: '10.5px', fontWeight: '600' }}>Guarded (Level 0-4)</span>
          </div>

          {/* Tools Telemetry */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}
          >
            <Zap size={12} color="#38bdf8" />
            <span style={{ fontSize: '10.5px' }}>{healthInfo?.toolCount || 30} Tools Active</span>
          </div>
        </div>

        {/* Right HUD: Refresh & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            Core Server Online :3001
          </span>
          <button
            onClick={fetchSummary}
            disabled={isLoadingSummary}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '10.5px',
            }}
            title="Refresh workspace telemetry"
          >
            <RefreshCw size={11} className={isLoadingSummary ? 'spinning' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 2. OMNICOMMAND HERO & PROMPT LAUNCHER */}
      <div
        style={{
          background: 'radial-gradient(ellipse at 80% 0%, rgba(56, 189, 248, 0.08) 0%, rgba(17, 19, 26, 0.95) 70%)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--link-color)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
            <Sparkles size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            OmniWorkspace Cockpit
          </span>
          <span className="badge">Local-First Sandbox</span>
          <span className="badge">Continuous Memory Active</span>
        </div>

        <h1
          style={{
            fontSize: '26px',
            fontWeight: '800',
            letterSpacing: '-0.025em',
            marginBottom: '6px',
            color: 'var(--text-primary)',
          }}
        >
          Autonomous Intelligence & Engineering Studio
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            maxWidth: '820px',
            lineHeight: '1.5',
            marginBottom: '20px',
          }}
        >
          Orchestrate multi-model reasoning, surgical code refactoring, architecture diagrams, SQLite ledgers, and deep research from one unified workspace cockpit.
        </p>

        {/* Interactive Prompt Box */}
        <form onSubmit={handlePromptSubmit}>
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handlePromptSubmit();
                }
              }}
              placeholder="What do you want to build, audit, or analyze today? (e.g. 'Audit workspace security and explain our SQLite database architecture', or press ⌘K)"
              style={{
                width: '100%',
                minHeight: '60px',
                maxHeight: '180px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                resize: 'vertical',
                fontFamily: 'var(--font-sans)',
                lineHeight: '1.5',
              }}
            />

            {/* Bottom Controls inside prompt box */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
                gap: '8px',
              }}
            >
              {/* Agent Mode Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Agent Persona:</span>
                {[
                  { id: 'general', label: 'Architect' },
                  { id: 'coding', label: 'Coding' },
                  { id: 'research', label: 'Research' },
                  { id: 'sql', label: 'SQL Specialist' },
                  { id: 'data', label: 'Data Analyst' },
                ].map((ag) => (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() => setSelectedAgent(ag.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: selectedAgent === ag.id ? '600' : '400',
                      background: selectedAgent === ag.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selectedAgent === ag.id ? '#ffffff' : 'var(--text-secondary)',
                      border: `1px solid ${selectedAgent === ag.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {ag.label}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⌘+Enter to send</span>
                <button
                  type="submit"
                  disabled={!promptInput.trim()}
                  className="btn-primary"
                  style={{
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: promptInput.trim() ? 1 : 0.6,
                    cursor: promptInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Play size={12} fill="currentColor" />
                  <span>Execute Prompt</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Quick Action Suggestion Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Quick Actions:</span>
          {[
            { label: '🛡️ Audit Security Boundaries', prompt: 'Audit this workspace for prompt injection and path traversal vulnerabilities.' },
            { label: '🏛️ Review Architecture Graph', prompt: 'Inspect the system architecture graph and report circular dependencies.' },
            { label: '📊 Analyze SQLite Sales Ledger', prompt: 'Inspect our database tables and find top performing employees by sales revenue.' },
            { label: '🐙 Inspect Git Working Tree', prompt: 'Inspect our recent git status and summarize modified lines with draft commit.' },
            { label: '🌐 Synthesize AI Research Brief', prompt: 'Research the latest developments in local offline LLMs and compare Ollama vs DeepSeek.' },
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onExecutePrompt(chip.prompt)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '100px',
                padding: '3px 10px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. FOUR CORE SYSTEM METRIC CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        {/* Security Status Card */}
        <div
          onClick={() => onExecutePrompt('Perform a full security inspection of tool permissions and sandbox boundaries.')}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em' }}>SECURITY HARDENING</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: '600' }}>Active</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Guarded (Level 0-4)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
            PathShield sandboxing, AST parser checks, and prompt injection filters active.
          </div>
        </div>

        {/* Registered Tools Card */}
        <div
          onClick={() => onSelectPerspective('code')}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <Zap size={16} color="#38bdf8" />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em' }}>AUTONOMOUS TOOLSET</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#38bdf8', fontWeight: '600' }}>30 Tools</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {healthInfo?.toolCount || 30} Registered Tools
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
            Files, Surgical AST, Terminal, Git, Web Search, SQLite & Analytics.
          </div>
        </div>

        {/* Model Routing & Vault Card */}
        <div
          onClick={() => onSelectPerspective('models')}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#e879f9')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <Key size={16} color="#e879f9" />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em' }}>MODEL & VAULT</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#e879f9', fontWeight: '600' }}>AES-256</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {summaryData?.models?.count || 19} Models Configured
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
            NVIDIA NIM, DeepSeek R1, Claude 3.5, OpenAI & Local Ollama routing.
          </div>
        </div>

        {/* SQLite Database & Knowledge Card */}
        <div
          onClick={() => onSelectPerspective('sql')}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#fbbf24')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <Database size={16} color="#fbbf24" />
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em' }}>KNOWLEDGE & LEDGER</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#fbbf24', fontWeight: '600' }}>WAL Mode</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {summaryData?.database?.tablesCount || 11} SQLite Tables
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
            Persistent chat threads, learned user preferences, sales, employees, & audit events.
          </div>
        </div>
      </div>

      {/* 4. 1-CLICK AUTONOMOUS WORKFLOWS */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              High-Impact Autonomous Workflows
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
              Pre-configured multi-step workflows orchestrating tools, AST verification, and intelligence agents.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {autonomousWorkflows.map((flow) => (
            <div
              key={flow.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: flow.badgeColor,
                    }}
                  >
                    {flow.tag}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ready</span>
                </div>

                <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {flow.title}
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                  {flow.desc}
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => onExecutePrompt(flow.prompt, flow.agent)}
                style={{
                  marginTop: '14px',
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                }}
              >
                <span>Launch Workflow</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SPECIALIZED WORKSPACES COMMAND GRID */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Specialized Cockpit Workspaces
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
              Deep specialized environments tailored for software engineering, deep research, data, and SQL.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'all', label: 'All Workspaces' },
              { id: 'engineering', label: 'Engineering' },
              { id: 'intelligence', label: 'Intelligence' },
              { id: 'data', label: 'Data & SQL' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryFilter(cat.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: activeCategoryFilter === cat.id ? '600' : '400',
                  background: activeCategoryFilter === cat.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: activeCategoryFilter === cat.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: `1px solid ${activeCategoryFilter === cat.id ? 'var(--border-strong)' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {filteredWorkspaces.map((ws) => {
            const Icon = ws.icon;
            return (
              <div
                key={ws.id}
                onClick={() => onSelectPerspective(ws.id)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = ws.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ws.color,
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '600',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {ws.badge}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {ws.title}
                    </h3>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.45', margin: '6px 0 0 0' }}>
                    {ws.desc}
                  </p>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPerspective(ws.id);
                      }}
                      style={{ flex: 1, justifyContent: 'center', fontSize: '11.5px', padding: '5px 10px' }}
                    >
                      <span>Open Studio</span>
                      <ArrowRight size={12} />
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExecutePrompt(ws.prompt);
                      }}
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                      title="Run example AI orchestrator prompt"
                    >
                      <span>Example</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. RECENT ACTIVITY & RESUME HUB (2 COLUMNS: FILES & MEMORIES) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Left: Recent Key Project Files */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCode size={15} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Recent Critical Files
              </h3>
            </div>
            <button
              onClick={() => onSelectPerspective('code')}
              style={{ background: 'transparent', border: 'none', color: 'var(--link-color)', fontSize: '11px', cursor: 'pointer' }}
            >
              Open File Tree →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(summaryData?.recentFiles || [
              { name: 'ChatView.tsx', path: 'client/src/views/ChatView.tsx', category: 'Frontend View' },
              { name: 'HomeView.tsx', path: 'client/src/views/HomeView.tsx', category: 'Frontend View' },
              { name: 'CodeView.tsx', path: 'client/src/views/CodeView.tsx', category: 'Frontend View' },
              { name: 'db.ts', path: 'server/src/core/db/db.ts', category: 'Core Database' },
              { name: 'index.ts', path: 'server/src/index.ts', category: 'Server Gateway' },
              { name: 'ARCHITECTURE.md', path: 'ARCHITECTURE.md', category: 'System Architecture' },
            ]).map((file: any, idx: number) => (
              <div
                key={idx}
                onClick={() => {
                  if (onOpenFile) {
                    onOpenFile(file.path);
                  } else {
                    onSelectPerspective('code');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: '700',
                      padding: '1px 5px',
                      borderRadius: '2px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{file.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{file.path}</div>
                  </div>
                </div>
                <ChevronRight size={13} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Long-Term Memories & Rules */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Brain size={15} color="#10b981" />
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Learned AI Memories & Rules
              </h3>
            </div>
            <button
              onClick={() => onSelectPerspective('chat')}
              style={{ background: 'transparent', border: 'none', color: 'var(--link-color)', fontSize: '11px', cursor: 'pointer' }}
            >
              Open Memory Drawer →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {summaryData?.memories?.recent && summaryData.memories.recent.length > 0 ? (
              summaryData.memories.recent.map((mem: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: mem.category === 'rule' ? '#ef4444' : '#10b981',
                      }}
                    >
                      {mem.category}
                    </span>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                      {mem.source || 'user_explicit'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    "{mem.content}"
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                <Brain size={20} color="var(--text-muted)" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No memories recorded yet</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Chat with the AI to teach it rules, coding styles, and project preferences.
                </div>
              </div>
            )}
          </div>

          {/* Quick Tip on Memory */}
          <div
            style={{
              marginTop: '12px',
              padding: '8px 10px',
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
            }}
          >
            💡 <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> Say <em>"Remember to always format..."</em> or <em>"I prefer..."</em> in chat to store permanent workspace guidelines.
          </div>
        </div>
      </div>

      {/* 7. SYSTEM SHORTCUTS CHEATSHEET BAR */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Keyboard Cheatsheet:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd className="kbd-shortcut" style={{ padding: '2px 5px', fontSize: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>⌘K</kbd>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Universal Command Palette</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd className="kbd-shortcut" style={{ padding: '2px 5px', fontSize: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>Ctrl+`</kbd>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Toggle Bottom Terminal</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd className="kbd-shortcut" style={{ padding: '2px 5px', fontSize: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>⌘B</kbd>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Toggle Sidebar</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd className="kbd-shortcut" style={{ padding: '2px 5px', fontSize: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>⌘↵</kbd>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Execute Prompt</span>
          </div>
        </div>
      </div>
    </div>
  );
};
