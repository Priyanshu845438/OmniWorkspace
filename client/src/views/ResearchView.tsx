import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  BookOpen,
  ExternalLink,
  Loader2,
  Sparkles,
  AlertCircle,
  FileText,
  Download,
  Copy,
  Check,
  Layers,
  Clock,
  User,
  X,
  ChevronRight,
  Bookmark,
  Trash2,
  Share2,
  Compass,
  Zap,
} from 'lucide-react';

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: 'web' | 'academic' | 'wikipedia' | 'tech';
  author?: string;
  timestamp?: string;
}

export interface EpistemicClaim {
  id: string;
  claim: string;
  type: 'FACT' | 'INFERENCE' | 'ESTIMATE' | 'UNKNOWN';
  confidence: number;
  sourceIndex: number;
  sourceUrl: string;
  sourceTitle: string;
  sourceQuote?: string;
}

export interface DeepResearchDossier {
  topic: string;
  timestamp: string;
  executiveSummary: string;
  subqueries: string[];
  sources: SearchResult[];
  epistemicClaims: EpistemicClaim[];
  comparisonMatrix: Array<{
    dimension: string;
    finding: string;
    sourceCitation: string;
  }>;
  openQuestions: string[];
  bibtex: string;
}

interface ReaderArticle {
  url: string;
  title: string;
  domain: string;
  wordCount: number;
  readingTimeMin: number;
  paragraphCount: number;
  leadSnippet: string;
  fullText: string;
}

interface ResearchViewProps {
  onAskAi?: (prompt: string) => void;
  onOpenFile?: (filePath: string) => void;
}

type SearchMode = 'all' | 'web' | 'academic' | 'wikipedia' | 'tech';
type EpistemicFilter = 'ALL' | 'FACT' | 'INFERENCE' | 'ESTIMATE' | 'UNKNOWN';

const PRESET_QUERIES = [
  { label: '🧠 SOTA Reasoning Models', query: 'State of the art open source reasoning models DeepSeek Nemotron Qwen 2026' },
  { label: '⚡ Mamba vs Transformers', query: 'Mamba SSM state space models vs Transformers benchmark comparison' },
  { label: '⚛️ Quantum Coherence', query: 'Quantum computing qubit coherence error correction progress' },
  { label: '🔋 Solid-State Batteries', query: 'Solid-state battery commercialization energy density timeline 2026' },
];

export const ResearchView: React.FC<ResearchViewProps> = ({ onAskAi }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isDeepRunning, setIsDeepRunning] = useState(false);
  const [deepStep, setDeepStep] = useState<number>(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [dossier, setDossier] = useState<DeepResearchDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [epistemicFilter, setEpistemicFilter] = useState<EpistemicFilter>('ALL');

  // Reader Drawer state
  const [readingArticle, setReadingArticle] = useState<ReaderArticle | null>(null);
  const [isLoadingReader, setIsLoadingReader] = useState(false);

  // Copied alerts
  const [copiedBibtex, setCopiedBibtex] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);

  // Saved research sessions
  const [savedSessions, setSavedSessions] = useState<Array<{ id: string; title: string; timestamp: string; dossier: DeepResearchDossier }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load saved sessions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('omni_research_sessions');
      if (saved) setSavedSessions(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const saveSession = (newDossier: DeepResearchDossier) => {
    const session = {
      id: `session_${Date.now()}`,
      title: newDossier.topic,
      timestamp: new Date().toISOString(),
      dossier: newDossier,
    };
    const updated = [session, ...savedSessions.filter((s) => s.title !== newDossier.topic)].slice(0, 10);
    setSavedSessions(updated);
    try {
      localStorage.setItem('omni_research_sessions', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSessions.filter((s) => s.id !== id);
    setSavedSessions(updated);
    try {
      localStorage.setItem('omni_research_sessions', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 1. Quick Federated Search
  const handleQuickSearch = async (e?: React.FormEvent, searchQuery?: string) => {
    if (e) e.preventDefault();
    const q = (searchQuery || query).trim();
    if (!q) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, numResults: '8', mode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      if (data.results && data.results.length > 0) {
        setResults(data.results);
      } else {
        setResults([]);
        setError(data.error || 'No search results found for this query.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Autonomous Deep Multi-Step Research Pipeline
  const handleDeepResearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setIsDeepRunning(true);
    setError(null);
    setDeepStep(1);

    // Simulate step progress for user feedback while backend executes
    const timer1 = setTimeout(() => setDeepStep(2), 700);
    const timer2 = setTimeout(() => setDeepStep(3), 1800);

    try {
      const res = await fetch('/api/research/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, mode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deep research pipeline failed');

      setDeepStep(4);
      setDossier(data);
      if (data.sources) setResults(data.sources);
      saveSession(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsDeepRunning(false);
    }
  };

  // 3. Open Article Reader
  const handleOpenReader = async (url: string) => {
    setIsLoadingReader(true);
    try {
      const res = await fetch('/api/research/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not extract article');
      setReadingArticle(data);
    } catch (err: any) {
      setError(`Reader extraction failed: ${err.message}`);
    } finally {
      setIsLoadingReader(false);
    }
  };

  // 4. Export Markdown Dossier
  const handleExportMarkdown = () => {
    if (!dossier) return;
    const content = `# 📑 Research Dossier: ${dossier.topic}
*Generated by OmniWorkspace Deep Intelligence on ${new Date(dossier.timestamp).toLocaleString()}*

---

${dossier.executiveSummary}

---

## 🔬 Epistemic Evidence Matrix
| Epistemic Class | Confidence | Source Citation | Evidence Quote |
| :--- | :--- | :--- | :--- |
${dossier.epistemicClaims
  .map((c) => `| **${c.type}** | ${Math.round(c.confidence * 100)}% | [${c.sourceIndex}] ${c.sourceTitle} | "${c.claim}" |`)
  .join('\n')}

---

## 📊 Cross-Source Comparison Matrix
| Dimension | Findings | Reference |
| :--- | :--- | :--- |
${dossier.comparisonMatrix.map((m) => `| **${m.dimension}** | ${m.finding} | ${m.sourceCitation} |`).join('\n')}

---

## 🌐 Verified Sources & Citations
${dossier.sources
  .map(
    (s, i) =>
      `[${i + 1}] **${s.title}** (${s.source.toUpperCase()})\n` +
      `URL: ${s.url}\n` +
      `Summary: ${s.snippet}\n`
  )
  .join('\n')}

---

## 📚 BibTeX Entries
\`\`\`bibtex
${dossier.bibtex}
\`\`\`
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `research_dossier_${dossier.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleCopyBibtex = () => {
    if (!dossier?.bibtex) return;
    navigator.clipboard.writeText(dossier.bibtex);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  const handleCopyDossier = () => {
    if (!dossier) return;
    navigator.clipboard.writeText(
      `# ${dossier.topic}\n\n${dossier.executiveSummary}\n\nSources:\n${dossier.sources
        .map((s, i) => `[${i + 1}] ${s.title} - ${s.url}`)
        .join('\n')}`
    );
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2000);
  };

  const filteredClaims = dossier?.epistemicClaims.filter((c) => {
    if (epistemicFilter === 'ALL') return true;
    return c.type === epistemicFilter;
  }) || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '60px' }}>
      {/* Header Banner */}
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
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, maxWidth: '780px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} /> Deep Autonomous Research 2.0
            </span>
            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={12} /> Federated Multi-Engine
            </span>
            <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} /> Epistemic Verified
            </span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, color: '#f8fafc' }}>
            Deep Web Research & Intelligence Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            Formulate multi-vector inquiries, ingest live web & academic preprints, verify epistemic truth boundaries, and synthesize comprehensive executive intelligence dossiers.
          </p>
        </div>

        {/* History Toggle */}
        <div style={{ zIndex: 1, display: 'flex', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowHistory(!showHistory)}
            style={{
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: showHistory ? 'rgba(56, 189, 248, 0.15)' : undefined,
              borderColor: showHistory ? 'var(--accent-primary)' : undefined,
            }}
          >
            <Bookmark size={15} />
            <span>Saved Dossiers ({savedSessions.length})</span>
          </button>
        </div>

        {/* Subtle background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Saved Sessions Drawer / Panel */}
      {showHistory && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={14} color="var(--accent-primary)" /> Saved Research Dossiers
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click to reload full findings</span>
          </div>

          {savedSessions.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No research dossiers saved yet. Run Deep Autonomous Research to generate and preserve dossiers.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {savedSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setDossier(s.dossier);
                    setResults(s.dossier.sources || []);
                    setQuery(s.dossier.topic);
                    setShowHistory(false);
                  }}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>{s.title}</span>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                      title="Delete saved dossier"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{new Date(s.timestamp).toLocaleDateString()}</span>
                    <span>{s.dossier.sources?.length || 0} sources • {s.dossier.epistemicClaims?.length || 0} claims</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Query Bar & Controls */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Source Mode Filter Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
            ENGINE SOURCE:
          </span>
          {[
            { id: 'all', label: '🌐 All Sources (Federated)', icon: Globe },
            { id: 'web', label: '🔍 Live Web', icon: Search },
            { id: 'academic', label: '📚 ArXiv Academic', icon: BookOpen },
            { id: 'wikipedia', label: '📖 Wikipedia', icon: FileText },
            { id: 'tech', label: '💬 Hacker News', icon: Share2 },
          ].map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id as SearchMode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: active ? '600' : '500',
                  border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: active ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-primary)',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={13} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuickSearch(e);
          }}
          style={{ display: 'flex', gap: '10px' }}
        >
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="universal-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter investigative topic, scientific query, or technology to research..."
              style={{
                paddingLeft: '42px',
                height: '46px',
                fontSize: '14.5px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: '#f8fafc',
              }}
            />
            <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
          </div>

          {/* Quick Search */}
          <button
            type="submit"
            className="btn-secondary"
            disabled={isSearching || isDeepRunning || !query.trim()}
            style={{ height: '46px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Fast federated web search across selected engines"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>Quick Search</span>
          </button>

          {/* Deep Autonomous Research */}
          <button
            type="button"
            className="btn-primary"
            disabled={isSearching || isDeepRunning || !query.trim()}
            onClick={() => handleDeepResearch()}
            style={{
              height: '46px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              borderColor: '#38bdf8',
            }}
            title="Multi-stage autonomous deep dive: decomposes query, collects evidence, verifies epistemic claims, and builds full dossier"
          >
            {isDeepRunning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Deep Autonomous Research</span>
          </button>
        </form>

        {/* Preset Sample Prompts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>TRENDING TOPICS:</span>
          {PRESET_QUERIES.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(p.query);
                handleDeepResearch(p.query);
              }}
              style={{
                fontSize: '11.5px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Deep Autonomous Research Stepper (When active) */}
      {isDeepRunning && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 4px 24px rgba(56, 189, 248, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={20} className="animate-spin" color="var(--accent-primary)" />
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
                Executing Autonomous Deep Research on: &ldquo;{query}&rdquo;
              </span>
            </div>
            <span className="badge badge-blue">Stage {deepStep} of 4</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { step: 1, title: 'Query Decomposition', desc: 'Forming multi-vector hypotheses' },
              { step: 2, title: 'Parallel Harvesting', desc: 'Scraping Web, ArXiv & Wikipedia' },
              { step: 3, title: 'Epistemic Classification', desc: 'Extracting FACT & INFERENCE claims' },
              { step: 4, title: 'Dossier Synthesis', desc: 'Assembling executive analysis' },
            ].map((s) => {
              const isPast = deepStep > s.step;
              const isCurrent = deepStep === s.step;
              return (
                <div
                  key={s.step}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCurrent ? 'rgba(56, 189, 248, 0.15)' : isPast ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isCurrent ? 'var(--accent-primary)' : isPast ? '#10b981' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isPast ? (
                      <Check size={14} color="#10b981" />
                    ) : isCurrent ? (
                      <Loader2 size={14} className="animate-spin" color="var(--accent-primary)" />
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.step}.</span>
                    )}
                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: isCurrent ? '#f8fafc' : isPast ? '#10b981' : 'var(--text-muted)' }}>
                      {s.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* Deep Research Dossier Display (When available) */}
      {dossier && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Executive Dossier Top Header & Actions */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={12} /> Executive Intelligence Dossier
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Generated: {new Date(dossier.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                  {dossier.topic}
                </h2>
              </div>

              {/* Dossier Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary"
                  onClick={handleExportMarkdown}
                  style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Download complete dossier as Markdown (.md)"
                >
                  <Download size={14} />
                  <span>Export Markdown</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={handleCopyBibtex}
                  style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Copy BibTeX citations to clipboard"
                >
                  {copiedBibtex ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copiedBibtex ? 'BibTeX Copied!' : 'Copy BibTeX'}</span>
                </button>

                <button
                  className="btn-secondary"
                  onClick={handleCopyDossier}
                  style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copiedDossier ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
                  <span>{copiedDossier ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                {onAskAi && (
                  <button
                    className="btn-primary"
                    onClick={() =>
                      onAskAi(
                        `Based on this research dossier on "${dossier.topic}":\n\n${dossier.executiveSummary}\n\nEvidence Claims:\n${dossier.epistemicClaims
                          .map((c) => `- [${c.type}] ${c.claim} (Source: ${c.sourceTitle})`)
                          .join('\n')}\n\nPlease provide a deep architectural critique, implementation plan, or strategic next steps.`
                      )
                    }
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Sparkles size={14} />
                    <span>Deep Dive with AI Co-Pilot</span>
                  </button>
                )}
              </div>
            </div>

            {/* Subqueries Dispatched */}
            {dossier.subqueries && dossier.subqueries.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: '600' }}>DISPATCHED INQUIRIES:</span>
                {dossier.subqueries.map((sq, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {sq}
                  </span>
                ))}
              </div>
            )}

            {/* Executive Summary Body */}
            <div
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                fontSize: '14.5px',
                lineHeight: '1.7',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
              }}
            >
              {dossier.executiveSummary}
            </div>

            {/* Cross-Source Comparison Matrix */}
            {dossier.comparisonMatrix && dossier.comparisonMatrix.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  📊 Multi-Source Comparison Matrix
                </span>
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 14px', width: '25%', color: 'var(--text-muted)' }}>Dimension</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', width: '55%', color: 'var(--text-muted)' }}>Verified Finding</th>
                        <th style={{ textAlign: 'left', padding: '10px 14px', width: '20%', color: 'var(--text-muted)' }}>Citation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.comparisonMatrix.map((item, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: i < dossier.comparisonMatrix.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            background: i % 2 === 0 ? 'var(--bg-primary)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--accent-primary)' }}>{item.dimension}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{item.finding}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px' }}>{item.sourceCitation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Epistemic Claims Filter & Grid */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                  Epistemic Evidence Claims ({filteredClaims.length})
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Categorized claims extracted directly from real web and scientific citations
                </span>
              </div>

              {/* Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['ALL', 'FACT', 'INFERENCE', 'ESTIMATE', 'UNKNOWN'] as EpistemicFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEpistemicFilter(f)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: epistemicFilter === f ? '700' : '500',
                      cursor: 'pointer',
                      border: epistemicFilter === f ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: epistemicFilter === f ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-primary)',
                      color:
                        f === 'FACT'
                          ? '#34d399'
                          : f === 'INFERENCE'
                          ? '#38bdf8'
                          : f === 'ESTIMATE'
                          ? '#fbbf24'
                          : f === 'UNKNOWN'
                          ? '#f87171'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Claims Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
              {filteredClaims.map((claim) => (
                <div
                  key={claim.id}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        className={
                          claim.type === 'FACT'
                            ? 'badge badge-green'
                            : claim.type === 'INFERENCE'
                            ? 'badge badge-blue'
                            : claim.type === 'ESTIMATE'
                            ? 'badge badge-amber'
                            : 'badge badge-red'
                        }
                      >
                        {claim.type}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Conf: {Math.round(claim.confidence * 100)}%
                      </span>
                    </div>

                    <p style={{ fontSize: '13.5px', color: '#f1f5f9', lineHeight: '1.5', margin: 0 }}>
                      &ldquo;{claim.claim}&rdquo;
                    </p>
                  </div>

                  {/* Backlink & Reader Button */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11.5px',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      [{claim.sourceIndex}] {claim.sourceTitle}
                    </span>
                    <button
                      onClick={() => handleOpenReader(claim.sourceUrl)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Read Source</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sources & Citations Section (For both Quick Search & Deep Research) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--accent-primary)" />
            <span>Ingested Evidence & Citations ({results.length})</span>
          </h3>
          {results.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Click &ldquo;Read Article&rdquo; for full clean text view
            </span>
          )}
        </div>

        {results.length === 0 && !isSearching && !isDeepRunning && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Compass size={36} color="var(--text-muted)" />
            <div style={{ maxWidth: '440px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', margin: '0 0 6px 0' }}>
                Ready for Research Ingestion
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Type an inquiry above or pick a trending topic. OmniWorkspace will query live sources across Web, ArXiv, Wikipedia, and Hacker News.
              </p>
            </div>
          </div>
        )}

        {/* Source Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {results.map((res, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {i + 1}
                  </span>

                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                    {res.title}
                  </h4>
                </div>

                {/* Source Badge */}
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    background:
                      res.source === 'academic'
                        ? 'rgba(168, 85, 247, 0.15)'
                        : res.source === 'wikipedia'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : res.source === 'tech'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                    color:
                      res.source === 'academic'
                        ? '#c084fc'
                        : res.source === 'wikipedia'
                        ? '#34d399'
                        : res.source === 'tech'
                        ? '#fbbf24'
                        : '#38bdf8',
                  }}
                >
                  {res.source}
                </span>
              </div>

              {/* Snippet */}
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {res.snippet}
              </p>

              {/* Footer Meta & Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {res.author && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {res.author}
                    </span>
                  )}
                  {res.timestamp && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {new Date(res.timestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Read Article in OmniWorkspace Modal */}
                  <button
                    className="btn-secondary"
                    onClick={() => handleOpenReader(res.url)}
                    style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Read distraction-free text directly inside OmniWorkspace"
                  >
                    <BookOpen size={13} />
                    <span>Read Article</span>
                  </button>

                  {/* External Link */}
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      color: 'var(--accent-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Visit Source</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reader Drawer / Modal */}
      {(readingArticle || isLoadingReader) && (
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
          onClick={() => {
            if (!isLoadingReader) setReadingArticle(null);
          }}
        >
          <div
            style={{
              background: '#0b1120',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                  Distraction-Free Article Reader
                </span>
              </div>
              <button
                onClick={() => setReadingArticle(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {isLoadingReader ? (
              <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Extracting and sanitizing clean article text...
                </span>
              </div>
            ) : readingArticle ? (
              <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', color: '#f8fafc' }}>
                    {readingArticle.title}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>Domain: {readingArticle.domain}</span>
                    <span>•</span>
                    <span>{readingArticle.wordCount} words</span>
                    <span>•</span>
                    <span>~{readingArticle.readingTimeMin} min read</span>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '14.5px',
                    lineHeight: '1.8',
                    color: '#cbd5e1',
                    whiteSpace: 'pre-wrap',
                    padding: '16px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {readingArticle.fullText}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                  <a
                    href={readingArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '13px',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Open Original Web Page</span>
                    <ExternalLink size={13} />
                  </a>

                  <button
                    className="btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(readingArticle.fullText);
                      alert('Article text copied to clipboard!');
                    }}
                    style={{ fontSize: '12px' }}
                  >
                    Copy Text
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
