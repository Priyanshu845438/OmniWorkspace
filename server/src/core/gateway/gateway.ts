import { ModelDefinition, ProviderConfig, ProviderType, ToolDefinition, ToolCallRequest } from '../../types/index.js';
import { ProviderAdapter, ChatMessage, StreamChunk } from './base.js';
import { OpenAICompatibleAdapter } from './openai_adapter.js';
import { OllamaAdapter } from './ollama_adapter.js';
import { CredentialVault } from '../credentials/vault.js';

export class ProviderGateway {
  private adapters: Map<ProviderType, ProviderAdapter> = new Map();
  private vault: CredentialVault;

  constructor(vault: CredentialVault) {
    this.vault = vault;
    // Register adapters
    const openAIAdapter = new OpenAICompatibleAdapter('https://api.openai.com/v1');
    const nvidiaAdapter = new OpenAICompatibleAdapter('https://integrate.api.nvidia.com/v1');
    const openRouterAdapter = new OpenAICompatibleAdapter('https://openrouter.ai/api/v1');
    const ollamaAdapter = new OllamaAdapter('http://localhost:11434');

    this.adapters.set('openai', openAIAdapter);
    this.adapters.set('nvidia', nvidiaAdapter);
    this.adapters.set('openrouter', openRouterAdapter);
    this.adapters.set('ollama', ollamaAdapter);
    this.adapters.set('vllm', openAIAdapter);
    this.adapters.set('custom', openAIAdapter);
  }

  public getApiKeyForProvider(providerType: ProviderType): string | undefined {
    switch (providerType) {
      case 'nvidia':
        return this.vault.getSecret('NVIDIA_API_KEY');
      case 'openrouter':
        return this.vault.getSecret('OPENROUTER_API_KEY');
      case 'openai':
        return this.vault.getSecret('OPENAI_API_KEY');
      case 'ollama':
        return undefined; // Local Ollama does not require an API key
      case 'custom':
        return this.vault.getSecret('CUSTOM_API_KEY');
      case 'vllm':
        return this.vault.getSecret('VLLM_API_KEY');
      default:
        return undefined;
    }
  }

  public async testProviderConnection(
    provider: ProviderConfig
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const adapter = this.adapters.get(provider.type) || this.adapters.get('openai')!;
    const apiKey = this.getApiKeyForProvider(provider.type);
    return adapter.testConnection(apiKey, provider.baseUrl);
  }

  public async streamChat(
    model: ModelDefinition,
    provider: ProviderConfig,
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<StreamChunk> {
    const adapter = this.adapters.get(provider.type) || this.adapters.get('openai')!;
    const apiKey = this.getApiKeyForProvider(provider.type);

    if (!provider.isLocal && !apiKey) {
      throw new Error(
        `API key not configured for provider '${provider.name}'. Please configure your BYOK key in the Model Manager.`
      );
    }

    return adapter.chatStream(
      model,
      messages,
      tools,
      apiKey,
      provider.baseUrl,
      onChunk,
      signal
    );
  }
}
