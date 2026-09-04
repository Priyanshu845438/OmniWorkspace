import React from 'react';
import {
  Code2,
  Globe2,
  Database,
  BarChart3,
  Cpu,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface HomeViewProps {
  onSelectPerspective: (perspective: string) => void;
  onExecutePrompt: (prompt: string) => void;
  healthInfo: any;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectPerspective,
  onExecutePrompt,
  healthInfo,
}) => {
  const quickActions = [
    {
      title: 'Software Engineering',
      desc: 'Inspect project symbols, apply surgical code edits, run builds, and verify tests.',
      icon: Code2,
      perspective: 'code',
      prompt: 'Inspect the project architecture, review package dependencies, and run automated tests.',
    },
    {
      title: 'Web & Deep Research',
      desc: 'Synthesize evidence from public sources with fact-checking and explicit citations.',
      icon: Globe2,
      perspective: 'research',
      prompt: 'Research the latest advancements in open-source AI models and synthesize key takeaways.',
    },
    {
      title: 'Database & SQL Studio',
      desc: 'Inspect schemas, generate optimized queries, and view EXPLAIN execution plans.',
      icon: Database,
      perspective: 'sql',
      prompt: 'Inspect database tables and find top performing employees by sales revenue.',
    },
    {
      title: 'Data Analysis & Charts',
      desc: 'Inspect CSV/JSON datasets, calculate column statistics, and render dynamic charts.',
      icon: BarChart3,
      perspective: 'data',
      prompt: 'Inspect employee compensation distribution and compute salary summary statistics.',
    },
    {
      title: 'Workflow Automation',
      desc: 'Visual Directed Acyclic Graph (DAG) executor with triggers, actions, and conditions.',
      icon: Cpu,
      perspective: 'automation',
      prompt: 'Create a scheduled health check workflow that checks git status and verifies build.',
    },
    {
      title: 'Media Studio',
      desc: 'Multi-provider image generation, speech-to-text transcription, and neural TTS.',
      icon: ImageIcon,
      perspective: 'media',
      prompt: 'Generate an editorial high-resolution illustration of a modern AI workspace laboratory.',
    },
    {
      title: 'Document Analysis',
      desc: 'Parse technical specifications, Markdown, and TXT with structured summarization.',
      icon: FileText,
      perspective: 'documents',
      prompt: 'Summarize the core security policies and instruction boundaries defined in this project.',
    },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span className="badge badge-blue">Open Source AI Platform</span>
          <span className="badge badge-green">Local-First Privacy</span>
          <span className="badge badge-amber">BYOK Enabled</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.03em', marginBottom: '10px' }}>
          OmniWorkspace
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '750px' }}>
          A production-quality, model-agnostic workspace orchestrating{' '}
          <strong>MODEL + TOOL + AGENT + CONTEXT + DATA + WORKFLOW + VERIFICATION</strong>.
          Accomplish any digital engineering, research, and analysis task from one unified cockpit.
        </p>
      </div>

      {/* System Status Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <ShieldCheck size={16} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>SECURITY STATUS</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)' }}>Guarded (Level 0-4)</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Path shields & injection defense active
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <Zap size={16} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>REGISTERED TOOLS</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {healthInfo?.toolCount || 24} Active Tools
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Files, Code, Terminal, Git, Web, SQL, Media
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <Cpu size={16} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>MODEL ROUTING</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-primary)' }}>
            Auto Capability Routing
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            NVIDIA, OpenRouter, Ollama, OpenAI
          </div>
        </div>
      </div>

      {/* Task Launcher Grid */}
      <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
        Explore Specialized Workspaces
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {quickActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s, transform 0.15s',
                cursor: 'pointer',
              }}
              onClick={() => onSelectPerspective(action.perspective)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enter workspace →</span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>{action.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{action.desc}</p>
              </div>

              <button
                className="btn-secondary"
                style={{ marginTop: '16px', width: '100%', justifyContent: 'space-between', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onExecutePrompt(action.prompt);
                }}
              >
                <span>Run Agent Example</span>
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
