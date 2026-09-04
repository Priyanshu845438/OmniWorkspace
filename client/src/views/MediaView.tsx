import React, { useState } from 'react';
import { Image, Video, Music, Sparkles, Download, Layers } from 'lucide-react';

export const MediaView: React.FC = () => {
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [prompt, setPrompt] = useState(
    'A futuristic desktop workspace overlooking a neon cybernetic city, ultra-detailed ray tracing.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
  );

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedUrl(
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
      );
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-blue">Generative Media Studio</span>
          <span className="badge badge-green">Unified Media Router</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Creative Multimodal Studio</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Coordinate image, video, and audio synthesis pipelines across configured media models.
        </p>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className={`btn-secondary ${mediaType === 'image' ? 'active' : ''}`}
          onClick={() => setMediaType('image')}
          style={{ fontSize: '13px' }}
        >
          <Image size={15} />
          <span>Image Generation</span>
        </button>
        <button
          className={`btn-secondary ${mediaType === 'video' ? 'active' : ''}`}
          onClick={() => setMediaType('video')}
          style={{ fontSize: '13px' }}
        >
          <Video size={15} />
          <span>Video Pipeline</span>
        </button>
        <button
          className={`btn-secondary ${mediaType === 'audio' ? 'active' : ''}`}
          onClick={() => setMediaType('audio')}
          style={{ fontSize: '13px' }}
        >
          <Music size={15} />
          <span>Audio & Voice Synthesis</span>
        </button>
      </div>

      {/* Generation Prompt Box */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}
      >
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter creative prompt..."
          style={{
            width: '100%',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '12px',
            fontSize: '13.5px',
            outline: 'none',
            resize: 'none',
            marginBottom: '12px',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Provider: Auto Media Gateway</span>
            <span>•</span>
            <span>Ratio: 16:9</span>
          </div>

          <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating}>
            <Sparkles size={14} />
            <span>{isGenerating ? 'Rendering...' : 'Generate Media'}</span>
          </button>
        </div>
      </div>

      {/* Preview Canvas */}
      {generatedUrl && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Render Output (1024x576)</span>
            <a
              href={generatedUrl}
              target="_blank"
              download="generated-media.png"
              className="btn-secondary"
              style={{ height: '26px', padding: '0 8px', fontSize: '11px', textDecoration: 'none' }}
            >
              <Download size={12} />
              <span>Export Asset</span>
            </a>
          </div>

          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', background: '#050811' }}>
            <img
              src={generatedUrl}
              alt="Generated Media Preview"
              style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
