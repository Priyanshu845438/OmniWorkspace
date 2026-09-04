import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Save,
  Play,
  GitBranch,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';

interface FileItem {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export const CodeView: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [activeFile, setActiveFile] = useState<string>('package.json');
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [gitStatus, setGitStatus] = useState<string>('Checking...');

  const loadDirectory = async (dir: string) => {
    try {
      const res = await fetch(`/api/workspace/files?path=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.items) {
        setFiles(data.items);
      }
    } catch {
      // ignore error
    }
  };

  const loadFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
        setActiveFile(filePath);
      }
    } catch {
      // ignore error
    }
  };

  const saveCurrentFile = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/workspace/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: fileContent }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } finally {
      setIsSaving(false);
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
    loadDirectory(currentPath);
    loadFile('package.json');
    refreshGit();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1px', background: 'var(--border-subtle)' }}>
      {/* File Explorer Pane */}
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
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
          }}
        >
          <span>EXPLORER</span>
          <button
            className="icon-btn"
            style={{ padding: '2px', border: 'none' }}
            onClick={() => loadDirectory(currentPath)}
            title="Refresh Explorer"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
          {files.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12.5px',
                color: activeFile === item.name ? 'var(--text-accent)' : 'var(--text-primary)',
                background: activeFile === item.name ? 'var(--bg-tertiary)' : 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (item.isFile) {
                  loadFile(item.name);
                }
              }}
            >
              {item.isDirectory ? (
                <Folder size={14} color="var(--accent-primary)" />
              ) : (
                <File size={14} color="var(--text-muted)" />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
            </div>
          ))}
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
        {/* Editor Tab Bar */}
        <div
          style={{
            height: '38px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: 'var(--bg-primary)',
                borderTop: '2px solid var(--accent-primary)',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <File size={13} color="var(--accent-primary)" />
              <span>{activeFile}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-primary"
              style={{ height: '28px', padding: '0 10px', fontSize: '11.5px' }}
              onClick={saveCurrentFile}
              disabled={isSaving}
            >
              {saveSuccess ? (
                <>
                  <Check size={13} />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              background: '#070b14',
              color: '#e2e8f0',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.6',
              padding: '16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
