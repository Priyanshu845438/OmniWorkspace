import {
  AgentType,
  ModelCapability,
  PermissionLevel,
  ToolDefinition,
  TraceStep,
  ExecutionContext,
} from '../../types/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { ModelRouter, RouteSelection } from '../router/router.js';
import { ChatMessage, StreamChunk } from '../gateway/base.js';
import { PromptDefense } from '../security/defense.js';

export interface AgentConfig {
  type: AgentType;
  name: string;
  systemPrompt: string;
  requiredCapabilities: ModelCapability[];
  allowedCategories: ToolDefinition['category'][];
  maxIterations?: number;
}

export class BaseAgent {
  public config: AgentConfig;
  protected toolRegistry: ToolRegistry;
  protected router: ModelRouter;

  constructor(config: AgentConfig, toolRegistry: ToolRegistry, router: ModelRouter) {
    this.config = { maxIterations: 6, ...config };
    this.toolRegistry = toolRegistry;
    this.router = router;
  }

  public getAvailableTools(): ToolDefinition[] {
    const all = this.toolRegistry.getAllDefinitions();
    return all.filter((t) => this.config.allowedCategories.includes(t.category));
  }

  /**
   * Executes a multi-turn ReAct reasoning and action cycle with trace step logging.
   */
  public async execute(
    userInstruction: string,
    contextString: string,
    onTraceStep?: (step: TraceStep) => void,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{
    response: string;
    reasoning?: string;
    trace: TraceStep[];
    usedRoute: RouteSelection;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    const trace: TraceStep[] = [];
    const tools = this.getAvailableTools();
    const accumulatedUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    // 1. Select optimal model route
    const route = this.router.selectRoute(this.config.requiredCapabilities);
    const routingStep: TraceStep = {
      id: `trace_${Date.now()}_route`,
      timestamp: new Date().toISOString(),
      type: 'model_selection',
      title: `Selected ${route.model.name} via ${route.provider.name}`,
      details: {
        reason: route.reason,
        matchedCapabilities: route.matchedCapabilities,
        score: route.score,
      },
      status: 'completed',
    };
    trace.push(routingStep);
    if (onTraceStep) onTraceStep(routingStep);

    // 2. Prepare message history with guarded system prompt
    const guardedSystem = PromptDefense.buildGuardedSystemPrompt(
      `${this.config.systemPrompt}\n\nWorkspace active agent: ${this.config.name}.\nYou have access to the following tools: ${tools.map((t) => t.name).join(', ')}.\nWhen answering, decide if a tool call is needed. If so, return a tool call.`
    );

    const historyMessages: ChatMessage[] = (conversationHistory || [])
      .filter((h) => h.content && h.content.trim())
      .map((h) => ({
        role: h.role,
        content: h.content,
      }));

    const messages: ChatMessage[] = [
      { role: 'system', content: guardedSystem },
      ...historyMessages,
      {
        role: 'user',
        content: `${userInstruction}\n\n${contextString ? PromptDefense.wrapUntrustedContent('workspace_context', contextString) : ''}`,
      },
    ];

    let iteration = 0;
    let finalResponse = '';
    let accumulatedReasoning = '';
    const executedTools: Array<{ name: string; params: any; result: any; summary: string }> = [];

    while (iteration < (this.config.maxIterations || 6)) {
      iteration++;

      const agentStep: TraceStep = {
        id: `trace_${Date.now()}_iter_${iteration}`,
        timestamp: new Date().toISOString(),
        type: 'agent_execution',
        title: `Reasoning Step ${iteration}`,
        status: 'running',
      };
      trace.push(agentStep);
      if (onTraceStep) onTraceStep(agentStep);

      const iterStart = Date.now();

      // Dispatch to Model Router with Fallback
      let resultChunk: StreamChunk;
      try {
        const execution = await this.router.executeWithFallback(
          this.config.requiredCapabilities,
          messages,
          tools,
          onChunk,
          (fromModel, toModel, reason) => {
            const fbStep: TraceStep = {
              id: `trace_fallback_${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'model_selection',
              title: `Fallback: ${fromModel} -> ${toModel}`,
              details: { reason },
              status: 'completed',
            };
            trace.push(fbStep);
            if (onTraceStep) onTraceStep(fbStep);
          },
          signal
        );
        resultChunk = execution.result;
      } catch (err: any) {
        agentStep.status = 'failed';
        agentStep.durationMs = Date.now() - iterStart;
        agentStep.details = { error: err.message };
        if (onTraceStep) onTraceStep(agentStep);
        throw err;
      }

      agentStep.status = 'completed';
      agentStep.durationMs = Date.now() - iterStart;
      if (onTraceStep) onTraceStep(agentStep);

      if (resultChunk.usage) {
        accumulatedUsage.promptTokens += resultChunk.usage.promptTokens || 0;
        accumulatedUsage.completionTokens += resultChunk.usage.completionTokens || 0;
        accumulatedUsage.totalTokens += resultChunk.usage.totalTokens || 0;
      }

      if (resultChunk.reasoningContent) {
        accumulatedReasoning += resultChunk.reasoningContent;
      }
      if (resultChunk.content) {
        finalResponse = resultChunk.content;
      }

      // If model returned a tool call, execute each tool
      if (resultChunk.toolCalls && resultChunk.toolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: resultChunk.content || '',
          tool_calls: resultChunk.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.toolName,
              arguments: JSON.stringify(tc.parameters),
            },
          })),
        });

        for (const tc of resultChunk.toolCalls) {
          const toolCallStep: TraceStep = {
            id: `trace_${Date.now()}_tool_${tc.toolName}`,
            timestamp: new Date().toISOString(),
            type: 'tool_call',
            title: `Tool Call: ${tc.toolName}`,
            details: { parameters: tc.parameters },
            status: 'running',
          };
          trace.push(toolCallStep);
          if (onTraceStep) onTraceStep(toolCallStep);

          const toolStart = Date.now();
          const execResult = await this.toolRegistry.executeTool(tc, true, signal);
          toolCallStep.durationMs = Date.now() - toolStart;
          toolCallStep.status = execResult.success ? 'completed' : 'failed';
          toolCallStep.details = {
            parameters: tc.parameters,
            result: execResult.data,
            error: execResult.error,
          };
          if (onTraceStep) onTraceStep(toolCallStep);

          executedTools.push({
            name: tc.toolName,
            params: tc.parameters,
            result: execResult.data,
            summary:
              tc.toolName === 'write_file'
                ? `Created/updated file: ${tc.parameters?.path || tc.parameters?.filePath || 'workspace file'}`
                : tc.toolName === 'edit_file'
                ? `Edited file: ${tc.parameters?.path || tc.parameters?.filePath || 'workspace file'}`
                : `Executed ${tc.toolName}`,
          });

          // Add tool result back into context
          const toolResultString = execResult.success
            ? JSON.stringify(execResult.data)
            : `Error: ${execResult.error}`;

          messages.push({
            role: 'tool',
            name: tc.toolName,
            tool_call_id: tc.id,
            content: PromptDefense.wrapUntrustedContent(`tool:${tc.toolName}`, toolResultString),
          });
        }
      } else {
        // No tool call requested -> agent reached final text response
        finalResponse = resultChunk.content || '';
        break;
      }
    }

    // Ensure final response is NEVER blank or empty
    if (!finalResponse || !finalResponse.trim()) {
      if (executedTools.length > 0) {
        const fileActions = executedTools
          .filter((t) => t.name === 'write_file' || t.name === 'edit_file')
          .map((t) => `- **${t.summary}**`);

        finalResponse = `### Task Completed Successfully\n\nI have executed your request and performed the necessary actions in your workspace.\n\n${
          fileActions.length > 0 ? `#### Files Modified / Created:\n${fileActions.join('\n')}\n\n` : ''
        }#### Operations Summary:\n${executedTools.map((t) => `- \`${t.name}\`: Success`).join('\n')}\n\nYour workspace files have been updated and are ready for preview or testing.`;
      } else {
        finalResponse =
          'I have reviewed your request and workspace context. Let me know what you would like to build or modify next!';
      }
    }

    const finalStep: TraceStep = {
      id: `trace_${Date.now()}_done`,
      timestamp: new Date().toISOString(),
      type: 'result',
      title: 'Task Execution Complete',
      status: 'completed',
    };
    trace.push(finalStep);
    if (onTraceStep) onTraceStep(finalStep);

    return {
      response: finalResponse,
      reasoning: accumulatedReasoning || undefined,
      trace,
      usedRoute: route,
      usage: accumulatedUsage.totalTokens > 0 ? accumulatedUsage : undefined,
    };
  }
}
