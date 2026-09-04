import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileCode,
  Layers,
  Terminal,
  Sun,
  Moon,
  Shield,
  Play,
  ArrowRight,
  X,
  Code2,
  Database,
  Globe,
  Sliders,
  Cpu,
  FileText,
  Workflow,
  Image as ImageIcon,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  category: 'View' | 'File' | 'Action' | 'Terminal';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPerspective: (viewId: string) => void;
  onOpenFile: (filePath: string) => void;
  onExecuteCommand: (cmd: string) => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectPerspective,
  onOpenFile,
  onExecuteCommand,
  onToggleTheme,
  theme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load workspace files for instant navigation
  useEffect(() => {
    if (isOpen) {
      fetch('/api/workspace/files?path=.')
        .then((res) => res.json())
        .then((data) => {
          if (data.items) {
            const fileNames = data.items
              .filter((i: any) => i.isFile)
              .map((i: any) => i.name);
            setWorkspaceFiles(fileNames);
          }
        })
        .catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  // Static items for views and actions
  const viewItems: CommandItem[] = [
    {
      id: 'view_home',
      category: 'View',
      title: 'Home Dashboard',
      subtitle: 'System overview & perspective launcher',
      icon: <Layers size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('home');
        onClose();
      },
    },
    {
      id: 'view_chat',
      category: 'View',
      title: 'AI Chat Co-Pilot',
      subtitle: 'Universal conversational model orchestrator',
      icon: <Cpu size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('chat');
        onClose();
      },
    },
    {
      id: 'view_code',
      category: 'View',
      title: 'Code Studio',
      subtitle: 'Multi-tab editor, git diff, and AST inspection',
      icon: <Code2 size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('code');
        onClose();
      },
    },
    {
      id: 'view_arch',
      category: 'View',
      title: 'Architecture Visualizer',
      subtitle: 'Module dependency graph & circular cycle detector',
      icon: <Workflow size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('architecture');
        onClose();
      },
    },
    {
      id: 'view_research',
      category: 'View',
      title: 'Research & Web Agent',
      subtitle: 'Live web scraping, source ranking & facts',
      icon: <Globe size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('research');
        onClose();
      },
    },
    {
      id: 'view_data',
      category: 'View',
      title: 'Data & Analytics Studio',
      subtitle: 'CSV statistics, dynamic SVG charts & percentiles',
      icon: <Database size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('data');
        onClose();
      },
    },
    {
      id: 'view_sql',
      category: 'View',
      title: 'SQL Studio & Query Engine',
      subtitle: 'SQLite schema browser, query plans & export',
      icon: <Database size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('sql');
        onClose();
      },
    },
    {
      id: 'view_automation',
      category: 'View',
      title: 'Automation & DAG Workflows',
      subtitle: 'Visual node pipeline orchestration & condition branches',
      icon: <Workflow size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('automation');
        onClose();
      },
    },
    {
      id: 'view_media',
      category: 'View',
      title: 'Generative Media Studio',
      subtitle: 'Image, video & audio multi-modal generation',
      icon: <ImageIcon size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('media');
        onClose();
      },
    },
    {
      id: 'view_docs',
      category: 'View',
      title: 'Document Intelligence',
      subtitle: 'Executive synthesis, entities & outline extraction',
      icon: <FileText size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('documents');
        onClose();
      },
    },
    {
      id: 'view_models',
      category: 'View',
      title: 'Model & BYOK Manager',
      subtitle: 'NVIDIA, OpenRouter, Ollama & Custom APIs',
      icon: <Sliders size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('models');
        onClose();
      },
    },
    {
      id: 'view_settings',
      category: 'View',
      title: 'Settings & Security Manifesto',
      subtitle: '0% telemetry, permissions & diagnostics',
      icon: <Shield size={14} color="var(--accent-primary)" />,
      action: () => {
        onSelectPerspective('settings');
        onClose();
      },
    },
  ];

  const actionItems: CommandItem[] = [
    {
      id: 'act_theme',
      category: 'Action',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle workspace visual theme',
      icon: theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />,
      action: () => {
        onToggleTheme();
        onClose();
      },
    },
    {
      id: 'act_run_tests',
      category: 'Terminal',
      title: 'Run Test Suite (npm test)',
      subtitle: 'Execute full Vitest test suites in sandbox terminal',
      icon: <Play size={14} color="var(--success)" />,
      action: () => {
        onExecuteCommand('npm test');
        onClose();
      },
    },
    {
      id: 'act_git_status',
      category: 'Terminal',
      title: 'Check Git Status',
      subtitle: 'Inspect modified and untracked files',
      icon: <Terminal size={14} color="var(--text-accent)" />,
      action: () => {
        onExecuteCommand('git status');
        onClose();
      },
    },
    {
      id: 'act_git_diff',
      category: 'Terminal',
      title: 'Inspect Git Diff',
      subtitle: 'Show uncommitted line changes',
      icon: <Terminal size={14} color="var(--text-accent)" />,
      action: () => {
        onExecuteCommand('git diff');
        onClose();
      },
    },
  ];

  const fileItems: CommandItem[] = workspaceFiles.map((filename) => ({
    id: `file_${filename}`,
    category: 'File',
    title: filename,
    subtitle: 'Open file in Code Studio',
    icon: <FileCode size={14} color="var(--text-muted)" />,
    action: () => {
      onOpenFile(filename);
      onClose();
    },
  }));

  const allItems: CommandItem[] = [...viewItems, ...fileItems, ...actionItems];

  const filteredItems = allItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '620px',
          maxWidth: '92vw',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Search size={18} color="var(--accent-primary)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search files, or navigate perspectives..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14.5px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ESC to exit
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No matching commands or files found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                    border: isSelected ? '1px solid var(--border-accent)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-primary)',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: isSelected ? 'var(--text-accent)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                      }}
                    >
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={13} color="var(--accent-primary)" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div
          style={{
            padding: '8px 14px',
            background: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span><strong style={{ color: 'var(--text-secondary)' }}>↑↓</strong> to navigate</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>↵</strong> to select</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>esc</strong> to dismiss</span>
          </div>
          <span>OmniWorkspace Universal Palette</span>
        </div>
      </div>
    </div>
  );
};
