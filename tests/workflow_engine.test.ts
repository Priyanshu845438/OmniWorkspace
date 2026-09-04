import { describe, it, expect } from 'vitest';
import { WorkflowEngine } from '../server/src/core/workflows/workflow_engine.js';

describe('Workflow DAG Execution Engine', () => {
  const engine = new WorkflowEngine();

  it('initializes with default starter workflow', () => {
    const all = engine.getAllWorkflows();
    expect(all.length).toBeGreaterThan(0);
    expect(all[0].id).toBe('data-health-check');
  });

  it('executes a multi-step DAG workflow with conditions', async () => {
    const result = await engine.runWorkflow('data-health-check', { isClean: true });
    expect(result.success).toBe(true);
    expect(result.stepLogs.length).toBeGreaterThan(0);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('saves and retrieves dynamic custom workflows', () => {
    engine.saveWorkflow({
      id: 'custom-pipeline',
      name: 'Custom Pipeline',
      nodes: [
        { id: 't1', type: 'trigger', label: 'Start', config: {} },
        { id: 'a1', type: 'action', label: 'Do Work', actionType: 'test', config: {} },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'a1' }],
      updatedAt: new Date().toISOString(),
    });

    const fetched = engine.getWorkflow('custom-pipeline');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Custom Pipeline');
  });
});
