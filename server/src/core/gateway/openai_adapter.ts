import { ModelDefinition, ToolDefinition, ToolCallRequest } from '../../types/index.js';
import { ProviderAdapter, ChatMessage, StreamChunk } from './base.js';
import { normalizeProviderError } from './error_normalizer.js';

const MODEL_ALIASES: Record<string, string> = {
  'nvidia/llama-3.1-nemotron-70b-instruct': 'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/deepseek-r1': 'deepseek-ai/deepseek-v4-flash-0731',
  'deepseek/deepseek-r1': 'deepseek-ai/deepseek-v4-flash-0731',
  'nvidia/kimi-k3': 'moonshotai/kimi-k3',
  'kimi-k3': 'moonshotai/kimi-k3',
  'deepseek-v4-flash': 'deepseek-ai/deepseek-v4-flash-0731',
  'deepseek-v4-pro': 'deepseek-ai/deepseek-v4-pro-0813',
  'muse-glimmer': 'meta/muse-glimmer-30b',
  'laguna-xs': 'poolside/laguna-xs-2.1',
  'diffusiongemma': 'google/diffusiongemma-26b-a4b-it',
  'gemini': 'gemini-2.0-flash',
};

export class OpenAICompatibleAdapter implements ProviderAdapter {
  private defaultBaseUrl: string;

  constructor(defaultBaseUrl: string = 'https://api.openai.com/v1') {
    this.defaultBaseUrl = defaultBaseUrl;
  }

  public async testConnection(
    apiKey?: string,
    baseUrl?: string
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const targetUrl = baseUrl || this.defaultBaseUrl;
    const url = `${targetUrl}/models`;
    const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
    if (!apiKey && !isLocal) {
      return {
        success: false,
        latencyMs: 0,
        error: 'API key required for remote provider endpoint.',
      };
    }
    const start = Date.now();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // For NVIDIA NIM, test completions directly to verify account inference entitlements
      if (targetUrl.includes('api.nvidia.com')) {
        const pingRes = await fetch(`${targetUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - start;
        if (!pingRes.ok) {
          const text = await pingRes.text();
          if (text.includes('Not found for account')) {
            return {
              success: false,
              latencyMs,
              error: 'NVIDIA API key valid, but account lacks Public API Endpoints permissions on build.nvidia.com.',
            };
          }
          return {
            success: false,
            latencyMs,
            error: `NVIDIA Chat Error (HTTP ${pingRes.status}): ${text.slice(0, 150)}`,
          };
        }
        return { success: true, latencyMs };
      }

      const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(6000) });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          latencyMs,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        };
      }
      return { success: true, latencyMs };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  public async chatStream(
    model: ModelDefinition,
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    apiKey?: string,
    baseUrl?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<StreamChunk> {
    const endpoint = `${baseUrl || this.defaultBaseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Format tools into standard OpenAI function calling format if supported and provided
    const formattedTools = tools && tools.length > 0 && model.capabilities.includes('tool_calling')
      ? tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }))
      : undefined;

    const effectiveModelId = MODEL_ALIASES[model.id] || model.id;

    const payload: Record<string, unknown> = {
      model: effectiveModelId,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };

    // Support thinking/reasoning kwargs for NVIDIA & reasoning models
    if (endpoint.includes('api.nvidia.com') || model.capabilities.includes('reasoning')) {
      payload.chat_template_kwargs = {
        enable_thinking: true,
        thinking: true,
      };
    }

    if (formattedTools) {
      payload.tools = formattedTools;
      payload.tool_choice = 'auto';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      const norm = normalizeProviderError(res.status, errText, model.provider);
      throw new Error(`[${norm.code}] ${norm.message} (${res.status})`);
    }

    if (!res.body) {
      throw new Error('Response body is empty');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    const toolCallsAccumulator: Map<number, { id: string; name: string; args: string }> = new Map();
    let buffer = '';
    let finishReason: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          if (choice.finish_reason) {
            finishReason = choice.finish_reason;
          }

          const delta = choice.delta;
          const reasoningDelta = delta?.reasoning_content || delta?.reasoning;
          if (reasoningDelta) {
            accumulatedContent += reasoningDelta;
            if (onChunk) {
              onChunk({ content: reasoningDelta, reasoningContent: reasoningDelta, isComplete: false });
            }
          } else if (delta?.content) {
            accumulatedContent += delta.content;
            if (onChunk) {
              onChunk({ content: delta.content, isComplete: false });
            }
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const existing = toolCallsAccumulator.get(idx) || { id: '', name: '', args: '' };
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name += tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
              toolCallsAccumulator.set(idx, existing);
            }
          }
        } catch {
          // Ignore incomplete JSON chunks in SSE stream
        }
      }
    }

    const parsedToolCalls: ToolCallRequest[] = [];
    for (const item of toolCallsAccumulator.values()) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(item.args || '{}');
      } catch {
        parsedArgs = { raw: item.args };
      }
      parsedToolCalls.push({
        id: item.id || `tc_${Date.now()}`,
        toolName: item.name,
        parameters: parsedArgs,
      });
    }

    const finalChunk: StreamChunk = {
      content: accumulatedContent,
      toolCalls: parsedToolCalls.length > 0 ? parsedToolCalls : undefined,
      isComplete: true,
      finishReason,
    };

    if (onChunk) {
      onChunk(finalChunk);
    }

    return finalChunk;
  }
}
