import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  FileCheck,
  Sparkles,
  RefreshCw,
  Search,
  Copy,
  Check,
  BookOpen,
  Code2,
  ShieldCheck,
  CheckSquare,
  MessageSquare,
  Clock,
  List,
  ChevronRight,
  ChevronDown,
  Download,
  UploadCloud,
  Split,
  ArrowRight,
  FileCode,
  Compass,
} from 'lucide-react';

interface DocumentViewProps {
  onAskAi?: (prompt: string) => void;
}

interface WorkspaceDoc {
  path: string;
  name: string;
  category: string;
  size: number;
  mtime: string;
}

interface SectionItem {
  title: string;
  level: number;
  line: number;
}

interface DocumentAnalysis {
  executiveSummary?: string;
  keyPoints?: string[];
  architectureInvariants?: string[];
  securityRisks?: string[];
  actionItems?: string[];
  keyConcepts?: Array<{ term: string; definition: string }>;
  qaAnswer?: string;
  headings?: string[];
  readability?: {
    score: number;
    readingEase: string;
    gradeLevel: string;
    readingTimeMinutes: number;
    lexicalDensityPercent: number;
    totalWords: number;
    totalLines: number;
    uniqueWords: number;
  };
}

export const DocumentView: React.FC<DocumentViewProps> = ({ onAskAi }) => {
  // Document list and selection
  const [docList, setDocList] = useState<WorkspaceDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('README.md');
  const [docContent, setDocContent] = useState<string>('');
  const [docSections, setDocSections] = useState<SectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View Mode: 'rendered' | 'source' | 'split'
  const [viewMode, setViewMode] = useState<'rendered' | 'source' | 'split'>('rendered');
  const [docSearch, setDocSearch] = useState('');
  const [fileFilter, setFileFilter] = useState('');

  // Intelligence State
  const [activeIntelTab, setActiveIntelTab] = useState<'summary' | 'invariants' | 'security' | 'actions' | 'qa'>('summary');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Checked action items state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Expanded categories in sidebar
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Architecture & Specs': true,
    'Security & Governance': true,
    'Guides & Operations': true,
    'Audits & Releases': false,
    'Other Workspace Docs': false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderedContainerRef = useRef<HTMLDivElement>(null);

  // Load document list from backend
  const loadDocumentList = async () => {
    try {
      const res = await fetch('/api/document/list');
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        setDocList(data.documents);
      } else {
        // Fallback default list
        setDocList([
          { path: 'README.md', name: 'README.md', category: 'Architecture & Specs', size: 4500, mtime: new Date().toISOString() },
          { path: 'ARCHITECTURE.md', name: 'ARCHITECTURE.md', category: 'Architecture & Specs', size: 12000, mtime: new Date().toISOString() },
          { path: 'SECURITY.md', name: 'SECURITY.md', category: 'Security & Governance', size: 3800, mtime: new Date().toISOString() },
          { path: 'PRIVACY.md', name: 'PRIVACY.md', category: 'Security & Governance', size: 2900, mtime: new Date().toISOString() },
          { path: 'DEVELOPMENT.md', name: 'DEVELOPMENT.md', category: 'Guides & Operations', size: 6200, mtime: new Date().toISOString() },
          { path: 'CHANGELOG.md', name: 'CHANGELOG.md', category: 'Audits & Releases', size: 8400, mtime: new Date().toISOString() },
        ]);
      }
    } catch {
      // Fallback
    }
  };

  // Load specific document content
  const loadDocument = async (filePath: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedDoc(filePath);
    try {
      const res = await fetch(`/api/document/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load document');

      const content = data.content || '';
      setDocContent(content);
      setDocSections(data.sections || []);
      setCheckedItems({});

      // Automatically trigger initial analysis
      triggerAnalysis(filePath, content, 'executive');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger AI / NLP document analysis
  const triggerAnalysis = async (
    path: string,
    content: string,
    mode: 'executive' | 'architecture' | 'security' | 'action_items' | 'qa',
    question?: string
  ) => {
    if (!content) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/document/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          content,
          mode,
          question,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis((prev) => ({ ...prev, ...data }));
        if (mode === 'qa' && question && data.qaAnswer) {
          setQaHistory((prev) => [{ q: question, a: data.qaAnswer }, ...prev]);
          setQaQuestion('');
        }
      }
    } catch {
      // ignore
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const customPath = `local://${file.name}`;
      setSelectedDoc(customPath);
      setDocContent(text);

      // Extract sections
      const lines = text.split(/\r?\n/);
      const extractedSections: SectionItem[] = [];
      lines.forEach((l, idx) => {
        const hMatch = l.match(/^(#{1,6})\s+(.+)$/);
        if (hMatch) {
          extractedSections.push({
            title: hMatch[2].trim(),
            level: hMatch[1].length,
            line: idx + 1,
          });
        }
      });
      setDocSections(extractedSections);

      // Add to list if not present
      setDocList((prev) => [
        {
          path: customPath,
          name: file.name,
          category: 'Uploaded Files',
          size: file.size,
          mtime: new Date().toISOString(),
        },
        ...prev,
      ]);

      triggerAnalysis(customPath, text, 'executive');
    };
    reader.readAsText(file);
  };

  const handleCopyDocument = () => {
    navigator.clipboard.writeText(docContent);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleCopySummary = () => {
    if (!analysis?.executiveSummary) return;
    const text = `# Executive Summary: ${selectedDoc}\n\n${analysis.executiveSummary}\n\n## Key Points\n${(
      analysis.keyPoints || []
    )
      .map((p) => `- ${p}`)
      .join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const exportReport = () => {
    if (!analysis) return;
    const mdReport = `# Document Intelligence Report: ${selectedDoc}
Generated on: ${new Date().toLocaleString()}

## 1. Executive Summary
${analysis.executiveSummary || 'N/A'}

## 2. Key Architecture Points
${(analysis.keyPoints || []).map((p) => `- ${p}`).join('\n')}

## 3. System Invariants & Technical Rules
${(analysis.architectureInvariants || []).map((inv) => `- ${inv}`).join('\n')}

## 4. Security & Compliance Observations
${(analysis.securityRisks || []).map((sec) => `- ${sec}`).join('\n')}

## 5. Action Items & Checklist
${(analysis.actionItems || []).map((item) => `- [ ] ${item}`).join('\n')}

## 6. Readability & Complexity Scorecard
- Flesch Reading Score: ${analysis.readability?.score ?? 'N/A'} / 100 (${analysis.readability?.readingEase ?? 'N/A'})
- Reading Grade Level: ${analysis.readability?.gradeLevel ?? 'N/A'}
- Estimated Reading Time: ${analysis.readability?.readingTimeMinutes ?? 1} minute(s)
- Total Word Count: ${analysis.readability?.totalWords ?? 0} words
- Lexical Density: ${analysis.readability?.lexicalDensityPercent ?? 0}%
`;

    const blob = new Blob([mdReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_report_${selectedDoc.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
  };

  // Jump to section anchor in rendered mode
  const jumpToSection = (title: string) => {
    if (!renderedContainerRef.current) return;
    const target = renderedContainerRef.current.querySelector(`[data-section="${encodeURIComponent(title)}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Initial load
  useEffect(() => {
    loadDocumentList();
    loadDocument(selectedDoc);
  }, []);

  // Filter documents in sidebar
  const filteredDocList = useMemo(() => {
    if (!fileFilter.trim()) return docList;
    const f = fileFilter.toLowerCase();
    return docList.filter((d) => d.name.toLowerCase().includes(f) || d.path.toLowerCase().includes(f));
  }, [docList, fileFilter]);

  // Group by category
  const groupedDocs = useMemo(() => {
    const groups: Record<string, WorkspaceDoc[]> = {};
    filteredDocList.forEach((d) => {
      const cat = d.category || 'Other Workspace Docs';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    });
    return groups;
  }, [filteredDocList]);

  // Telemetry metrics
  const wordCount = useMemo(() => docContent.trim().split(/\s+/).filter(Boolean).length, [docContent]);
  const lineCount = useMemo(() => docContent.split(/\r?\n/).length, [docContent]);
  const readingTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 200)), [wordCount]);

  // Custom Lightweight Clean Markdown Renderer
  const renderMarkdown = (content: string) => {
    if (!content) return null;
    const lines = content.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeLang = '';
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0];
      const rows = tableRows.slice(1);
      elements.push(
        <div key={key} style={{ overflowX: 'auto', margin: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, idx) => {
      // Check for search match highlight
      const hasSearchMatch = docSearch && line.toLowerCase().includes(docSearch.toLowerCase());

      // Code Block fence
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = line.trim().slice(3).trim();
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          const codeText = codeBlockContent.join('\n');
          elements.push(
            <div
              key={`code-${idx}`}
              style={{
                position: 'relative',
                background: '#070b14',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                margin: '12px 0',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                overflowX: 'auto',
              }}
            >
              {codeLang && (
                <span
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '8px',
                    fontSize: '9.5px',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {codeLang}
                </span>
              )}
              <pre style={{ margin: 0, color: '#38bdf8' }}>{codeText}</pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Markdown Table line
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const parts = line.split('|').slice(1, -1);
        if (line.includes('---')) {
          // Separator row, ignore
          return;
        }
        inTable = true;
        tableRows.push(parts);
        return;
      } else if (inTable) {
        flushTable(`table-${idx}`);
      }

      // Headings
      const h1Match = line.match(/^#\s+(.+)$/);
      if (h1Match) {
        elements.push(
          <h1
            key={`h1-${idx}`}
            data-section={encodeURIComponent(h1Match[1].trim())}
            style={{
              fontSize: '22px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: '20px 0 10px 0',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '6px',
              background: hasSearchMatch ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            }}
          >
            {h1Match[1]}
          </h1>
        );
        return;
      }

      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        elements.push(
          <h2
            key={`h2-${idx}`}
            data-section={encodeURIComponent(h2Match[1].trim())}
            style={{
              fontSize: '17px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '18px 0 8px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '4px',
              background: hasSearchMatch ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            }}
          >
            {h2Match[1]}
          </h2>
        );
        return;
      }

      const h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match) {
        elements.push(
          <h3
            key={`h3-${idx}`}
            data-section={encodeURIComponent(h3Match[1].trim())}
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-accent)',
              margin: '14px 0 6px 0',
              background: hasSearchMatch ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            }}
          >
            {h3Match[1]}
          </h3>
        );
        return;
      }

      // Blockquote / Alert Callout
      if (line.trim().startsWith('>')) {
        const quoteText = line.replace(/^>\s*/, '');
        const isNote = quoteText.includes('[!NOTE]');
        const isWarning = quoteText.includes('[!WARNING]') || quoteText.includes('[!CAUTION]');
        const isTip = quoteText.includes('[!TIP]');

        elements.push(
          <div
            key={`quote-${idx}`}
            style={{
              borderLeft: `3px solid ${isWarning ? 'var(--danger)' : isTip ? 'var(--success)' : isNote ? 'var(--info)' : 'var(--accent-primary)'}`,
              background: isWarning ? 'rgba(239, 68, 68, 0.08)' : 'rgba(56, 189, 248, 0.05)',
              padding: '8px 12px',
              margin: '10px 0',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
            }}
          >
            {quoteText.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/g, '')}
          </div>
        );
        return;
      }

      // Checkboxes / Task lists
      const taskMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        elements.push(
          <div key={`task-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0', fontSize: '12.5px' }}>
            <input type="checkbox" checked={isChecked} readOnly style={{ accentColor: 'var(--accent-primary)' }} />
            <span style={{ color: isChecked ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: isChecked ? 'line-through' : 'none' }}>
              {taskMatch[2]}
            </span>
          </div>
        );
        return;
      }

      // List Items
      if (/^\s*[-*]\s+/.test(line)) {
        elements.push(
          <div
            key={`list-${idx}`}
            style={{
              paddingLeft: '16px',
              position: 'relative',
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
              margin: '3px 0',
              background: hasSearchMatch ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            }}
          >
            <span style={{ position: 'absolute', left: '4px', color: 'var(--accent-primary)' }}>•</span>
            {line.replace(/^\s*[-*]\s+/, '')}
          </div>
        );
        return;
      }

      // Horizontal Rule
      if (/^---+$/.test(line.trim())) {
        elements.push(<hr key={`hr-${idx}`} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />);
        return;
      }

      // Paragraph / Regular Line
      if (line.trim().length > 0) {
        elements.push(
          <p
            key={`p-${idx}`}
            style={{
              fontSize: '12.5px',
              lineHeight: '1.65',
              color: 'var(--text-secondary)',
              margin: '6px 0',
              background: hasSearchMatch ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              padding: hasSearchMatch ? '2px 4px' : '0',
              borderRadius: '2px',
            }}
          >
            {line}
          </p>
        );
      }
    });

    if (inTable) flushTable(`table-final`);
    return elements;
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Hidden file input for custom uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.json,.csv,.ts,.js,.yaml,.yml"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* 1. DOCUMENT EXPLORER SIDEBAR */}
      <div
        style={{
          width: '270px',
          minWidth: '270px',
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
            <FileText size={15} color="var(--accent-primary)" />
            <span style={{ fontSize: '11.5px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              DOCUMENT EXPLORER
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload Local Document"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <UploadCloud size={14} />
            </button>
            <button
              onClick={loadDocumentList}
              title="Refresh Document List"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              placeholder="Search documents..."
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

        {/* Documents Grouped Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {Object.entries(groupedDocs).map(([category, files]) => {
            const isExpanded = expandedCategories[category] ?? true;
            return (
              <div key={category} style={{ marginBottom: '10px' }}>
                <div
                  onClick={() => setExpandedCategories((prev) => ({ ...prev, [category]: !isExpanded }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span>{category}</span>
                  </div>
                  <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>{files.length}</span>
                </div>

                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
                    {files.map((doc) => {
                      const isSelected = selectedDoc === doc.path;
                      return (
                        <div
                          key={doc.path}
                          onClick={() => loadDocument(doc.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '5px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                            border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <FileCode size={12} color={isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {Math.round(doc.size / 1024)}K
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Document Outline / Table of Contents in Sidebar */}
        {docSections.length > 0 && (
          <div
            style={{
              maxHeight: '180px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '10.5px',
                fontWeight: '700',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <List size={11} />
              <span>TABLE OF CONTENTS ({docSections.length})</span>
            </div>
            <div style={{ overflowY: 'auto', padding: '6px 8px' }}>
              {docSections.map((sec, idx) => (
                <div
                  key={idx}
                  onClick={() => jumpToSection(sec.title)}
                  style={{
                    padding: '3px 6px',
                    paddingLeft: `${Math.min(sec.level * 8, 24)}px`,
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={sec.title}
                >
                  {sec.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN DOCUMENT READER & WORKSPACE */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Document Command & Telemetry Bar */}
        <div
          style={{
            height: '42px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
          }}
        >
          {/* Active File Title & Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCheck size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {selectedDoc}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={11} />
                {readingTime} min read
              </span>
              <span>•</span>
              <span>{wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{lineCount.toLocaleString()} lines</span>
            </div>
          </div>

          {/* Controls: Search in doc & View Modes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search in document */}
            <div style={{ position: 'relative', width: '180px' }}>
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Find in document..."
                style={{
                  width: '100%',
                  height: '24px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 6px 0 22px',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <Search size={11} style={{ position: 'absolute', left: '6px', top: '6px', color: 'var(--text-muted)' }} />
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '1px' }}>
              <button
                onClick={() => setViewMode('rendered')}
                style={{
                  height: '22px',
                  padding: '0 8px',
                  fontSize: '11px',
                  background: viewMode === 'rendered' ? 'var(--btn-bg)' : 'transparent',
                  color: viewMode === 'rendered' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <BookOpen size={11} />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setViewMode('source')}
                style={{
                  height: '22px',
                  padding: '0 8px',
                  fontSize: '11px',
                  background: viewMode === 'source' ? 'var(--btn-bg)' : 'transparent',
                  color: viewMode === 'source' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Code2 size={11} />
                <span>Source</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                style={{
                  height: '22px',
                  padding: '0 8px',
                  fontSize: '11px',
                  background: viewMode === 'split' ? 'var(--btn-bg)' : 'transparent',
                  color: viewMode === 'split' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Split size={11} />
                <span>Split</span>
              </button>
            </div>

            {/* Copy Document */}
            <button
              onClick={handleCopyDocument}
              className="btn-secondary"
              style={{ height: '24px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Copy Full Document Content"
            >
              {copiedDoc ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
              <span>{copiedDoc ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Main Split Content: Document Viewer + Right Intelligence Panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Document Content View Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
            {error && (
              <div style={{ padding: '8px 14px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid var(--danger)', color: '#fca5a5', fontSize: '12px' }}>
                {error}
              </div>
            )}
            {isLoading && (
              <div style={{ padding: '6px 14px', background: 'rgba(56, 189, 248, 0.08)', color: 'var(--text-accent)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={11} className="animate-spin" />
                <span>Loading document content...</span>
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Rendered Mode */}
              {(viewMode === 'rendered' || viewMode === 'split') && (
                <div
                  ref={renderedContainerRef}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px 32px',
                    maxWidth: viewMode === 'split' ? '50%' : '900px',
                    margin: viewMode === 'split' ? '0' : '0 auto',
                    borderRight: viewMode === 'split' ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  {renderMarkdown(docContent)}
                </div>
              )}

            {/* Raw Source Mode */}
            {(viewMode === 'source' || viewMode === 'split') && (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  background: '#070b14',
                  display: 'flex',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  lineHeight: '1.6',
                }}
              >
                {/* Line Numbers Gutter */}
                <div
                  style={{
                    width: '45px',
                    padding: '16px 0',
                    textAlign: 'right',
                    color: '#475569',
                    userSelect: 'none',
                    borderRight: '1px solid var(--border-subtle)',
                    background: '#04070d',
                  }}
                >
                  {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i} style={{ paddingRight: '8px' }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Raw Code Content */}
                <div style={{ flex: 1, padding: '16px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {docContent}
                </div>
              </div>
            )}
            </div>
          </div>

          {/* 3. RIGHT AI DOCUMENT INTELLIGENCE STUDIO */}
          <div
            style={{
              width: '380px',
              minWidth: '380px',
              background: 'var(--bg-sidebar)',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            {/* Intelligence Tabs Bar */}
            <div
              style={{
                height: '42px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
              }}
            >
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={() => setActiveIntelTab('summary')}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: activeIntelTab === 'summary' ? 'var(--bg-tertiary)' : 'transparent',
                    color: activeIntelTab === 'summary' ? 'var(--text-accent)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={12} />
                  <span>Briefing</span>
                </button>

                <button
                  onClick={() => setActiveIntelTab('invariants')}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: activeIntelTab === 'invariants' ? 'var(--bg-tertiary)' : 'transparent',
                    color: activeIntelTab === 'invariants' ? 'var(--text-accent)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Compass size={12} />
                  <span>Architecture</span>
                </button>

                <button
                  onClick={() => setActiveIntelTab('security')}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: activeIntelTab === 'security' ? 'var(--bg-tertiary)' : 'transparent',
                    color: activeIntelTab === 'security' ? 'var(--text-accent)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={12} />
                  <span>Security</span>
                </button>

                <button
                  onClick={() => setActiveIntelTab('actions')}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: activeIntelTab === 'actions' ? 'var(--bg-tertiary)' : 'transparent',
                    color: activeIntelTab === 'actions' ? 'var(--text-accent)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckSquare size={12} />
                  <span>Actions</span>
                </button>

                <button
                  onClick={() => setActiveIntelTab('qa')}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: activeIntelTab === 'qa' ? 'var(--bg-tertiary)' : 'transparent',
                    color: activeIntelTab === 'qa' ? 'var(--text-accent)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageSquare size={12} />
                  <span>Ask Doc</span>
                </button>
              </div>

              <button
                onClick={exportReport}
                title="Export Intelligence Report as Markdown"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <Download size={13} />
              </button>
            </div>

            {/* Intelligence Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {/* TAB 1: EXECUTIVE BRIEFING */}
              {activeIntelTab === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Executive Summary Card */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                        Executive Summary
                      </span>
                      <button
                        onClick={handleCopySummary}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Copy Summary"
                      >
                        {copiedSummary ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                      {analysis?.executiveSummary || 'Analyzing document content...'}
                    </p>
                  </div>

                  {/* Readability & Linguistic Scorecard */}
                  {analysis?.readability && (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                        Readability & Linguistic Telemetry
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Flesch Score</div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>
                            {analysis.readability.score} / 100
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{analysis.readability.readingEase}</div>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Audience</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {analysis.readability.gradeLevel}
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lexical Density</div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                            {analysis.readability.lexicalDensityPercent}%
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {analysis.readability.uniqueWords} unique terms
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reading Time</div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            ~{analysis.readability.readingTimeMinutes} min
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>@ 200 words/min</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Core Architecture Highlights */}
                  {analysis?.keyPoints && analysis.keyPoints.length > 0 && (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                        Core Highlights
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analysis.keyPoints.map((pt, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--accent-primary)', marginTop: '2px' }}>•</span>
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVARIANTS & ARCHITECTURE */}
              {activeIntelTab === 'invariants' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      System Invariants & Hard Rules
                    </span>
                    {!analysis?.architectureInvariants || analysis.architectureInvariants.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        No explicit invariants found in active text.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analysis.architectureInvariants.map((inv, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '8px 10px',
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              lineHeight: '1.5',
                            }}
                          >
                            <span style={{ color: 'var(--accent-primary)', fontWeight: '600', marginRight: '4px' }}>
                              #{idx + 1}
                            </span>
                            {inv}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extracted Technical Glossary */}
                  {analysis?.keyConcepts && analysis.keyConcepts.length > 0 && (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                        Extracted Concept Definitions
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analysis.keyConcepts.map((item, i) => (
                          <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            <strong style={{ color: 'var(--accent-primary)' }}>{item.term}:</strong> {item.definition}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SECURITY & COMPLIANCE */}
              {activeIntelTab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Security & Permission Boundaries
                    </span>
                    {!analysis?.securityRisks || analysis.securityRisks.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        No sensitive security credentials or permission warnings flagged in this document.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analysis.securityRisks.map((sec, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: 'rgba(251, 191, 36, 0.05)',
                              border: '1px solid rgba(251, 191, 36, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '8px 10px',
                              fontSize: '12px',
                              color: '#fef08a',
                              lineHeight: '1.5',
                            }}
                          >
                            {sec}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ACTION ITEMS & CHECKLIST */}
              {activeIntelTab === 'actions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', textTransform: 'uppercase' }}>
                        Extracted Action Items ({analysis?.actionItems?.length || 0})
                      </span>
                    </div>

                    {!analysis?.actionItems || analysis.actionItems.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        No pending action items or checklist markers detected in document.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {analysis.actionItems.map((item, idx) => {
                          const isDone = !!checkedItems[idx];
                          return (
                            <div
                              key={idx}
                              onClick={() => setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: isDone ? 'rgba(52, 211, 153, 0.05)' : 'var(--bg-primary)',
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => {}}
                                style={{ marginTop: '2px', accentColor: 'var(--accent-primary)' }}
                              />
                              <span
                                style={{
                                  color: isDone ? 'var(--text-muted)' : 'var(--text-secondary)',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                  lineHeight: '1.5',
                                }}
                              >
                                {item}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: ASK DOCUMENT (INTERACTIVE Q&A) */}
              {activeIntelTab === 'qa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Query Document Directly
                    </span>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={qaQuestion}
                        onChange={(e) => setQaQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') triggerAnalysis(selectedDoc, docContent, 'qa', qaQuestion);
                        }}
                        placeholder="Ask anything about this document..."
                        style={{
                          flex: 1,
                          height: '28px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0 8px',
                          fontSize: '11.5px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => triggerAnalysis(selectedDoc, docContent, 'qa', qaQuestion)}
                        disabled={isAnalyzing || !qaQuestion.trim()}
                        className="btn-primary"
                        style={{ height: '28px', padding: '0 10px', fontSize: '11.5px' }}
                      >
                        Ask
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quick prompts:</span>
                      {['Core purpose?', 'Security prerequisites?', 'Key components?'].map((sample, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setQaQuestion(sample);
                            triggerAnalysis(selectedDoc, docContent, 'qa', sample);
                          }}
                          style={{
                            fontSize: '10px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            color: 'var(--text-secondary)',
                            padding: '2px 6px',
                            cursor: 'pointer',
                          }}
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Q&A History Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {qaHistory.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                          Q: {item.q}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                          {item.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escalate to Co-Pilot Chat Option */}
              {onAskAi && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    Escalate to Universal Co-Pilot
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Discuss this entire document with multi-modal tools and coding agents.
                  </div>
                  <button
                    onClick={() =>
                      onAskAi(
                        `I am analyzing the document "${selectedDoc}".\n\nExecutive Summary:\n${
                          analysis?.executiveSummary || docContent.slice(0, 500)
                        }\n\nPlease help me formulate architectural refactoring or implementation plans.`
                      )
                    }
                    className="btn-secondary"
                    style={{ width: '100%', height: '26px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>Discuss in Co-Pilot Chat</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
