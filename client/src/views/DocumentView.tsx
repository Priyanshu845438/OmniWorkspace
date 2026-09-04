import React, { useState, useEffect } from 'react';
import { FileText, FileCheck, Sparkles, RefreshCw } from 'lucide-react';

interface DocumentViewProps {
  onAskAi?: (prompt: string) => void;
}

export const DocumentView: React.FC<DocumentViewProps> = ({ onAskAi }) => {
  const [docPath, setDocPath] = useState('README.md');
  const [docContent, setDocContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const AVAILABLE_DOCS = [
    'README.md',
    'ARCHITECTURE.md',
    'DEVELOPMENT.md',
    'SECURITY.md',
    'PRIVACY.md',
    'CHANGELOG.md',
  ];

  const loadDocument = async (filePath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load document');
      setDocContent(data.content || '');
      setDocPath(filePath);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocument(docPath);
  }, []);

  const wordCount = docContent.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = docContent.split('\n').length;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-blue">Document Studio</span>
          <span className="badge badge-green">Real Workspace Source</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Document Intelligence & Synthesis</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Inspect specifications, architecture guides, and documentation with verified section extractions and AI synthesis.
        </p>
      </div>

      {/* Document Selector & Actions */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <FileText size={20} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={docPath}
                onChange={(e) => loadDocument(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '4px 8px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                {AVAILABLE_DOCS.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {lineCount} lines • {wordCount.toLocaleString()} words • {docContent.length.toLocaleString()} characters
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            style={{ fontSize: '12px', height: '32px' }}
            onClick={() => loadDocument(docPath)}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>
          {onAskAi && (
            <button
              className="btn-primary"
              style={{ fontSize: '12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() =>
                onAskAi(
                  `Analyze and synthesize an executive summary of '${docPath}':\n\n${docContent.slice(0, 10000)}\n\nExtract key architectural decisions, invariants, and implementation constraints with zero fabrication.`
                )
              }
              disabled={isLoading || !docContent}
            >
              <Sparkles size={13} />
              <span>Synthesize with AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Document Content View */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--accent-primary)' }}>
          <FileCheck size={18} />
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Raw Document Content ({docPath})
          </h3>
        </div>

        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12.5px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          {docContent || 'Loading document...'}
        </div>
      </div>
    </div>
  );
};
