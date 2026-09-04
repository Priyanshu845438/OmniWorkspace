import { ModelCapability, ModelType, AgentType } from '../../types/index.js';

export class CapabilityRegistry {
  public static readonly ALL_CAPABILITIES: ModelCapability[] = [
    'chat',
    'reasoning',
    'coding',
    'code_completion',
    'tool_calling',
    'structured_output',
    'vision',
    'image_generation',
    'image_editing',
    'video_generation',
    'video_editing',
    'audio_generation',
    'speech_to_text',
    'text_to_speech',
    'embeddings',
    'long_context',
    'streaming',
  ];

  public static getRequiredCapabilitiesForAgent(agentType: AgentType): ModelCapability[] {
    switch (agentType) {
      case 'coding':
        return ['coding', 'tool_calling', 'structured_output'];
      case 'research':
        return ['reasoning', 'tool_calling', 'long_context'];
      case 'data':
        return ['reasoning', 'structured_output', 'tool_calling'];
      case 'sql':
        return ['coding', 'reasoning', 'structured_output'];
      case 'automation':
        return ['reasoning', 'tool_calling', 'structured_output'];
      case 'media':
        return ['vision', 'image_generation'];
      case 'document':
        return ['long_context', 'structured_output', 'reasoning'];
      case 'general':
      default:
        return ['chat', 'reasoning', 'tool_calling'];
    }
  }

  public static scoreModelMatch(
    modelCapabilities: ModelCapability[],
    requiredCapabilities: ModelCapability[]
  ): { score: number; missing: ModelCapability[]; matched: ModelCapability[] } {
    const matched: ModelCapability[] = [];
    const missing: ModelCapability[] = [];

    for (const req of requiredCapabilities) {
      if (modelCapabilities.includes(req)) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    // Percentage of required capabilities satisfied
    const score = requiredCapabilities.length > 0
      ? (matched.length / requiredCapabilities.length) * 100
      : 100;

    return { score, missing, matched };
  }
}
