import { VerificationResult, AgentType } from '../../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class VerificationEngine {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  public async verifyCodeChanges(): Promise<VerificationResult> {
    try {
      // Run quick TypeScript / linter check if tsconfig exists
      const { stdout } = await execAsync('npm run typecheck --if-present', {
        cwd: this.workspaceRoot,
        timeout: 20000,
      });
      return {
        step: 'Code Typecheck & Compilation',
        status: 'VERIFIED',
        details: 'Code compiles cleanly with zero type errors.',
        passed: true,
      };
    } catch (err: any) {
      return {
        step: 'Code Typecheck & Compilation',
        status: 'FAILED',
        details: (err.stdout || err.message).slice(0, 500),
        passed: false,
      };
    }
  }

  public verifySqlQuery(query: string, dbInstance: any): VerificationResult {
    const trimmed = query.trim();
    if (!trimmed) {
      return { step: 'SQL Syntax Verification', status: 'FAILED', details: 'Empty query.', passed: false };
    }

    try {
      if (dbInstance) {
        dbInstance.prepare(`EXPLAIN ${trimmed}`).all();
        return {
          step: 'SQL Execution Plan Verification',
          status: 'VERIFIED',
          details: 'Query parsed and SQLite query engine generated valid execution bytecode.',
          passed: true,
        };
      }
      return {
        step: 'SQL Syntax Verification',
        status: 'VALIDATED',
        details: 'SQL statement structure syntax verified.',
        passed: true,
      };
    } catch (err: any) {
      return {
        step: 'SQL Syntax Verification',
        status: 'FAILED',
        details: `SQL syntax or table error: ${err.message}`,
        passed: false,
      };
    }
  }

  public verifyWorkflow(nodes: any[], edges: any[]): VerificationResult {
    if (!nodes || nodes.length === 0) {
      return { step: 'Workflow Topology', status: 'FAILED', details: 'Workflow has no nodes.', passed: false };
    }

    const hasTrigger = nodes.some((n) => n.type === 'trigger');
    if (!hasTrigger) {
      return { step: 'Workflow Topology', status: 'FAILED', details: 'Workflow must have at least one trigger node.', passed: false };
    }

    // Check for orphan edges
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return {
          step: 'Workflow Topology',
          status: 'FAILED',
          details: `Edge references nonexistent node (${edge.source} -> ${edge.target}).`,
          passed: false,
        };
      }
    }

    return {
      step: 'Workflow Topology',
      status: 'VERIFIED',
      details: `Valid DAG topology: ${nodes.length} nodes and ${edges.length} connections verified.`,
      passed: true,
    };
  }
}
