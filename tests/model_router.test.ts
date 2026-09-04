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
});
