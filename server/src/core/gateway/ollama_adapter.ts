import { ModelDefinition, ToolDefinition, ToolCallRequest } from '../../types/index.js';
import { ProviderAdapter, ChatMessage, StreamChunk } from './base.js';

export class OllamaAdapter implements ProviderAdapter {
  private defaultBaseUrl: string;

  constructor(defaultBaseUrl: string = 'http://localhost:11434') {
    this.defaultBaseUrl = defaultBaseUrl;
  }

  public async testConnection(
    _apiKey?: string,
    baseUrl?: string
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const url = `${baseUrl || this.defaultBaseUrl}/api/tags`;
    const start = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return { success: false, latencyMs, error: `HTTP ${res.status}: Ollama not responding properly` };
      }
      return { success: true, latencyMs };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: `Ollama is not running locally (${(err as Error).message}). Start Ollama with 'ollama serve'.`,
      };
    }
  }

  public async chatStream(
    model: ModelDefinition,
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    _apiKey?: string,
    baseUrl?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<StreamChunk> {
    const endpoint = `${baseUrl || this.defaultBaseUrl}/api/chat`;

    // Map messages for Ollama format
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const payload: Record<string, unknown> = {
      model: model.id,
      messages: formattedMessages,
      stream: true,
    };

    if (tools && tools.length > 0 && model.capabilities.includes('tool_calling')) {
      payload.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Error (${res.status}): ${errText}`);
    }

    if (!res.body) {
      throw new Error('Ollama response body is empty');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    const toolCalls: ToolCallRequest[] = [];
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message?.content) {
            accumulatedContent += parsed.message.content;
            if (onChunk) {
              onChunk({ content: parsed.message.content, isComplete: false });
            }
          }

          if (parsed.message?.tool_calls) {
            for (const tc of parsed.message.tool_calls) {
              toolCalls.push({
                id: `tc_ollama_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                toolName: tc.function?.name || 'unknown',
                parameters: tc.function?.arguments || {},
              });
            }
          }
        } catch {
          // Ignore incomplete JSON line
        }
      }
    }

    const finalChunk: StreamChunk = {
      content: accumulatedContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      isComplete: true,
    };

    if (onChunk) {
      onChunk(finalChunk);
    }

    return finalChunk;
  }
}
