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
import { WorkflowEngine } from '../server/src/core/workflows/workflow_engine.js';
import { TraceStep } from '../server/src/types/index.js';
import os from 'os';
import path from 'path';

describe('Golden Pipeline End-to-End Integration', () => {
  const root = path.join(os.tmpdir(), 'omni-test-pipeline-' + Math.random().toString(36).slice(2));
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

  it('selects optimal model route and generates fallback chain', () => {
    const route = router.selectRoute(['coding', 'reasoning']);
    expect(route).toBeDefined();
    expect(route.model).toBeDefined();
    expect(route.provider).toBeDefined();
    expect(route.score).toBeGreaterThan(0);
    expect(route.matchedCapabilities).toContain('coding');
    expect(route.fallbackChain).toBeInstanceOf(Array);
    expect(route.fallbackChain.length).toBeGreaterThan(0);
  });

  it('orchestrator emits the full Golden Pipeline lifecycle traces', async () => {
    const emittedTraces: TraceStep[] = [];

    // Prompt requiring database understanding
    const prompt = 'Inspect the employees schema and run an SQL query';

    try {
      await orchestrator.orchestrate(
        prompt,
        { workspacePath: root },
        'sql',
        (step) => emittedTraces.push(step)
      );
    } catch {
      // Gateway mock will fail without real API key, but trace phases prior to dispatch are guaranteed
    }

    const stepTypes = emittedTraces.map((t) => t.type);

    expect(stepTypes).toContain('task_understanding');
    expect(stepTypes).toContain('task_classification');
    expect(stepTypes).toContain('capability_requirements');
    expect(stepTypes).toContain('context_collection');
    expect(stepTypes).toContain('risk_analysis');
    expect(stepTypes).toContain('model_selection');
    expect(stepTypes).toContain('plan');
  });

  it('respects AbortSignal cancellation during execution', async () => {
    const controller = new AbortController();
    controller.abort(); // Pre-aborted signal

    const emittedTraces: TraceStep[] = [];

    await expect(
      orchestrator.orchestrate(
        'Generate full fullstack application with tests',
        { workspacePath: root },
        'coding',
        (step) => emittedTraces.push(step),
        undefined,
        controller.signal
      )
    ).rejects.toThrow();
  });

  it('WorkflowEngine runs live execution and dry-run validation', async () => {
    const engine = new WorkflowEngine();
    const wf = engine.getAllWorkflows()[0];
    expect(wf).toBeDefined();

    // 1. Dry run validation
    const dryRunResult = await engine.runWorkflow(wf.id, { isClean: true }, true);
    expect(dryRunResult.success).toBe(true);
    expect(dryRunResult.isDryRun).toBe(true);
    expect(dryRunResult.stepLogs.length).toBeGreaterThan(0);

    // 2. Live run
    const liveRunResult = await engine.runWorkflow(wf.id, { isClean: true }, false);
    expect(liveRunResult.success).toBe(true);
    expect(liveRunResult.isDryRun).toBe(false);
  });
});
