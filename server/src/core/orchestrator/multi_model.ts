import { ModelRouter } from '../router/router.js';
import { ToolRegistry } from '../tools/registry.js';
import { AgentFactory } from '../agents/agent_factory.js';
import { VerificationEngine } from '../verification/verifier.js';
import { TraceStep } from '../../types/index.js';

export interface MultiModelPlanResult {
  plannerOutput: string;
  executorOutput: string;
  reviewerOutput: string;
  trace: TraceStep[];
  success: boolean;
}

export class MultiModelPipeline {
  private router: ModelRouter;
  private toolRegistry: ToolRegistry;
  private verifier: VerificationEngine;

  constructor(router: ModelRouter, toolRegistry: ToolRegistry, verifier: VerificationEngine) {
    this.router = router;
    this.toolRegistry = toolRegistry;
    this.verifier = verifier;
  }

  /**
   * Runs a collaborative 3-phase multi-model pipeline:
   * 1. Planner Model: Breaks down complex architecture into rigorous steps
   * 2. Executor Model: Synthesizes code or executes tools
   * 3. Reviewer Model: Audits for correctness, performance, and security
   */
  public async executeCollaborativePipeline(
    taskDescription: string,
    contextString: string,
    onTraceStep?: (step: TraceStep) => void
  ): Promise<MultiModelPlanResult> {
    const trace: TraceStep[] = [];

    // Phase 1: Planning (Reasoning Model)
    const planStep: TraceStep = {
      id: `trace_multi_plan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'plan',
      title: 'Phase 1: Planner Model Formulating Strategy',
      status: 'running',
    };
    trace.push(planStep);
    if (onTraceStep) onTraceStep(planStep);

    const plannerAgent = AgentFactory.createAgent('general', this.toolRegistry, this.router);
    const planResult = await plannerAgent.execute(
      `Formulate an exhaustive architectural execution plan for the following task:\n${taskDescription}`,
      contextString
    );
    planStep.status = 'completed';
    planStep.details = { plan: planResult.response.slice(0, 300) };
    if (onTraceStep) onTraceStep(planStep);

    // Phase 2: Execution (Coding / Tool Agent)
    const execStep: TraceStep = {
      id: `trace_multi_exec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'agent_execution',
      title: 'Phase 2: Execution Model Implementing Solution',
      status: 'running',
    };
    trace.push(execStep);
    if (onTraceStep) onTraceStep(execStep);

    const executorAgent = AgentFactory.createAgent('coding', this.toolRegistry, this.router);
    const execResult = await executorAgent.execute(
      `Implement the solution following this plan:\n${planResult.response}\nOriginal task:\n${taskDescription}`,
      contextString
    );
    execStep.status = 'completed';
    if (onTraceStep) onTraceStep(execStep);

    // Phase 3: Review & Security Audit (Reviewer Model)
    const reviewStep: TraceStep = {
      id: `trace_multi_review_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'verification',
      title: 'Phase 3: Review Model Auditing Implementation',
      status: 'running',
    };
    trace.push(reviewStep);
    if (onTraceStep) onTraceStep(reviewStep);

    const reviewerAgent = AgentFactory.createAgent('general', this.toolRegistry, this.router);
    const reviewResult = await reviewerAgent.execute(
      `Review the following implemented solution for correctness, security vulnerabilities, and code quality:\n${execResult.response}`,
      contextString
    );
    reviewStep.status = 'completed';
    if (onTraceStep) onTraceStep(reviewStep);

    return {
      plannerOutput: planResult.response,
      executorOutput: execResult.response,
      reviewerOutput: reviewResult.response,
      trace,
      success: true,
    };
  }
}
