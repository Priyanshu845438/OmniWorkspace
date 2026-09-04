export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'transform' | 'output';
  label: string;
  actionType?: string; // e.g., 'http_request', 'sql_query', 'notification', 'shell'
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  conditionBranch?: 'true' | 'false' | 'always';
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedAt: string;
}

export interface StepLog {
  nodeId: string;
  label: string;
  type: string;
  status: 'completed' | 'skipped' | 'failed';
  input: unknown;
  output: unknown;
  durationMs: number;
  timestamp: string;
}

export interface WorkflowRunResult {
  workflowId: string;
  success: boolean;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  stepLogs: StepLog[];
  finalOutput: unknown;
}

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private runHistory: Map<string, WorkflowRunResult[]> = new Map();

  constructor() {
    // Register a sample starter workflow
    this.saveWorkflow({
      id: 'data-health-check',
      name: 'Automated Database & Repo Health Check',
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Manual Trigger', config: { schedule: 'manual' } },
        { id: 'n2', type: 'action', label: 'Inspect Git Status', actionType: 'git_status', config: {} },
        {
          id: 'n3',
          type: 'condition',
          label: 'Is Working Tree Clean?',
          config: { field: 'isClean', operator: 'equals', value: true },
        },
        { id: 'n4', type: 'output', label: 'Report Status', config: { format: 'markdown' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4', conditionBranch: 'true' },
      ],
      updatedAt: new Date().toISOString(),
    });
  }

  public saveWorkflow(wf: WorkflowDefinition) {
    this.workflows.set(wf.id, wf);
  }

  public getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  public getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  public getHistory(workflowId: string): WorkflowRunResult[] {
    return this.runHistory.get(workflowId) || [];
  }

  public async runWorkflow(workflowId: string, initialPayload: unknown): Promise<WorkflowRunResult> {
    const wf = this.workflows.get(workflowId);
    if (!wf) throw new Error(`Workflow '${workflowId}' not found.`);

    const startTime = Date.now();
    const stepLogs: StepLog[] = [];
    let currentPayload = initialPayload;

    // Simple topological walk starting from triggers
    const visited = new Set<string>();
    const nodeMap = new Map(wf.nodes.map((n) => [n.id, n]));
    const outEdgesMap = new Map<string, WorkflowEdge[]>();

    for (const edge of wf.edges) {
      const list = outEdgesMap.get(edge.source) || [];
      list.push(edge);
      outEdgesMap.set(edge.source, list);
    }

    const startNodes = wf.nodes.filter((n) => n.type === 'trigger');
    const queue = startNodes.map((n) => ({ node: n, conditionMet: true }));

    while (queue.length > 0) {
      const { node, conditionMet } = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      const nodeStart = Date.now();

      if (!conditionMet) {
        stepLogs.push({
          nodeId: node.id,
          label: node.label,
          type: node.type,
          status: 'skipped',
          input: currentPayload,
          output: 'Skipped due to condition branch',
          durationMs: Date.now() - nodeStart,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Execute node logic
      let nodeOutput: any = currentPayload;
      let branchResult: 'true' | 'false' = 'true';

      if (node.type === 'condition') {
        const { field, operator, value } = node.config as any;
        const targetVal = (currentPayload as any)?.[field];
        if (operator === 'equals') {
          branchResult = targetVal === value ? 'true' : 'false';
        } else if (operator === 'contains') {
          branchResult = String(targetVal).includes(String(value)) ? 'true' : 'false';
        } else {
          branchResult = Boolean(targetVal) ? 'true' : 'false';
        }
        nodeOutput = { conditionEvaluated: branchResult };
      } else if (node.type === 'transform') {
        nodeOutput = { ...((currentPayload as object) || {}), transformedAt: new Date().toISOString() };
        currentPayload = nodeOutput;
      } else if (node.type === 'action') {
        nodeOutput = { executedAction: node.actionType || 'custom', input: currentPayload, status: 'ok' };
        currentPayload = nodeOutput;
      }

      stepLogs.push({
        nodeId: node.id,
        label: node.label,
        type: node.type,
        status: 'completed',
        input: currentPayload,
        output: nodeOutput,
        durationMs: Date.now() - nodeStart,
        timestamp: new Date().toISOString(),
      });

      // Find children edges
      const edges = outEdgesMap.get(node.id) || [];
      for (const edge of edges) {
        const childNode = nodeMap.get(edge.target);
        if (!childNode) continue;

        let shouldFollow = true;
        if (node.type === 'condition' && edge.conditionBranch) {
          shouldFollow = edge.conditionBranch === branchResult;
        }

        queue.push({ node: childNode, conditionMet: shouldFollow });
      }
    }

    const runResult: WorkflowRunResult = {
      workflowId,
      success: true,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startTime,
      stepLogs,
      finalOutput: currentPayload,
    };

    const history = this.runHistory.get(workflowId) || [];
    history.unshift(runResult);
    if (history.length > 50) history.pop();
    this.runHistory.set(workflowId, history);

    return runResult;
  }
}
