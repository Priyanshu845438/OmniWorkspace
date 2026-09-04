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
          const hasKey = !p.isLocal && this.gateway.hasKeyForProvider(p.type);
          const bonus = hasKey ? 30 : (p.isLocal && preferLocal ? 25 : 0);
          return {
            modelId: c.id,
            modelName: c.name,
            providerId: p.id,
            providerName: p.name,
            score: Math.round(match.score * 0.6 + c.priority * 0.3 + bonus),
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

      // Has active BYOK key configured by user in vault
      const hasConfiguredKey = !provider.isLocal && this.gateway.hasKeyForProvider(provider.type);
      const configuredBonus = hasConfiguredKey ? 30 : 0;

      // Local bonus only if explicitly preferred by user or no cloud keys configured
      const localBonus = provider.isLocal ? (preferLocal ? 25 : 0) : 0;
      const compositeScore = match.score * 0.6 + model.priority * 0.3 + configuredBonus + localBonus;

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
        return this.gateway.hasKeyForProvider(p.type);
      })
      .sort((a, b) => {
        const pA = providerMap.get(a.provider);
        const pB = providerMap.get(b.provider);
        const hasKeyA = !pA?.isLocal && this.gateway.hasKeyForProvider(pA?.type || 'openai');
        const hasKeyB = !pB?.isLocal && this.gateway.hasKeyForProvider(pB?.type || 'openai');
        if (hasKeyA !== hasKeyB) return hasKeyA ? -1 : 1;
        return b.priority - a.priority;
      });

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
      } catch (err: any) {
        lastError = err as Error;

        // If the user explicitly aborted (clicked STOP or sent a new message), do NOT fallback — stop immediately
        if (signal?.aborted || err?.name === 'AbortError') {
          throw lastError;
        }

        const errMsg = (lastError.message || '').toLowerCase();
        const causeMsg = ((lastError as any)?.cause?.message || '').toLowerCase();
        const fullErr = `${errMsg} ${causeMsg}`;

        console.warn(`[Router Fallback] Model '${currentModel.name}' (${currentProvider.name}) failed: ${lastError.message}`);

        const isRecoverable =
          fullErr.includes('429') ||
          fullErr.includes('500') ||
          fullErr.includes('502') ||
          fullErr.includes('503') ||
          fullErr.includes('504') ||
          fullErr.includes('timeout') ||
          fullErr.includes('fetch failed') ||
          fullErr.includes('failed to fetch') ||
          fullErr.includes('econnrefused') ||
          fullErr.includes('econnreset') ||
          fullErr.includes('enotfound') ||
          fullErr.includes('etimedout') ||
          fullErr.includes('not running') ||
          fullErr.includes('connection refused') ||
          fullErr.includes('networkerror') ||
          fullErr.includes('network error');

        if (isRecoverable && i + 1 < attemptQueue.length) {
          const nextModel = attemptQueue[i + 1];
          if (onFallback) {
            onFallback(
              currentModel.name,
              nextModel.name,
              `Provider '${currentProvider.name}' unavailable (${lastError.message.slice(0, 90)}). Seamlessly switched to ${nextModel.name}.`
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
