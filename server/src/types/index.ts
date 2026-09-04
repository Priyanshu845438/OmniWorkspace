export type ModelCapability =
  | 'chat'
  | 'reasoning'
  | 'coding'
  | 'code_completion'
  | 'tool_calling'
  | 'structured_output'
  | 'vision'
  | 'image_generation'
  | 'image_editing'
  | 'video_generation'
  | 'video_editing'
  | 'audio_generation'
  | 'speech_to_text'
  | 'text_to_speech'
  | 'embeddings'
  | 'long_context'
  | 'streaming';

export type ModelType =
  | 'llm'
  | 'reasoning'
  | 'coding'
  | 'vision'
  | 'image'
  | 'video'
  | 'audio'
  | 'speech_to_text'
  | 'text_to_speech'
  | 'embedding'
  | 'reranking'
  | 'specialized';

export type ProviderType = 'nvidia' | 'openrouter' | 'ollama' | 'openai' | 'vllm' | 'custom';

export interface ModelDefinition {
  id: string;
  name: string;
  provider: ProviderType;
  type: ModelType;
  capabilities: ModelCapability[];
  contextWindow: number;
  maxTokens?: number;
  priority: number;
  enabled: boolean;
  description?: string;
  isLocal?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  isLocal: boolean;
  enabled: boolean;
  models: ModelDefinition[];
}

export enum PermissionLevel {
  LEVEL_0_READ_ONLY = 0,
  LEVEL_1_MODIFY = 1,
  LEVEL_2_EXECUTE = 2,
  LEVEL_3_NETWORK = 3,
  LEVEL_4_DESTRUCTIVE = 4,
}

export interface ToolParameterSchema {
  type: string;
  description?: string;
  properties?: Record<string, { type: string; description: string; enum?: string[] }>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  permissionLevel: PermissionLevel;
  category: 'file' | 'code' | 'terminal' | 'git' | 'web' | 'data' | 'sql' | 'media' | 'automation' | 'document';
}

export interface ToolCallRequest {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
}

export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
  timestamp: string;
}

export type AgentType =
  | 'general'
  | 'coding'
  | 'research'
  | 'data'
  | 'sql'
  | 'automation'
  | 'media'
  | 'document';

export interface TaskClassification {
  primaryCategory: AgentType;
  intent: string;
  requiredCapabilities: ModelCapability[];
  suggestedAgent: AgentType;
  riskLevel: PermissionLevel;
  plan: string[];
}

export interface TraceStep {
  id: string;
  timestamp: string;
  type:
    | 'task_understanding'
    | 'task_classification'
    | 'capability_requirements'
    | 'plan'
    | 'model_selection'
    | 'agent_execution'
    | 'tool_call'
    | 'tool_result'
    | 'approval_required'
    | 'verification'
    | 'result';
  title: string;
  details?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  durationMs?: number;
}

export interface ExecutionContext {
  workspacePath: string;
  activeFilePath?: string;
  openFiles?: string[];
  pinnedSymbols?: string[];
  gitBranch?: string;
  recentTerminalOutput?: string;
}

export interface VerificationResult {
  step: string;
  status: 'GENERATED' | 'VALIDATED' | 'VERIFIED' | 'FAILED';
  details: string;
  passed: boolean;
}

export * from './execution_contract.js';

