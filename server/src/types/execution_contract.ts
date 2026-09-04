import {
  AgentType,
  ModelCapability,
  PermissionLevel,
  TraceStep,
  ExecutionContext,
  VerificationResult,
  ToolCallRequest,
  ToolExecutionResult,
} from './index.js';

export type ExecutionState =
  | 'idle'
  | 'queued'
  | 'classifying'
  | 'routing'
  | 'planning'
  | 'executing'
  | 'waiting_approval'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ApprovalState {
  required: boolean;
  permissionLevel: PermissionLevel;
  toolCallId?: string;
  toolName?: string;
  toolParameters?: Record<string, unknown>;
  description?: string;
  approved?: boolean;
  decidedAt?: string;
}

export interface CancellationState {
  isCancelled: boolean;
  reason?: string;
  cancelledAt?: string;
}

export interface CandidateRoute {
  modelId: string;
  modelName: string;
  providerId: string;
  providerName: string;
  score: number;
  isLocal: boolean;
  reason: string;
}

export interface RoutingDecision {
  selectedModelId: string;
  selectedModelName: string;
  selectedProviderId: string;
  selectedProviderName: string;
  score: number;
  reason: string;
  matchedCapabilities: ModelCapability[];
  fallbackChain: CandidateRoute[];
}

export interface ExecutionContract {
  taskId: string;
  sessionId: string;
  workspaceId: string;
  userRequest: string;
  taskType: AgentType;
  requiredCapabilities: ModelCapability[];
  routing: RoutingDecision;
  agent: AgentType;
  allowedTools: string[];
  context: ExecutionContext;
  state: ExecutionState;
  approval: ApprovalState;
  cancellation: CancellationState;
  steps: TraceStep[];
  toolCalls: ToolCallRequest[];
  toolResults: ToolExecutionResult[];
  verification?: VerificationResult;
  finalResult?: string;
  error?: {
    code: string;
    message: string;
    stage: string;
    recoverable: boolean;
    userAction?: string;
  };
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
}

export interface StreamTelemetryEvent {
  type:
    | 'contract_init'
    | 'classification'
    | 'model_selection'
    | 'plan'
    | 'token'
    | 'trace'
    | 'approval_required'
    | 'approval_decision'
    | 'verification'
    | 'done'
    | 'cancelled'
    | 'error';
  taskId: string;
  timestamp: string;
  payload: unknown;
}
