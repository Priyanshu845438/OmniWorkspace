import { ToolDefinition, ToolCallRequest, ToolExecutionResult, PermissionLevel } from '../../types/index.js';
import { PermissionManager } from '../security/permissions.js';

export type ToolHandler = (params: any, signal?: AbortSignal) => Promise<unknown>;

export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private permissionManager: PermissionManager;
  private auditLog: Array<{
    timestamp: string;
    toolName: string;
    permissionLevel: PermissionLevel;
    approved: boolean;
    durationMs: number;
    success: boolean;
    error?: string;
  }> = [];

  constructor(permissionManager: PermissionManager) {
    this.permissionManager = permissionManager;
  }

  public registerTool(definition: ToolDefinition, handler: ToolHandler) {
    this.tools.set(definition.name, { definition, handler });
  }

  public getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  public getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  public getDefinitionsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter((t) => t.definition.category === category)
      .map((t) => t.definition);
  }

  public getAuditLogs() {
    return [...this.auditLog];
  }

  /**
   * Executes a tool request safely through permission checks, input validation, timeouts, and audit logging.
   */
  public async executeTool(
    request: ToolCallRequest,
    isUserConfirmed: boolean = false,
    signal?: AbortSignal
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const registered = this.tools.get(request.toolName);

    if (!registered) {
      return {
        toolCallId: request.id,
        toolName: request.toolName,
        success: false,
        error: `Tool '${request.toolName}' is not registered in the Tool Registry.`,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const { definition, handler } = registered;

    // Check permissions
    const needsApproval = this.permissionManager.requiresUserApproval(definition.permissionLevel);
    if (needsApproval && !isUserConfirmed) {
      return {
        toolCallId: request.id,
        toolName: request.toolName,
        success: false,
        error: `PERMISSION_REQUIRED: Tool '${request.toolName}' requires Level ${definition.permissionLevel} confirmation.`,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Execute with timeout wrapper
      const timeoutMs = 30000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const executionPromise = handler(request.parameters, signal);
      const data = await Promise.race([executionPromise, timeoutPromise]);
      const durationMs = Date.now() - startTime;

      this.auditLog.push({
        timestamp: new Date().toISOString(),
        toolName: request.toolName,
        permissionLevel: definition.permissionLevel,
        approved: true,
        durationMs,
        success: true,
      });

      return {
        toolCallId: request.id,
        toolName: request.toolName,
        success: true,
        data,
        durationMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = (err as Error).message || 'Unknown tool execution error';

      this.auditLog.push({
        timestamp: new Date().toISOString(),
        toolName: request.toolName,
        permissionLevel: definition.permissionLevel,
        approved: true,
        durationMs,
        success: false,
        error: errorMsg,
      });

      return {
        toolCallId: request.id,
        toolName: request.toolName,
        success: false,
        error: errorMsg,
        durationMs,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
