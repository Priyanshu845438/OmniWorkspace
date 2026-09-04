import React from 'react';
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
} from 'lucide-react';

interface SidebarProps {
  activePerspective: string;
  onSelectPerspective: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePerspective,
  onSelectPerspective,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'architecture', label: 'Graph', icon: Network },
    { id: 'research', label: 'Research', icon: Globe2 },
    { id: 'data', label: 'Data', icon: BarChart3 },
    { id: 'sql', label: 'SQL', icon: Database },
    { id: 'automation', label: 'Auto', icon: Cpu },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'documents', label: 'Docs', icon: FileText },
  ];

  const bottomItems = [
    { id: 'models', label: 'Models', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="left-sidebar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', width: '100%', alignItems: 'center' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePerspective === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPerspective(item.id)}
              title={item.label}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          width: '100%',
          alignItems: 'center',
          paddingTop: '4px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePerspective === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPerspective(item.id)}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
