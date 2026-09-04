import {
  AgentType,
  ModelCapability,
  PermissionLevel,
  TaskClassification,
  TraceStep,
  ExecutionContext,
} from '../../types/index.js';
import { AgentFactory } from '../agents/agent_factory.js';
import { ToolRegistry } from '../tools/registry.js';
import { ModelRouter } from '../router/router.js';
import { ContextEngine } from '../context/context_engine.js';
import { VerificationEngine } from '../verification/verifier.js';
import { StreamChunk } from '../gateway/base.js';

export class TaskOrchestrator {
  private toolRegistry: ToolRegistry;
  private router: ModelRouter;
  private contextEngine: ContextEngine;
  private verifier: VerificationEngine;

  constructor(
    toolRegistry: ToolRegistry,
    router: ModelRouter,
    contextEngine: ContextEngine,
    verifier: VerificationEngine
  ) {
    this.toolRegistry = toolRegistry;
    this.router = router;
    this.contextEngine = contextEngine;
    this.verifier = verifier;
  }

  /**
   * Universal Natural Language Classifier:
   * Maps user input to primary task intent, required model capabilities, and suggested agent.
   */
  public classifyTask(userPrompt: string): TaskClassification {
    const text = userPrompt.toLowerCase();

    // 1. Automation & Workflows
    if (/\b(workflow|automation|cron|trigger|schedule|webhook|pipeline|automate)\b/.test(text)) {
      return {
        primaryCategory: 'automation',
        intent: 'Workflow creation and process automation',
        requiredCapabilities: ['reasoning', 'tool_calling', 'structured_output'],
        suggestedAgent: 'automation',
        riskLevel: PermissionLevel.LEVEL_1_MODIFY,
        plan: [
          'Define DAG trigger, action, and condition nodes',
          'Validate workflow topology and dependencies',
          'Execute workflow or register schedule',
        ],
      };
    }

    // 2. Coding & Software Engineering
    if (
      /\b(code|function|component|refactor|debug|compile|test|build|git|bug|pull request|react|typescript|python|rust|css|html)\b/.test(
        text
      ) &&
      !/\b(sql|database|table|query)\b/.test(text)
    ) {
      return {
        primaryCategory: 'coding',
        intent: 'Software engineering & code modification',
        requiredCapabilities: ['coding', 'tool_calling', 'structured_output'],
        suggestedAgent: 'coding',
        riskLevel: PermissionLevel.LEVEL_1_MODIFY,
        plan: [
          'Inspect project architecture and symbol definitions',
          'Read active and relevant source files',
          'Apply precise edits or write new components',
          'Verify compilation and test suite status',
        ],
      };
    }

    // 2. SQL & Databases
    if (/\b(sql|database|query|table|schema|select\b|join\b|foreign key|sqlite|postgres)\b/.test(text)) {
      return {
        primaryCategory: 'sql',
        intent: 'Database querying and schema analysis',
        requiredCapabilities: ['coding', 'reasoning', 'structured_output'],
        suggestedAgent: 'sql',
        riskLevel: PermissionLevel.LEVEL_0_READ_ONLY,
        plan: [
          'Inspect database tables and schema columns',
          'Formulate safe parameterized SQL query',
          'Explain query plan and verify index usage',
          'Execute query and summarize rows',
        ],
      };
    }

    // 3. Data Analysis & Visualization
    if (/\b(csv|excel|json dataset|dataset|chart|statistics|trend|mean|median|correlation|distribution|graph)\b/.test(text)) {
      return {
        primaryCategory: 'data',
        intent: 'Dataset inspection and statistical visualization',
        requiredCapabilities: ['reasoning', 'tool_calling', 'structured_output'],
        suggestedAgent: 'data',
        riskLevel: PermissionLevel.LEVEL_0_READ_ONLY,
        plan: [
          'Inspect dataset structure and infer column types',
          'Compute column statistics and missing values',
          'Generate aggregated summaries and chart recommendations',
        ],
      };
    }

    // 4. Research & Web
    if (/\b(research|web search|find out|sources|latest news|papers|citations|investigate|who is|what is the history)\b/.test(text)) {
      return {
        primaryCategory: 'research',
        intent: 'Deep research and factual evidence synthesis',
        requiredCapabilities: ['reasoning', 'tool_calling', 'long_context'],
        suggestedAgent: 'research',
        riskLevel: PermissionLevel.LEVEL_3_NETWORK,
        plan: [
          'Formulate targeted search queries',
          'Retrieve public sources and extract clean text',
          'Cross-reference claims and detect contradictions',
          'Synthesize report with explicit citations',
        ],
      };
    }


    // 6. Media (Image, Audio, Video)
    if (/\b(image|picture|video|audio|speech|transcribe|generate image|draw|synthesize speech|tts|stt)\b/.test(text)) {
      return {
        primaryCategory: 'media',
        intent: 'Generative media creation & processing',
        requiredCapabilities: ['vision', 'image_generation'],
        suggestedAgent: 'media',
        riskLevel: PermissionLevel.LEVEL_3_NETWORK,
        plan: [
          'Refine descriptive visual or audio prompt',
          'Dispatch to configured media provider',
          'Present generated media asset and metadata',
        ],
      };
    }

    // 7. Documents & Summarization
    if (/\b(document|pdf|docx|summarize|extract text|readme|contract|paper)\b/.test(text)) {
      return {
        primaryCategory: 'document',
        intent: 'Document extraction and structured summarization',
        requiredCapabilities: ['long_context', 'structured_output', 'reasoning'],
        suggestedAgent: 'document',
        riskLevel: PermissionLevel.LEVEL_0_READ_ONLY,
        plan: [
          'Read and parse document layout and headings',
          'Chunk and extract core key arguments',
          'Generate executive summary and action items',
        ],
      };
    }

    // 8. Default: General Assistant
    return {
      primaryCategory: 'general',
      intent: 'General conversation, reasoning, and assistance',
      requiredCapabilities: ['chat', 'reasoning', 'tool_calling'],
      suggestedAgent: 'general',
      riskLevel: PermissionLevel.LEVEL_0_READ_ONLY,
      plan: ['Analyze request context', 'Formulate step-by-step reasoning', 'Provide authoritative answer'],
    };
  }

  /**
   * Orchestrates the complete pipeline:
   * UNDERSTAND -> CLASSIFY -> ASSEMBLE CONTEXT -> SELECT AGENT -> EXECUTE -> VERIFY -> RETURN
   */
  public async orchestrate(
    userPrompt: string,
    currentCtx: ExecutionContext,
    manualAgent?: AgentType,
    onTraceStep?: (step: TraceStep) => void,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{
    classification: TaskClassification;
    response: string;
    reasoning?: string;
    trace: TraceStep[];
    verification?: unknown;
  }> {
    const trace: TraceStep[] = [];

    // Step 1: Task Understanding & Classification
    const understandStep: TraceStep = {
      id: `trace_${Date.now()}_understand`,
      timestamp: new Date().toISOString(),
      type: 'task_understanding',
      title: 'Understanding User Intent',
      details: { prompt: userPrompt },
      status: 'completed',
    };
    trace.push(understandStep);
    if (onTraceStep) onTraceStep(understandStep);

    const classification = this.classifyTask(userPrompt);
    const chosenAgentType = manualAgent || classification.suggestedAgent;

    const classStep: TraceStep = {
      id: `trace_${Date.now()}_class`,
      timestamp: new Date().toISOString(),
      type: 'task_classification',
      title: `Classified as ${classification.primaryCategory.toUpperCase()} Task`,
      details: {
        intent: classification.intent,
        agent: chosenAgentType,
        requiredCapabilities: classification.requiredCapabilities,
        riskLevel: classification.riskLevel,
      },
      status: 'completed',
    };
    trace.push(classStep);
    if (onTraceStep) onTraceStep(classStep);

    // Step 2: Capability Analysis
    const capStep: TraceStep = {
      id: `trace_${Date.now()}_caps`,
      timestamp: new Date().toISOString(),
      type: 'capability_requirements',
      title: 'Task Capability Analysis',
      details: {
        agentType: chosenAgentType,
        requiredCapabilities: classification.requiredCapabilities,
      },
      status: 'completed',
    };
    trace.push(capStep);
    if (onTraceStep) onTraceStep(capStep);

    // Step 3: Context Collection
    const { contextString, items, totalTokens } = this.contextEngine.assembleContext(currentCtx);
    const contextStep: TraceStep = {
      id: `trace_${Date.now()}_context`,
      timestamp: new Date().toISOString(),
      type: 'context_collection' as any,
      title: `Context Assembled (${totalTokens} estimated tokens)`,
      details: {
        itemsCount: items.length,
        sources: items.map((i) => i.title),
        totalTokens,
      },
      status: 'completed',
    };
    trace.push(contextStep);
    if (onTraceStep) onTraceStep(contextStep);

    // Step 4: Risk & Permission Analysis
    const riskStep: TraceStep = {
      id: `trace_${Date.now()}_risk`,
      timestamp: new Date().toISOString(),
      type: 'risk_analysis' as any,
      title: `Risk Analysis: Level ${classification.riskLevel}`,
      details: {
        riskLevel: classification.riskLevel,
        policy:
          classification.riskLevel >= 2
            ? 'Interactive user approval required for shell execution or filesystem alterations.'
            : 'Standard read-only and local modification permissions granted.',
      },
      status: 'completed',
    };
    trace.push(riskStep);
    if (onTraceStep) onTraceStep(riskStep);

    // Step 5: Model Selection
    const route = this.router.selectRoute(classification.requiredCapabilities);
    const modelStep: TraceStep = {
      id: `trace_${Date.now()}_model`,
      timestamp: new Date().toISOString(),
      type: 'model_selection',
      title: `Selected Model: ${route.model.name} (${route.provider.name})`,
      details: {
        modelId: route.model.id,
        provider: route.provider.name,
        score: route.score,
        reason: route.reason,
        matchedCapabilities: route.matchedCapabilities,
        fallbackChain: route.fallbackChain,
      },
      status: 'completed',
    };
    trace.push(modelStep);
    if (onTraceStep) onTraceStep(modelStep);

    // Step 6: Plan
    const planStep: TraceStep = {
      id: `trace_${Date.now()}_plan`,
      timestamp: new Date().toISOString(),
      type: 'plan',
      title: 'Execution Plan Formulated',
      details: { steps: classification.plan },
      status: 'completed',
    };
    trace.push(planStep);
    if (onTraceStep) onTraceStep(planStep);

    // Step 7: Agent Execution
    const agent = AgentFactory.createAgent(chosenAgentType, this.toolRegistry, this.router);
    const agentResult = await agent.execute(
      userPrompt,
      contextString,
      (subStep) => {
        trace.push(subStep);
        if (onTraceStep) onTraceStep(subStep);
      },
      onChunk,
      signal,
      conversationHistory
    );

    // Step 5: Verification Phase
    let verificationOutput: unknown = null;
    if (chosenAgentType === 'coding') {
      const verifyStart = Date.now();
      const codeCheck = await this.verifier.verifyCodeChanges();
      verificationOutput = codeCheck;
      const vStep: TraceStep = {
        id: `trace_${Date.now()}_verify`,
        timestamp: new Date().toISOString(),
        type: 'verification',
        title: `Verification: ${codeCheck.step}`,
        details: { status: codeCheck.status, details: codeCheck.details },
        status: codeCheck.passed ? 'completed' : 'failed',
        durationMs: Date.now() - verifyStart,
      };
      trace.push(vStep);
      if (onTraceStep) onTraceStep(vStep);
    }

    return {
      classification,
      response: agentResult.response,
      reasoning: agentResult.reasoning,
      trace,
      verification: verificationOutput,
    };
  }
}
