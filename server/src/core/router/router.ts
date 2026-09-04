import { ModelDefinition, ProviderConfig, ModelCapability, TaskClassification, CandidateRoute } from '../../types/index.js';
import { ModelRegistry } from '../models/registry.js';
import { CapabilityRegistry } from '../capabilities/registry.js';
import { ProviderGateway } from '../gateway/gateway.js';
import { ChatMessage, StreamChunk } from '../gateway/base.js';
import { ToolDefinition } from '../../types/index.js';

export interface RouteSelection {
  model: ModelDefinition;
  provider: ProviderConfig;
  reason: string;
  matchedCapabilities: ModelCapability[];
  score: number;
  fallbackChain: CandidateRoute[];
}

export class ModelRouter {
  private registry: ModelRegistry;
  private gateway: ProviderGateway;

  constructor(registry: ModelRegistry, gateway: ProviderGateway) {
    this.registry = registry;
    this.gateway = gateway;
  }

  /**
   * Intelligently selects the best model and provider based on task requirements and availability.
   */
  public selectRoute(
    requiredCapabilities: ModelCapability[],
    manualModelIdOrOptions?: string | {
      manualModelId?: string;
      preferredProviderId?: string;
      minContextWindow?: number;
      preferLocal?: boolean;
    },
    legacyPreferredProviderId?: string
  ): RouteSelection {
    const options = typeof manualModelIdOrOptions === 'object'
      ? manualModelIdOrOptions
      : {
          manualModelId: manualModelIdOrOptions,
          preferredProviderId: legacyPreferredProviderId,
        };

    const manualModelId = options.manualModelId;
    const preferredProviderId = options.preferredProviderId;
    const minContext = options.minContextWindow || 0;
    const preferLocal = Boolean(options.preferLocal);

    const allModels = this.registry.getAllModels().filter((m) => m.enabled);
    const allProviders = this.registry.getAllProviders().filter((p) => p.enabled);
    const providerMap = new Map(allProviders.map((p) => [p.id, p]));

    // 1. Filter models with configured credentials or local availability & context window
    const candidates = allModels.filter((model) => {
      const provider = providerMap.get(model.provider);
      if (!provider) return false;
      if (preferredProviderId && provider.id !== preferredProviderId) return false;
      if (minContext > 0 && model.contextWindow < minContext) return false;

      // Local models (like Ollama) don't require an API key
      if (provider.isLocal) return true;

      // Remote models require a configured key
      const key = this.gateway.getApiKeyForProvider(provider.type);
      return Boolean(key && key.trim().length > 0);
    });

    // Helper to build fallback candidate list
    const buildFallbackChain = (excludeModelId: string): CandidateRoute[] => {
      return candidates
        .filter((c) => c.id !== excludeModelId)
        .map((c) => {
          const p = providerMap.get(c.provider)!;
          const match = CapabilityRegistry.scoreModelMatch(c.capabilities, requiredCapabilities);
          return {
            modelId: c.id,
            modelName: c.name,
            providerId: p.id,
            providerName: p.name,
            score: Math.round(match.score * 0.6 + c.priority * 0.3 + (p.isLocal ? 10 : 0)),
            isLocal: Boolean(p.isLocal),
            reason: `Supports ${match.matched.length}/${requiredCapabilities.length} capabilities with priority ${c.priority}.`,
          };
        })
        .sort((a, b) => b.score - a.score);
    };

    // 2. Manual selection override
    if (manualModelId) {
      const manualModel = this.registry.getModel(manualModelId);
      if (manualModel && manualModel.enabled) {
        const provider = providerMap.get(manualModel.provider);
        if (provider) {
          const match = CapabilityRegistry.scoreModelMatch(manualModel.capabilities, requiredCapabilities);
          return {
            model: manualModel,
            provider,
            reason: `User explicitly selected model '${manualModel.name}'.`,
            matchedCapabilities: match.matched,
            score: match.score,
            fallbackChain: buildFallbackChain(manualModel.id),
          };
        }
      }
    }

    if (candidates.length === 0) {
      // If no configured provider is found, fallback to the highest priority model in registry
      const fallbackModel = allModels.sort((a, b) => b.priority - a.priority)[0] || this.registry.getAllModels()[0];
      const provider = providerMap.get(fallbackModel.provider) || this.registry.getAllProviders()[0];
      return {
        model: fallbackModel,
        provider,
        reason: `Auto-selected baseline model '${fallbackModel.name}'. Key configuration required.`,
        matchedCapabilities: fallbackModel.capabilities,
        score: 50,
        fallbackChain: [],
      };
    }

    // 3. Score and rank candidates
    const scored = candidates.map((model) => {
      const provider = providerMap.get(model.provider)!;
      const match = CapabilityRegistry.scoreModelMatch(model.capabilities, requiredCapabilities);

      // Total rank formula: (Capability match weight 60%) + (Model Priority weight 30%) + (Local privacy bonus 10-25%)
      const localBonus = provider.isLocal ? (preferLocal ? 25 : 10) : 0;
      const compositeScore = match.score * 0.6 + model.priority * 0.3 + localBonus;

      return {
        model,
        provider,
        match,
        compositeScore,
      };
    });

    // Sort descending by composite score
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    const winner = scored[0];
    const reason = `Auto-selected '${winner.model.name}' (${winner.provider.name}) because it matches ${winner.match.matched.length}/${requiredCapabilities.length} required capabilities with priority ${winner.model.priority}.`;

    return {
      model: winner.model,
      provider: winner.provider,
      reason,
      matchedCapabilities: winner.match.matched,
      score: Math.round(winner.compositeScore),
      fallbackChain: buildFallbackChain(winner.model.id),
    };
  }

  /**
   * Executes a streaming request with safe, automatic fallback to another configured provider
   * if rate limits (429), server errors (500, 502, 503), or network timeouts occur.
   */
  public async executeWithFallback(
    requiredCapabilities: ModelCapability[],
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    onChunk?: (chunk: StreamChunk) => void,
    onFallback?: (fromModel: string, toModel: string, reason: string) => void,
    signal?: AbortSignal
  ): Promise<{ result: StreamChunk; usedModel: ModelDefinition; usedProvider: ProviderConfig }> {
    // Get ordered candidates
    const primaryRoute = this.selectRoute(requiredCapabilities);
    const allProviders = this.registry.getAllProviders().filter((p) => p.enabled);
    const providerMap = new Map(allProviders.map((p) => [p.id, p]));

    const fallbackCandidates = this.registry
      .getAllModels()
      .filter((m) => m.enabled && m.id !== primaryRoute.model.id)
      .filter((m) => {
        const p = providerMap.get(m.provider);
        if (!p) return false;
        if (p.isLocal) return true;
        const key = this.gateway.getApiKeyForProvider(p.type);
        return Boolean(key);
      })
      .sort((a, b) => b.priority - a.priority);

    const attemptQueue = [primaryRoute.model, ...fallbackCandidates];
    let lastError: Error | null = null;

    for (let i = 0; i < attemptQueue.length; i++) {
      const currentModel = attemptQueue[i];
      const currentProvider = providerMap.get(currentModel.provider);
      if (!currentProvider) continue;

      try {
        const result = await this.gateway.streamChat(
          currentModel,
          currentProvider,
          messages,
          tools,
          onChunk,
          signal
        );
        return { result, usedModel: currentModel, usedProvider: currentProvider };
      } catch (err) {
        lastError = err as Error;
        const errMsg = lastError.message;
        const isRecoverable =
          errMsg.includes('429') ||
          errMsg.includes('500') ||
          errMsg.includes('502') ||
          errMsg.includes('503') ||
          errMsg.includes('timeout') ||
          errMsg.includes('fetch failed');

        if (isRecoverable && i + 1 < attemptQueue.length) {
          const nextModel = attemptQueue[i + 1];
          if (onFallback) {
            onFallback(
              currentModel.name,
              nextModel.name,
              `Provider error encountered (${errMsg.slice(0, 100)}). Falling back safely to configured alternative.`
            );
          }
          continue;
        } else {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('All model attempts failed.');
  }
}
