import { ModelDefinition, ProviderConfig, ProviderType } from '../../types/index.js';

export class ModelRegistry {
  private models: Map<string, ModelDefinition> = new Map();
  private providers: Map<string, ProviderConfig> = new Map();

  constructor() {
    this.initDefaultCatalog();
  }

  private initDefaultCatalog() {
    // 1. NVIDIA Hosted Models (Active on integrate.api.nvidia.com)
    const nvidiaModels: ModelDefinition[] = [
      {
        id: 'nvidia/nemotron-3-ultra-550b-a55b',
        name: 'NVIDIA Nemotron 3 Ultra 550B',
        provider: 'nvidia',
        type: 'reasoning',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'structured_output', 'streaming', 'long_context'],
        contextWindow: 128000,
        priority: 99,
        enabled: true,
        description: 'NVIDIA flagship 550B ultra parameter model with deep reasoning and thinking traces.',
      },
      {
        id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        name: 'NVIDIA Nemotron 3 Nano Omni',
        provider: 'nvidia',
        type: 'reasoning',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'structured_output', 'streaming', 'long_context'],
        contextWindow: 128000,
        priority: 98,
        enabled: true,
        description: 'NVIDIA flagship omni-reasoning and coding model with active high-throughput inference.',
      },
      {
        id: 'deepseek-ai/deepseek-v4-flash-0731',
        name: 'DeepSeek V4 Flash (Thinking)',
        provider: 'nvidia',
        type: 'reasoning',
        capabilities: ['chat', 'reasoning', 'coding', 'streaming', 'long_context'],
        contextWindow: 128000,
        priority: 97,
        enabled: true,
        description: 'DeepSeek V4 high-speed thinking and reasoning model hosted on NVIDIA NIM.',
      },
      {
        id: 'deepseek-ai/deepseek-v4-pro-0813',
        name: 'DeepSeek V4 Pro',
        provider: 'nvidia',
        type: 'coding',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'streaming', 'long_context'],
        contextWindow: 128000,
        priority: 96,
        enabled: true,
        description: 'DeepSeek V4 state-of-the-art coding and problem-solving model.',
      },
      {
        id: 'moonshotai/kimi-k3',
        name: 'Kimi K3 (Moonshot)',
        provider: 'nvidia',
        type: 'llm',
        capabilities: ['chat', 'coding', 'vision', 'long_context', 'streaming'],
        contextWindow: 200000,
        priority: 95,
        enabled: true,
        description: 'Moonshot Kimi K3 200K long context and multimodal model hosted on NVIDIA NIM.',
      },
      {
        id: 'meta/muse-glimmer-30b',
        name: 'Meta Muse Glimmer 30B',
        provider: 'nvidia',
        type: 'reasoning',
        capabilities: ['chat', 'reasoning', 'coding', 'streaming'],
        contextWindow: 64000,
        priority: 94,
        enabled: true,
        description: 'Meta Muse Glimmer elite reasoning and logic model on NVIDIA NIM.',
      },
      {
        id: 'google/diffusiongemma-26b-a4b-it',
        name: 'DiffusionGemma 26B (Vision)',
        provider: 'nvidia',
        type: 'vision',
        capabilities: ['chat', 'vision', 'reasoning', 'streaming'],
        contextWindow: 64000,
        priority: 93,
        enabled: true,
        description: 'Google multimodal vision and thinking architecture hosted on NVIDIA NIM.',
      },
      {
        id: 'poolside/laguna-xs-2.1',
        name: 'Poolside Laguna XS 2.1',
        provider: 'nvidia',
        type: 'coding',
        capabilities: ['coding', 'code_completion', 'streaming'],
        contextWindow: 32768,
        priority: 92,
        enabled: true,
        description: 'High-speed autonomous coding model hosted on NVIDIA NIM.',
      },
      {
        id: 'mistralai/mistral-nemotron',
        name: 'Mistral Nemotron',
        provider: 'nvidia',
        type: 'coding',
        capabilities: ['chat', 'coding', 'reasoning', 'tool_calling', 'streaming'],
        contextWindow: 64000,
        priority: 91,
        enabled: true,
        description: 'Mistral Nemotron instruction and coding model.',
      },
      {
        id: 'meta/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision',
        provider: 'nvidia',
        type: 'vision',
        capabilities: ['chat', 'vision', 'reasoning', 'streaming'],
        contextWindow: 128000,
        priority: 90,
        enabled: true,
        description: 'Multimodal vision and text instruction model hosted on NVIDIA NIM.',
      },
    ];

    // 2. Google Gemini Provider
    const geminiModels: ModelDefinition[] = [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
        type: 'llm',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'vision', 'streaming', 'long_context', 'structured_output'],
        contextWindow: 1048576,
        priority: 99,
        enabled: true,
        description: 'Google flagship high-speed multimodal intelligence with 1M token context.',
      },
      {
        id: 'gemini-2.0-flash-thinking-exp',
        name: 'Gemini 2.0 Flash Thinking',
        provider: 'gemini',
        type: 'reasoning',
        capabilities: ['reasoning', 'coding', 'chat', 'vision', 'streaming', 'long_context'],
        contextWindow: 1048576,
        priority: 98,
        enabled: true,
        description: 'Google experimental reasoning model with native step-by-step thinking traces.',
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        type: 'coding',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'vision', 'streaming', 'long_context'],
        contextWindow: 2097152,
        priority: 96,
        enabled: true,
        description: 'Google 2M context flagship for massive repository and documentation analysis.',
      },
    ];

    // 3. OpenRouter Provider
    const openRouterModels: ModelDefinition[] = [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'openrouter',
        type: 'coding',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'vision', 'structured_output', 'streaming', 'long_context'],
        contextWindow: 200000,
        priority: 100,
        enabled: true,
        description: 'State-of-the-art coding and reasoning assistant via OpenRouter.',
      },
      {
        id: 'google/gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash (OpenRouter)',
        provider: 'openrouter',
        type: 'llm',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'vision', 'streaming', 'long_context'],
        contextWindow: 1048576,
        priority: 92,
        enabled: true,
        description: 'Fast, high-throughput multimodal intelligence.',
      },
    ];

    // 4. Ollama (Local Models)
    const ollamaModels: ModelDefinition[] = [
      {
        id: 'qwen2.5-coder:latest',
        name: 'Qwen 2.5 Coder (Local)',
        provider: 'ollama',
        type: 'coding',
        capabilities: ['chat', 'coding', 'code_completion', 'tool_calling', 'streaming'],
        contextWindow: 32768,
        priority: 85,
        enabled: true,
        isLocal: true,
        description: 'High-performance local offline coding model running on your GPU/CPU.',
      },
      {
        id: 'llama3.2:latest',
        name: 'Llama 3.2 (Local)',
        provider: 'ollama',
        type: 'llm',
        capabilities: ['chat', 'reasoning', 'tool_calling', 'streaming'],
        contextWindow: 131072,
        priority: 80,
        enabled: true,
        isLocal: true,
        description: 'Local lightweight model for offline general reasoning and privacy.',
      },
    ];

    // 5. Standard OpenAI / Compatible
    const openAIModels: ModelDefinition[] = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        type: 'llm',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'vision', 'structured_output', 'streaming'],
        contextWindow: 128000,
        priority: 96,
        enabled: true,
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        provider: 'openai',
        type: 'reasoning',
        capabilities: ['reasoning', 'coding', 'structured_output', 'streaming'],
        contextWindow: 200000,
        priority: 94,
        enabled: true,
      },
    ];

    // Register Providers
    this.registerProvider({
      id: 'nvidia',
      name: 'NVIDIA NIM / Hosted',
      type: 'nvidia',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      isLocal: false,
      enabled: true,
      models: nvidiaModels,
    });

    this.registerProvider({
      id: 'gemini',
      name: 'Google Gemini',
      type: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      isLocal: false,
      enabled: true,
      models: geminiModels,
    });

    this.registerProvider({
      id: 'openrouter',
      name: 'OpenRouter',
      type: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      isLocal: false,
      enabled: true,
      models: openRouterModels,
    });

    this.registerProvider({
      id: 'ollama',
      name: 'Ollama (Local Offline)',
      type: 'ollama',
      baseUrl: 'http://localhost:11434',
      isLocal: true,
      enabled: true,
      models: ollamaModels,
    });

    this.registerProvider({
      id: 'openai',
      name: 'OpenAI / Compatible',
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      isLocal: false,
      enabled: true,
      models: openAIModels,
    });
  }

  public registerProvider(provider: ProviderConfig) {
    this.providers.set(provider.id, provider);
    for (const model of provider.models) {
      this.models.set(model.id, model);
    }
  }

  public getProvider(id: string): ProviderConfig | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  public getModel(id: string): ModelDefinition | undefined {
    return this.models.get(id);
  }

  public getAllModels(): ModelDefinition[] {
    return Array.from(this.models.values());
  }

  public registerCustomModel(model: ModelDefinition) {
    this.models.set(model.id, model);
  }

  public updateModelStatus(modelId: string, enabled: boolean) {
    const model = this.models.get(modelId);
    if (model) {
      model.enabled = enabled;
    }
  }

  public setModelPriority(modelId: string, priority: number) {
    const model = this.models.get(modelId);
    if (model) {
      model.priority = priority;
    }
  }
}
