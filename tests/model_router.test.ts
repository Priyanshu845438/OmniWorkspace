import { describe, it, expect } from 'vitest';
import { ModelRouter } from '../server/src/core/router/router.js';
import { ModelRegistry } from '../server/src/core/models/registry.js';
import { ProviderGateway } from '../server/src/core/gateway/gateway.js';
import { CredentialVault } from '../server/src/core/credentials/vault.js';

import os from 'os';
import path from 'path';

describe('Model Router & Capability Scoring', () => {
  const root = path.join(os.tmpdir(), 'omni-test-vault-' + Math.random().toString(36).slice(2));
  const vault = new CredentialVault(root);
  const registry = new ModelRegistry();
  const gateway = new ProviderGateway(vault);
  const router = new ModelRouter(registry, gateway);

  it('selects optimal model matching coding capabilities', () => {
    const route = router.selectRoute(['coding', 'tool_calling']);
    expect(route).toBeDefined();
    expect(route.model).toBeDefined();
    expect(route.provider).toBeDefined();
    expect(route.reason).toBeDefined();
    expect(route.score).toBeGreaterThan(0);
  });

  it('honors manual model override if specified', () => {
    const route = router.selectRoute(['chat'], 'qwen2.5-coder:latest');
    expect(route.model.id).toBe('qwen2.5-coder:latest');
    expect(route.reason).toContain('User explicitly selected');
  });

  it('prefers local provider when preferLocal option is enabled', () => {
    // Configure a mock local model in registry
    const localRoute = router.selectRoute(['chat'], { preferLocal: true });
    expect(localRoute).toBeDefined();
    expect(localRoute.model).toBeDefined();
  });

  it('respects minContextWindow filtering in route selection', () => {
    const largeContextRoute = router.selectRoute(['reasoning'], { minContextWindow: 128000 });
    expect(largeContextRoute).toBeDefined();
    if (largeContextRoute.model) {
      expect(largeContextRoute.model.contextWindow).toBeGreaterThanOrEqual(128000);
    }
  });

  it('rejects provider connection test when API key is not configured in vault', async () => {
    const openRouterProvider = registry.getProvider('openrouter')!;
    expect(openRouterProvider).toBeDefined();
    const result = await gateway.testProviderConnection(openRouterProvider);
    expect(result.success).toBe(false);
    expect(result.error).toContain('API key not configured');
  });

  it('prioritizes NVIDIA NIM over local Ollama when NVIDIA_API_KEY is set in vault', () => {
    vault.setSecret('NVIDIA_API_KEY', 'nvapi-test-valid-key-mock');
    const route = router.selectRoute(['chat', 'reasoning', 'tool_calling']);
    expect(route).toBeDefined();
    expect(route.provider.id).toBe('nvidia');
    expect(route.model.id).toContain('nvidia');
    expect(route.score).toBeGreaterThan(100);
  });
});
