import { ModelDefinition, ToolDefinition, ToolCallRequest } from '../../types/index.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | any;
  name?: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
}

export interface StreamChunk {
  content?: string;
  reasoningContent?: string;
  role?: 'assistant' | 'system' | 'user' | 'tool';
  toolCalls?: ToolCallRequest[];
  isComplete: boolean;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ProviderAdapter {
  testConnection(apiKey?: string, baseUrl?: string): Promise<{ success: boolean; latencyMs: number; error?: string }>;
  chatStream(
    model: ModelDefinition,
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    apiKey?: string,
    baseUrl?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<StreamChunk>;
}
