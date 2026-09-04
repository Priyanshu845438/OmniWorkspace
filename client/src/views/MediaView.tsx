import React, { useState, useEffect } from 'react';
import { Image, Video, Music, Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface MediaViewProps {
  onAskAi?: (prompt: string) => void;
}

export const MediaView: React.FC<MediaViewProps> = ({ onAskAi }) => {
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [prompt, setPrompt] = useState(
    'A futuristic desktop workspace overlooking a neon cybernetic city, ultra-detailed ray tracing.'
  );
  const [capabilityStatus, setCapabilityStatus] = useState<string>('Checking capabilities...');
  const [hasCapableModel, setHasCapableModel] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        const models = data.models || [];

        const capable = models.some(
          (m: any) =>
            m.enabled &&
            (m.capabilities.includes('image_generation') ||
              (mediaType === 'image' && m.capabilities.includes('vision')))
        );
        setHasCapableModel(capable);
        setCapabilityStatus(
          capable
            ? 'Multimodal vision routing supported by configured models'
            : 'No active provider with native media generation configured'
        );
      })
      .catch(() => {
        setCapabilityStatus('Could not query model registry');
      });
  }, [mediaType]);

  const handleAction = () => {
    if (onAskAi) {
      onAskAi(
        `[Creative Multimodal Task] Type: ${mediaType.toUpperCase()}\nPrompt: "${prompt}"\n\nFormulate the complete technical prompt specification, parameter bounds, aspect ratios, negative prompts, and pipeline instructions for media models.`
      );
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-blue">Generative Media Studio</span>
          <span className={`badge ${hasCapableModel ? 'badge-green' : 'badge-amber'}`}>
            {hasCapableModel ? 'Multimodal Compatible' : 'Capability Notice'}
          </span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Creative Multimodal Studio</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          Coordinate image, video, and audio synthesis pipelines across configured media models without simulated mockups.
        </p>
      </div>

      {/* Capability Health Banner */}
      <div
        style={{
          background: hasCapableModel ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
          border: `1px solid ${hasCapableModel ? '#22c55e' : '#eab308'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: hasCapableModel ? '#86efac' : '#fde047',
        }}
      >
        {hasCapableModel ? <CheckCircle size={16} color="#22c55e" /> : <AlertTriangle size={16} color="#eab308" />}
        <span>{capabilityStatus}</span>
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
            <span>Target: {mediaType.toUpperCase()} Pipeline</span>
            <span>•</span>
            <span>Ratio: 16:9</span>
          </div>

          <button className="btn-primary" onClick={handleAction}>
            <Sparkles size={14} />
            <span>Generate Prompt & Specifications</span>
          </button>
        </div>
      </div>

      {/* Provider Instructions */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
          <Info size={15} color="var(--accent-primary)" />
          <span>Native Provider Capability Requirements</span>
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          OmniWorkspace never fakes media renders with stock photos. To execute live image or video diffusion, configure a provider supporting <code>image_generation</code> (such as OpenAI DALL-E or Flux via OpenRouter) in the <strong>Model Manager</strong> view. Multimodal reasoning models like Claude 3.5 Sonnet and Gemini 2.0 Flash are currently available for vision understanding and prompt synthesis.
        </p>
      </div>
    </div>
  );
};
