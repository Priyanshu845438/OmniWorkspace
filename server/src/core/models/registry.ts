import { ModelDefinition, ProviderConfig, ProviderType } from '../../types/index.js';

export class ModelRegistry {
  private models: Map<string, ModelDefinition> = new Map();
  private providers: Map<string, ProviderConfig> = new Map();

  constructor() {
    this.initDefaultCatalog();
  }

  private initDefaultCatalog() {
    // 1. NVIDIA Hosted Models
    const nvidiaModels: ModelDefinition[] = [
      {
        id: 'nvidia/llama-3.1-nemotron-70b-instruct',
        name: 'Llama 3.1 Nemotron 70B',
        provider: 'nvidia',
        type: 'llm',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'structured_output', 'streaming', 'long_context'],
        contextWindow: 128000,
        priority: 95,
        enabled: true,
        description: 'NVIDIA customized flagship model optimized for reasoning, coding, and tool calling.',
      },
      {
        id: 'nvidia/deepseek-r1',
        name: 'DeepSeek R1 (NVIDIA Hosted)',
        provider: 'nvidia',
        type: 'reasoning',
        capabilities: ['reasoning', 'coding', 'chat', 'streaming', 'long_context'],
        contextWindow: 64000,
        priority: 98,
        enabled: true,
        description: 'Elite reasoning and mathematical problem-solving model.',
      },
      {
        id: 'nvidia/kimi-k3',
        name: 'Kimi K3 (NVIDIA NIM)',
        provider: 'nvidia',
        type: 'llm',
        capabilities: ['chat', 'coding', 'long_context', 'streaming'],
        contextWindow: 200000,
        priority: 88,
        enabled: true,
        description: 'Ultra long-context model for document and code analysis.',
      },
    ];

    // 2. OpenRouter Provider
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
        name: 'Gemini 2.0 Flash',
        provider: 'openrouter',
        type: 'llm',
        capabilities: ['chat', 'reasoning', 'coding', 'tool_calling', 'vision', 'streaming', 'long_context'],
        contextWindow: 1048576,
        priority: 92,
        enabled: true,
        description: 'Fast, high-throughput multimodal intelligence.',
      },
    ];

    // 3. Ollama (Local Models)
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

    // 4. Standard OpenAI / Compatible
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
