import React, { useState } from 'react';
import {
  Home,
  MessageSquare,
  Code2,
  Network,
  Globe2,
  Database,
  BarChart3,
  Cpu,
  Image as ImageIcon,
  FileText,
  Sliders,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  activePerspective: string;
  onSelectPerspective: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePerspective,
  onSelectPerspective,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    { id: 'home', label: 'Home', fullLabel: 'Home Dashboard', icon: Home },
    { id: 'chat', label: 'Chat', fullLabel: 'AI Co-Pilot Chat', icon: MessageSquare },
    { id: 'code', label: 'Code', fullLabel: 'Code Studio', icon: Code2 },
    { id: 'architecture', label: 'Graph', fullLabel: 'Architecture Graph', icon: Network },
    { id: 'research', label: 'Research', fullLabel: 'Deep Web Research', icon: Globe2 },
    { id: 'data', label: 'Data', fullLabel: 'Data Analytics', icon: BarChart3 },
    { id: 'sql', label: 'SQL', fullLabel: 'SQL Database', icon: Database },
    { id: 'automation', label: 'Auto', fullLabel: 'Workflows (DAG)', icon: Cpu },
    { id: 'media', label: 'Media', fullLabel: 'Media Studio', icon: ImageIcon },
    { id: 'documents', label: 'Docs', fullLabel: 'Document Analyzer', icon: FileText },
  ];

  const bottomItems = [
    { id: 'models', label: 'Models', fullLabel: 'Model & Vault Registry', icon: Sliders },
    { id: 'settings', label: 'Settings', fullLabel: 'System Settings', icon: Settings },
  ];

  return (
    <nav className={`left-sidebar ${isExpanded ? 'expanded' : ''}`}>
      {/* Sidebar Header & Toggle */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'space-between' : 'center',
          padding: isExpanded ? '2px 10px 8px 10px' : '0 0 6px 0',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '6px',
        }}
      >
        {isExpanded && (
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            WORKSPACES
          </span>
        )}
        <button
          className="icon-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
          style={{ width: '24px', height: '24px', border: 'none', background: 'transparent' }}
        >
          {isExpanded ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
        </button>
      </div>

      {/* Primary Perspectives Navigation - 100% Left Aligned */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePerspective === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPerspective(item.id)}
              title={item.fullLabel}
            >
              <span className="nav-item-icon">
                <Icon size={16} />
              </span>
              <span className="nav-item-label">
                {isExpanded ? item.fullLabel : item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Settings & Vault Navigation - 100% Left Aligned */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          width: '100%',
          paddingTop: '6px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {isExpanded && (
          <div style={{ padding: '0 10px 4px 10px', fontSize: '9.5px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            CONFIGURATION
          </div>
        )}
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePerspective === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPerspective(item.id)}
              title={item.fullLabel}
            >
              <span className="nav-item-icon">
                <Icon size={16} />
              </span>
              <span className="nav-item-label">
                {isExpanded ? item.fullLabel : item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
