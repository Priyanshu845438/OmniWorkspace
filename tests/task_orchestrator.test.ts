import { describe, it, expect } from 'vitest';
import { TaskOrchestrator } from '../server/src/core/orchestrator/orchestrator.js';
import { ToolRegistry } from '../server/src/core/tools/registry.js';
import { ModelRouter } from '../server/src/core/router/router.js';
import { ModelRegistry } from '../server/src/core/models/registry.js';
import { ProviderGateway } from '../server/src/core/gateway/gateway.js';
import { CredentialVault } from '../server/src/core/credentials/vault.js';
import { PermissionManager } from '../server/src/core/security/permissions.js';
import { PathShield } from '../server/src/core/security/path_shield.js';
import { ContextEngine } from '../server/src/core/context/context_engine.js';
import { VerificationEngine } from '../server/src/core/verification/verifier.js';

import os from 'os';
import path from 'path';

describe('Universal Task Orchestrator Classification', () => {
  const root = path.join(os.tmpdir(), 'omni-test-ws-' + Math.random().toString(36).slice(2));
  const pathShield = new PathShield(root);
  const pm = new PermissionManager();
  const toolRegistry = new ToolRegistry(pm);
  const vault = new CredentialVault(root);
  const modelRegistry = new ModelRegistry();
  const gateway = new ProviderGateway(vault);
  const router = new ModelRouter(modelRegistry, gateway);
  const contextEngine = new ContextEngine(pathShield);
  const verifier = new VerificationEngine(root);

  const orchestrator = new TaskOrchestrator(toolRegistry, router, contextEngine, verifier);

  it('classifies coding and refactoring requests', () => {
    const classification = orchestrator.classifyTask('Fix bug in auth component and run tests');
    expect(classification.primaryCategory).toBe('coding');
    expect(classification.suggestedAgent).toBe('coding');
    expect(classification.requiredCapabilities).toContain('coding');
  });

  it('classifies SQL and database queries', () => {
    const classification = orchestrator.classifyTask('Write SQL query to join table employees and departments');
    expect(classification.primaryCategory).toBe('sql');
    expect(classification.suggestedAgent).toBe('sql');
  });

  it('classifies data analysis requests', () => {
    const classification = orchestrator.classifyTask('Analyze this CSV dataset and compute mean statistics');
    expect(classification.primaryCategory).toBe('data');
    expect(classification.suggestedAgent).toBe('data');
  });

  it('classifies deep research tasks', () => {
    const classification = orchestrator.classifyTask('Research the best open-source coding models with citations');
    expect(classification.primaryCategory).toBe('research');
    expect(classification.suggestedAgent).toBe('research');
  });

  it('classifies generative media requests', () => {
    const classification = orchestrator.classifyTask('Generate an image of a futuristic workstation in 4k');
    expect(classification.primaryCategory).toBe('media');
    expect(classification.suggestedAgent).toBe('media');
  });

  it('classifies workflow automation requests', () => {
    const classification = orchestrator.classifyTask('Create a workflow automation triggered on git push');
    expect(classification.primaryCategory).toBe('automation');
    expect(classification.suggestedAgent).toBe('automation');
  });
});
