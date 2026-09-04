import React, { useState } from 'react';
import { Search, Globe, BookOpen, ExternalLink, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface ResearchViewProps {
  onAskAi?: (prompt: string) => void;
}

export const ResearchView: React.FC<ResearchViewProps> = ({ onAskAi }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), numResults: '5' }),
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

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-blue">Deep Research Engine</span>
          <span className="badge badge-green">Evidence Verified</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>
          Research & Intelligence Canvas
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Formulate investigative queries, collect multi-source evidence, detect contradictions, and synthesize verified reports with real citations.
        </p>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            className="universal-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter research topic, question, or technology (e.g. 'State-of-the-art open source reasoning models')..."
            style={{ paddingLeft: '38px', height: '42px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
        </div>
        <button type="submit" className="btn-primary" disabled={isSearching || !query.trim()}>
          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
          <span>Search & Collect</span>
        </button>
      </form>

      {/* Epistemic Evidence Classification Legend */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
          EPISTEMIC STANDARDS:
        </span>
        <span className="badge badge-green">FACT: Verified by Source</span>
        <span className="badge badge-blue">INFERENCE: Deductive Reasoning</span>
        <span className="badge badge-amber">ESTIMATE: Statistical Projection</span>
        <span className="badge badge-red">UNKNOWN: Unverified Claim</span>
      </div>

      {/* Error Notice */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* Synthesize Evidence Report Button */}
      {onAskAi && results.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() =>
              onAskAi(
                `Synthesize an evidence-backed research report on "${query}" based on the following real sources:\n\n${results
                  .map((r, idx) => `[Source ${idx + 1}] ${r.title}\nURL: ${r.url}\nExcerpt: ${r.snippet}`)
                  .join('\n\n')}\n\nStrictly classify statements into FACT, INFERENCE, ESTIMATE, and UNKNOWN. Provide transparent citations.`
              )
            }
          >
            <Sparkles size={14} />
            <span>Synthesize Report with AI</span>
          </button>
        </div>
      )}

      {/* Search Results / Evidence Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {results.map((res, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {res.title}
                </h3>
              </div>
              <span className="badge badge-green">FACT</span>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '10px' }}>
              {res.snippet}
            </p>

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
              <span>{res.url}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
