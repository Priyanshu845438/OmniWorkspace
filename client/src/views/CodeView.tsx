import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File,
  Save,
  Play,
  GitBranch,
  RefreshCw,
  Search,
  Check,
  X,
  Plus,
  Sparkles,
  Code2,
  GitCompare,
  ArrowDown,
  ArrowUp,
  Replace,
  FolderOpen,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface FileItem {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

interface OpenTab {
  path: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
}

interface CodeViewProps {
  onAskAi?: (prompt: string, activeFilePath?: string) => void;
  initialFile?: string;
  isAiStreaming?: boolean;
}

export const CodeView: React.FC<CodeViewProps> = ({ onAskAi, initialFile, isAiStreaming }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [workspaceName, setWorkspaceName] = useState('OmniWorkspace');
  const [workspaceRoot, setWorkspaceRoot] = useState('');
  const [showOpenFolderModal, setShowOpenFolderModal] = useState(false);
  const [folderInputPath, setFolderInputPath] = useState('');
  const [aiDevelopPrompt, setAiDevelopPrompt] = useState('');
  const [aiDevelopStatus, setAiDevelopStatus] = useState<string | null>(null);

  const [fileFilter, setFileFilter] = useState('');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string>(initialFile || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [gitStatus, setGitStatus] = useState<string>('Checking...');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  // New Feature States
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [targetLineInput, setTargetLineInput] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeTab = openTabs.find((t) => t.path === activeTabPath) || openTabs[0] || {
    path: activeTabPath || 'package.json',
    content: '',
    originalContent: '',
    isDirty: false,
  };

  const loadDirectory = async (dir: string) => {
    try {
      const res = await fetch(`/api/workspace/files?path=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.items) {
        setFiles(data.items);
      }
    } catch {
      // ignore
    }
  };

  const navigateDirectory = (targetDir: string) => {
    setCurrentPath(targetDir);
    loadDirectory(targetDir);
  };

  const navigateUp = () => {
    if (currentPath === '.' || currentPath === '') return;
    const parts = currentPath.split('/');
    parts.pop();
    const parent = parts.join('/') || '.';
    navigateDirectory(parent);
  };

  const loadFile = async (filePath: string) => {
    const existing = openTabs.find((t) => t.path === filePath);
    if (existing && existing.content && existing.content.length > 0) {
      setActiveTabPath(filePath);
      return;
    }

    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setOpenTabs((prev) => {
          const filtered = prev.filter((t) => t.path !== filePath);
          return [
            ...filtered,
            {
              path: filePath,
              content: data.content,
              originalContent: data.content,
              isDirty: false,
            },
          ];
        });
        setActiveTabPath(filePath);
      }
    } catch {
      // ignore
    }
  };

  const handleOpenFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderInputPath.trim()) return;
    try {
      const res = await fetch('/api/workspace/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folderInputPath.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setWorkspaceRoot(data.workspaceRoot);
        setWorkspaceName(data.name || 'Workspace');
        setCurrentPath('.');
        loadDirectory('.');
        setShowOpenFolderModal(false);
        setFolderInputPath('');
        refreshGit();
      } else {
        alert(`Failed to open folder: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleAiDevelop = () => {
    if (!aiDevelopPrompt.trim() || !onAskAi) return;
    const targetFile = activeTab?.path || 'workspace';
    const promptToSend = `In workspace file '${targetFile}':\n${aiDevelopPrompt.trim()}\n\nDevelop and implement this request directly in the workspace using write_file/edit_file tools. Ensure clean syntax, full implementation without placeholders, and verify your changes.`;
    setAiDevelopStatus('⚡ AI Developer is generating code & modifying workspace...');
    onAskAi(promptToSend, targetFile);
    setAiDevelopPrompt('');
  };

  // Re-sync file from disk when AI finishes streaming
  const prevStreamingRef = useRef(isAiStreaming);
  useEffect(() => {
    if (prevStreamingRef.current && !isAiStreaming) {
      loadDirectory(currentPath);
      if (activeTabPath) {
        fetch(`/api/workspace/file?path=${encodeURIComponent(activeTabPath)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.content !== undefined) {
              setOpenTabs((prev) =>
                prev.map((t) =>
                  t.path === activeTabPath
                    ? { ...t, content: data.content, originalContent: data.content, isDirty: false }
                    : t
                )
              );
              setAiDevelopStatus('✅ Code developed and synchronized with workspace!');
              setTimeout(() => setAiDevelopStatus(null), 6000);
            }
          })
          .catch(() => {});
      }
      refreshGit();
    }
    prevStreamingRef.current = isAiStreaming;
  }, [isAiStreaming, activeTabPath, currentPath]);

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t.path !== path);
    setOpenTabs(remaining);
    if (activeTabPath === path) {
      setActiveTabPath(remaining.length > 0 ? remaining[remaining.length - 1].path : '');
    }
  };

  const updateActiveContent = (newContent: string) => {
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.path === activeTabPath
          ? {
              ...tab,
              content: newContent,
              isDirty: newContent !== tab.originalContent,
            }
          : tab
      )
    );
  };

  const saveCurrentFile = async () => {
    if (!activeTab) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/workspace/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
      });
      if (res.ok) {
        setOpenTabs((prev) =>
          prev.map((tab) =>
            tab.path === activeTab.path
              ? { ...tab, originalContent: tab.content, isDirty: false }
              : tab
          )
        );
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        refreshGit();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      await fetch('/api/workspace/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newFileName.trim(), content: '' }),
      });
      loadDirectory(currentPath);
      loadFile(newFileName.trim());
      setNewFileName('');
      setShowNewFileInput(false);
    } catch {
      // ignore
    }
  };

  const refreshGit = async () => {
    try {
      const res = await fetch('/api/git/status');
      const data = await res.json();
      setGitStatus(data.branch ? `${data.branch} • ${data.statusSummary}` : 'Git Ready');
    } catch {
      setGitStatus('Git ready');
    }
  };

  useEffect(() => {
    fetch('/api/workspace/current')
      .then((r) => r.json())
      .then((d) => {
        if (d.workspaceRoot) {
          setWorkspaceRoot(d.workspaceRoot);
          setWorkspaceName(d.name || 'OmniWorkspace');
        }
      })
      .catch(() => {});
    loadDirectory(currentPath);
    if (initialFile) {
      loadFile(initialFile);
    }
    refreshGit();
  }, []);

  useEffect(() => {
    if (initialFile) {
      loadFile(initialFile);
    }
  }, [initialFile]);

  // Global keybindings inside editor: Cmd+F, Cmd+S, Cmd+G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentFile();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGoToLine((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Match calculator for Find & Replace
  const getMatches = () => {
    if (!findQuery || !activeTab?.content) return [];
    const matches: number[] = [];
    const content = activeTab.content;
    try {
      let regex: RegExp;
      if (isRegex) {
        regex = new RegExp(findQuery, isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, isCaseSensitive ? 'g' : 'gi');
      }
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push(match.index);
      }
    } catch {
      // regex syntax error
    }
    return matches;
  };

  const matches = getMatches();

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    jumpToIndex(matches[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    jumpToIndex(matches[prevIdx]);
  };

  const jumpToIndex = (index: number) => {
    if (!textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(index, index + findQuery.length);
  };

  const handleReplace = () => {
    if (!matches.length || !activeTab) return;
    const idx = matches[currentMatchIndex] || matches[0];
    const before = activeTab.content.slice(0, idx);
    const after = activeTab.content.slice(idx + findQuery.length);
    const updated = before + replaceQuery + after;
    updateActiveContent(updated);
  };

  const handleReplaceAll = () => {
    if (!findQuery || !activeTab) return;
    try {
      let regex: RegExp;
      if (isRegex) {
        regex = new RegExp(findQuery, isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, isCaseSensitive ? 'g' : 'gi');
      }
      const updated = activeTab.content.replace(regex, replaceQuery);
      updateActiveContent(updated);
    } catch {
      // ignore
    }
  };

  const handleGoToLine = (e: React.FormEvent) => {
    e.preventDefault();
    const lineNum = parseInt(targetLineInput, 10);
    if (isNaN(lineNum) || lineNum < 1 || !textareaRef.current || !activeTab) return;
    const lines = activeTab.content.split('\n');
    let charOffset = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      charOffset += lines[i].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charOffset, charOffset);
    setShowGoToLine(false);
    setTargetLineInput('');
  };

  const handleTextareaSelect = () => {
    if (!textareaRef.current) return;
    const selStart = textareaRef.current.selectionStart;
    const contentUpToCursor = textareaRef.current.value.slice(0, selStart);
    const lines = contentUpToCursor.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Detect file language
  const getLanguage = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'TypeScript';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'JavaScript';
    if (filename.endsWith('.json')) return 'JSON';
    if (filename.endsWith('.css')) return 'CSS';
    if (filename.endsWith('.html')) return 'HTML';
    if (filename.endsWith('.md')) return 'Markdown';
    if (filename.endsWith('.sql')) return 'SQL';
    if (filename.endsWith('.sh') || filename.endsWith('.bat')) return 'Shell';
    return 'Plain Text';
  };

  // Diff lines calculator for Side-by-Side Diff mode
  const computeDiffLines = () => {
    const origLines = (activeTab?.originalContent || '').split('\n');
    const currLines = (activeTab?.content || '').split('\n');
    const maxLines = Math.max(origLines.length, currLines.length);
    const diffRows = [];

    for (let i = 0; i < maxLines; i++) {
      const orig = origLines[i] !== undefined ? origLines[i] : null;
      const curr = currLines[i] !== undefined ? currLines[i] : null;
      let status: 'same' | 'added' | 'removed' | 'modified' = 'same';
      if (orig === null && curr !== null) status = 'added';
      else if (orig !== null && curr === null) status = 'removed';
      else if (orig !== curr) status = 'modified';

      diffRows.push({ lineNum: i + 1, orig, curr, status });
    }
    return diffRows;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(fileFilter.toLowerCase())
  );

  const linesCount = (activeTab?.content || '').split('\n').length;
  const byteSize = new Blob([activeTab?.content || '']).size;

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1px', background: 'var(--border-subtle)' }}>
      {/* File Explorer Sidebar */}
      <div
        style={{
          width: '240px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
          <span>FILES & EXPLORER</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="icon-btn"
              style={{ padding: '2px', border: 'none' }}
              onClick={() => setShowOpenFolderModal(true)}
              title="Open Project Folder / Change Workspace"
            >
              <FolderOpen size={13} color="var(--accent-primary)" />
            </button>
            <button
              className="icon-btn"
              style={{ padding: '2px', border: 'none' }}
              onClick={() => setShowNewFileInput(!showNewFileInput)}
              title="New File"
            >
              <Plus size={13} />
            </button>
            <button
              className="icon-btn"
              style={{ padding: '2px', border: 'none' }}
              onClick={() => loadDirectory(currentPath)}
              title="Refresh Files"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Current Folder Breadcrumb */}
        <div
          style={{
            padding: '4px 8px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          <Folder size={11} color="var(--accent-primary)" />
          <span
            style={{ fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => navigateDirectory('.')}
            title="Go to project root"
          >
            {workspaceName}
          </span>
          {currentPath !== '.' && (
            <>
              <ChevronRight size={10} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-primary)' }}>{currentPath}</span>
            </>
          )}
        </div>

        {/* Quick Search Filter */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              placeholder="Filter files..."
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

        {/* New File Inline Form */}
        {showNewFileInput && (
          <form onSubmit={handleCreateFile} style={{ padding: '6px 8px', background: 'var(--bg-tertiary)' }}>
            <input
              type="text"
              autoFocus
              placeholder="Filename (e.g. index.ts)..."
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              style={{
                width: '100%',
                height: '24px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 6px',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
              }}
            />
          </form>
        )}

        {/* File List Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
          {currentPath !== '.' && currentPath !== '' && (
            <div
              onClick={navigateUp}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.03)',
                marginBottom: '4px',
              }}
              title="Go up to parent directory"
            >
              <RotateCcw size={12} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600 }}>.. (Parent Directory)</span>
            </div>
          )}

          {filteredFiles.map((item, idx) => {
            const itemFullPath = currentPath === '.' ? item.name : `${currentPath}/${item.name}`;
            const isActive = activeTabPath === itemFullPath || activeTabPath === item.name;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: isActive ? 'var(--text-accent)' : 'var(--text-primary)',
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (item.isDirectory) {
                    navigateDirectory(itemFullPath);
                  } else {
                    loadFile(itemFullPath);
                  }
                }}
                title={item.isDirectory ? `Browse folder ${item.name}` : `Open file ${item.name}`}
              >
                {item.isDirectory ? (
                  <Folder size={13} color="var(--accent-primary)" />
                ) : (
                  <File size={13} color="var(--text-muted)" />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Git Branch Badge */}
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <GitBranch size={13} color="var(--accent-primary)" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gitStatus}
          </span>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Multi-Tab Bar */}
        <div
          style={{
            height: '38px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: '12px',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', overflowX: 'auto' }}>
            {openTabs.map((tab) => {
              const isActive = tab.path === activeTabPath;
              return (
                <div
                  key={tab.path}
                  onClick={() => setActiveTabPath(tab.path)}
                  style={{
                    height: '34px',
                    background: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                    borderTop: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    borderRight: '1px solid var(--border-subtle)',
                    padding: '0 12px',
                    fontSize: '12px',
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <File size={12} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                  <span>{tab.path}</span>
                  {tab.isDirty && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--warning)',
                      }}
                      title="Unsaved changes"
                    />
                  )}
                  <button
                    onClick={(e) => closeTab(e, tab.path)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* View Mode Switcher: Editor vs Diff */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                className={`tab-btn ${viewMode === 'editor' ? 'active' : ''}`}
                style={{ height: '22px', padding: '0 8px', fontSize: '11px' }}
                onClick={() => setViewMode('editor')}
                title="Code Editor"
              >
                <Code2 size={12} />
                <span>Code</span>
              </button>
              <button
                className={`tab-btn ${viewMode === 'diff' ? 'active' : ''}`}
                style={{ height: '22px', padding: '0 8px', fontSize: '11px' }}
                onClick={() => setViewMode('diff')}
                title="Side-by-Side Diff against disk file"
              >
                <GitCompare size={12} />
                <span>Diff {activeTab?.isDirty ? '(Modified)' : ''}</span>
              </button>
            </div>

            {/* Find & Replace Toggle */}
            <button
              className={`icon-btn ${showFindReplace ? 'active' : ''}`}
              style={{ height: '26px', width: '26px' }}
              onClick={() => setShowFindReplace(!showFindReplace)}
              title="Find & Replace (Cmd+F)"
            >
              <Search size={13} />
            </button>

            {onAskAi && (
              <>
                <button
                  className="btn-secondary"
                  style={{ height: '26px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() =>
                    onAskAi(
                      `Review and fix issues in '${activeTab.path}'. Inspect typing, logic, security, and edge cases. Apply fixes and verify.`,
                      activeTab.path
                    )
                  }
                  title="Review & Fix with AI"
                >
                  <Sparkles size={12} color="var(--accent-primary)" />
                  <span>Review & Fix</span>
                </button>
                <button
                  className="btn-secondary"
                  style={{ height: '26px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() =>
                    onAskAi(
                      `Run the automated test suite for '${activeTab.path}'. If any tests fail, diagnose the root cause, repair the code, and re-verify until clean.`,
                      activeTab.path
                    )
                  }
                  title="Run Tests & Repair Loop"
                >
                  <Play size={11} color="var(--success)" />
                  <span>Test & Repair</span>
                </button>
                <button
                  className="btn-secondary"
                  style={{ height: '26px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() =>
                    onAskAi(
                      `Explain and inspect the current file '${activeTab.path}':\n\n${activeTab.content.slice(0, 3000)}`,
                      activeTab.path
                    )
                  }
                  title="Explain with AI Co-Pilot"
                >
                  <Code2 size={12} />
                  <span>Explain</span>
                </button>
              </>
            )}

            <button
              className="btn-primary"
              style={{ height: '26px', padding: '0 10px', fontSize: '11px' }}
              onClick={saveCurrentFile}
              disabled={isSaving}
              title="Save File (Cmd+S)"
            >
              {saveSuccess ? (
                <>
                  <Check size={12} />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save size={12} />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Antigravity AI Prompt-to-Code Bar */}
        <div
          style={{
            padding: '8px 14px',
            background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={13} color="#fff" />
            </div>

            <input
              type="text"
              placeholder={`Prompt AI to develop in '${activeTab?.path || 'workspace'}' (e.g. "Create auth middleware with JWT", "Build responsive portfolio page", "Fix errors")...`}
              value={aiDevelopPrompt}
              onChange={(e) => setAiDevelopPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAiDevelop();
                }
              }}
              style={{
                flex: 1,
                height: '30px',
                background: '#070b14',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 12px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />

            <button
              className="btn-primary"
              style={{
                height: '30px',
                padding: '0 12px',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                border: 'none',
              }}
              onClick={handleAiDevelop}
              disabled={isAiStreaming || !aiDevelopPrompt.trim()}
              title="Execute with AI (Enter)"
            >
              <Sparkles size={12} />
              <span>{isAiStreaming ? 'Developing...' : 'Develop'}</span>
            </button>
          </div>

          {/* Quick Development Chips & Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
              <span style={{ color: 'var(--text-muted)' }}>Quick Actions:</span>
              {[
                { label: '✨ Add Feature', prompt: `Add a feature to '${activeTab?.path}': ` },
                { label: '🐛 Fix Bugs', prompt: `Inspect and fix any bugs or type mismatches in '${activeTab?.path}'.` },
                { label: '🧪 Write Tests', prompt: `Create automated unit tests for '${activeTab?.path}' using vitest.` },
                { label: '⚡ Optimize', prompt: `Optimize performance and structure of '${activeTab?.path}'.` },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    setAiDevelopPrompt(chip.prompt);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '10.5px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {aiDevelopStatus && (
              <span style={{ color: '#38bdf8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
                {aiDevelopStatus}
              </span>
            )}
          </div>
        </div>

        {/* Find & Replace Bar */}
        {showFindReplace && (
          <div
            style={{
              padding: '8px 14px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {/* Find Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <Search size={12} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Find..."
                  value={findQuery}
                  onChange={(e) => {
                    setFindQuery(e.target.value);
                    setCurrentMatchIndex(0);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '160px',
                  }}
                />
                <button
                  onClick={() => setIsCaseSensitive(!isCaseSensitive)}
                  style={{
                    background: isCaseSensitive ? 'var(--accent-primary)' : 'transparent',
                    color: isCaseSensitive ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '2px',
                    padding: '1px 4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                  title="Match Case"
                >
                  Aa
                </button>
                <button
                  onClick={() => setIsRegex(!isRegex)}
                  style={{
                    background: isRegex ? 'var(--accent-primary)' : 'transparent',
                    color: isRegex ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '2px',
                    padding: '1px 4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                  title="Regex Mode"
                >
                  .*
                </button>
              </div>

              {/* Match Counter & Prev/Next */}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '70px' }}>
                {matches.length > 0 ? `${currentMatchIndex + 1} of ${matches.length}` : findQuery ? 'No matches' : ''}
              </span>
              <button className="icon-btn" onClick={handlePrevMatch} title="Previous Match" style={{ padding: '2px' }}>
                <ArrowUp size={13} />
              </button>
              <button className="icon-btn" onClick={handleNextMatch} title="Next Match" style={{ padding: '2px' }}>
                <ArrowDown size={13} />
              </button>

              {/* Replace Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', marginLeft: '8px' }}>
                <Replace size={12} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '160px',
                  }}
                />
              </div>
              <button className="btn-secondary" style={{ height: '24px', padding: '0 8px', fontSize: '11px' }} onClick={handleReplace} disabled={!matches.length}>
                Replace
              </button>
              <button className="btn-secondary" style={{ height: '24px', padding: '0 8px', fontSize: '11px' }} onClick={handleReplaceAll} disabled={!findQuery}>
                Replace All
              </button>
            </div>

            <button className="icon-btn" onClick={() => setShowFindReplace(false)} title="Close Search">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Go To Line Bar (Cmd+G) */}
        {showGoToLine && (
          <form
            onSubmit={handleGoToLine}
            style={{
              padding: '6px 14px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
            }}
          >
            <span>Jump to line:</span>
            <input
              type="number"
              min={1}
              max={linesCount}
              value={targetLineInput}
              onChange={(e) => setTargetLineInput(e.target.value)}
              placeholder={`1 - ${linesCount}`}
              autoFocus
              style={{
                width: '80px',
                height: '24px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 6px',
                color: 'var(--text-primary)',
              }}
            />
            <button type="submit" className="btn-primary" style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}>
              Go
            </button>
            <button type="button" className="icon-btn" onClick={() => setShowGoToLine(false)}>
              <X size={12} />
            </button>
          </form>
        )}

        {/* Main Editor vs Diff Canvas vs Empty Workspace Canvas */}
        {openTabs.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center',
              background: '#070b14',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.2))',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <Sparkles size={28} color="#38bdf8" />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              OmniWorkspace Code Studio
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 0 24px 0', lineHeight: 1.6 }}>
              Select a file from the explorer on the left to view or edit, or prompt your AI Co-Pilot to develop code directly in this workspace.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
              <button
                className="btn-primary"
                style={{ height: '32px', padding: '0 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowOpenFolderModal(true)}
              >
                <FolderOpen size={14} />
                <span>Open Project Folder</span>
              </button>
              <button
                className="btn-secondary"
                style={{ height: '32px', padding: '0 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowNewFileInput(true)}
              >
                <Plus size={14} />
                <span>Create New File</span>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                maxWidth: '460px',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Browse Files
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Click any file in the Explorer on the left to open it in a tab.
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Develop with AI
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Type in the bar above to generate, modify, or fix code in your project.
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'editor' ? (
          <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden', background: '#070b14' }}>
            {/* Gutter with line numbers */}
            <div
              style={{
                width: '48px',
                padding: '16px 0',
                textAlign: 'right',
                paddingRight: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12.5px',
                lineHeight: '1.6',
                color: 'var(--text-muted)',
                userSelect: 'none',
                background: '#050811',
                borderRight: '1px solid #1e293b',
                overflowY: 'hidden',
              }}
            >
              {Array.from({ length: Math.min(linesCount, 500) }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea Code Body */}
            <textarea
              ref={textareaRef}
              value={activeTab?.content || ''}
              onChange={(e) => updateActiveContent(e.target.value)}
              onSelect={handleTextareaSelect}
              onClick={handleTextareaSelect}
              onKeyUp={handleTextareaSelect}
              spellCheck={false}
              style={{
                flex: 1,
                background: '#070b14',
                color: '#e2e8f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '12.5px',
                lineHeight: '1.6',
                padding: '16px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                overflowY: 'auto',
                whiteSpace: 'pre',
              }}
            />
          </div>
        ) : (
          /* Side-by-Side Diff Viewer Canvas */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', overflow: 'hidden' }}>
            <div
              style={{
                height: '28px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                fontSize: '11.5px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ padding: '4px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                ORIGINAL (DISK)
              </div>
              <div style={{ padding: '4px 12px' }}>
                WORKING BUFFER (MODIFIED)
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              {computeDiffLines().map((row, i) => {
                let leftBg = 'transparent';
                let rightBg = 'transparent';
                if (row.status === 'added') {
                  rightBg = 'rgba(16, 185, 129, 0.15)';
                } else if (row.status === 'removed') {
                  leftBg = 'rgba(239, 68, 68, 0.15)';
                } else if (row.status === 'modified') {
                  leftBg = 'rgba(239, 68, 68, 0.15)';
                  rightBg = 'rgba(16, 185, 129, 0.15)';
                }

                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      lineHeight: '1.6',
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                    }}
                  >
                    {/* Left Pane: Original */}
                    <div
                      style={{
                        padding: '0 8px',
                        background: leftBg,
                        borderRight: '1px solid var(--border-subtle)',
                        color: row.status === 'removed' || row.status === 'modified' ? '#f87171' : '#94a3b8',
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', width: '30px', display: 'inline-block', userSelect: 'none' }}>
                        {row.orig !== null ? row.lineNum : ''}
                      </span>
                      {row.orig || ''}
                    </div>

                    {/* Right Pane: Modified */}
                    <div
                      style={{
                        padding: '0 8px',
                        background: rightBg,
                        color: row.status === 'added' || row.status === 'modified' ? '#34d399' : '#e2e8f0',
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', width: '30px', display: 'inline-block', userSelect: 'none' }}>
                        {row.curr !== null ? row.lineNum : ''}
                      </span>
                      {row.curr || ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Editor Footer Status Bar */}
        <div
          style={{
            height: '24px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>{linesCount} lines</span>
            <span>{(byteSize / 1024).toFixed(1)} KB</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>UTF-8</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
              {getLanguage(activeTabPath)}
            </span>
          </div>
        </div>
      </div>

      {/* Open Folder Modal */}
      {showOpenFolderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowOpenFolderModal(false)}
        >
          <div
            style={{
              width: '460px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Open Project Folder
                </h3>
              </div>
              <button className="icon-btn" onClick={() => setShowOpenFolderModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
              Enter the absolute path of the local directory you want to open in OmniWorkspace Code Studio:
            </p>

            <form onSubmit={handleOpenFolder}>
              <input
                type="text"
                autoFocus
                placeholder={workspaceRoot || '/Users/acadify/Documents/my-project'}
                value={folderInputPath}
                onChange={(e) => setFolderInputPath(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0 10px',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                  onClick={() => setShowOpenFolderModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ height: '30px', padding: '0 14px', fontSize: '12px' }}
                  disabled={!folderInputPath.trim()}
                >
                  Open Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
