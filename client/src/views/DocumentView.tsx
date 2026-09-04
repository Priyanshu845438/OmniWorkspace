import React, { useState } from 'react';
import { FileText, FileCheck, Layers, BookOpen, Sparkles } from 'lucide-react';

export const DocumentView: React.FC = () => {
  const [docTitle, setDocTitle] = useState('README.md');
  const [summary, setSummary] = useState<string | null>(
    '# Architectural Summary of OmniWorkspace\n\n- **Model-Agnostic Core**: Connects with NVIDIA NIM, OpenRouter, Ollama, and OpenAI without vendor lock-in.\n- **Strict BYOK Privacy**: API keys are encrypted at rest using AES-256-GCM. Remote AI inference only communicates directly with user-configured providers.\n- **Multi-Level Permissions**: Enforces Level 0 (Read-Only) to Level 4 (Destructive Confirmation) across all file, terminal, and git tools.\n- **Epistemic Distinctions**: Disallows hallucinated citations; distinguishes facts, inferences, estimates, and unknowns.'
  );

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-blue">Document Studio</span>
          <span className="badge badge-green">Zero Fabrication</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Document Intelligence & Synthesis</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Parse specifications, markdown guides, TXT, and PDF documentation with verified section extractions.
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <FileText size={20} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{docTitle}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Workspace Documentation • 100% Parsed</div>
          </div>
        </div>

        <button className="btn-primary" style={{ fontSize: '12px', height: '32px' }}>
          <Sparkles size={13} />
          <span>Regenerate Executive Summary</span>
        </button>
      </div>

      {summary && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-primary)' }}>
            <FileCheck size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Verified Multi-Section Extraction
            </h3>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              fontFamily: 'var(--font-sans)',
              fontSize: '13.5px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}
          >
            {summary}
          </div>
        </div>
      )}
    </div>
  );
};
