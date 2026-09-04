export interface NormalizedProviderError {
  code:
    | 'AUTHENTICATION_FAILED'
    | 'AUTHORIZATION_DENIED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'TIMEOUT'
    | 'NETWORK_ERROR'
    | 'MODEL_NOT_FOUND'
    | 'SERVER_ERROR'
    | 'MALFORMED_RESPONSE'
    | 'CANCELLED'
    | 'UNKNOWN';
  statusCode?: number;
  message: string;
  isRecoverable: boolean;
  suggestedAction: string;
}

export function normalizeProviderError(
  status: number | undefined,
  rawError: string | Error,
  providerName: string
): NormalizedProviderError {
  const errorString = typeof rawError === 'string' ? rawError : rawError.message || String(rawError);

  // Redact potential bearer tokens or keys if accidentally mirrored by server error
  const sanitized = errorString
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***REDACTED***')
    .replace(/nvapi-[a-zA-Z0-9_-]{20,}/g, 'nvapi-***REDACTED***')
    .replace(/Bearer\s+[a-zA-Z0-9_-]{20,}/gi, 'Bearer ***REDACTED***');

  if (sanitized.includes('aborted') || sanitized.includes('AbortError') || sanitized.includes('cancelled')) {
    return {
      code: 'CANCELLED',
      message: 'Request was cancelled by the user.',
      isRecoverable: false,
      suggestedAction: 'No action required.',
    };
  }

  if (status === 401) {
    return {
      code: 'AUTHENTICATION_FAILED',
      statusCode: 401,
      message: `Invalid or missing API key for ${providerName}.`,
      isRecoverable: false,
      suggestedAction: 'Update your BYOK key in the Model Manager view.',
    };
  }

  if (sanitized.includes('not found for account') || sanitized.includes('public api endpoints')) {
    return {
      code: 'AUTHORIZATION_DENIED',
      statusCode: 403,
      message: `Account permission restriction on ${providerName}: Public API Endpoints or model permission not enabled for this account.`,
      isRecoverable: true,
      suggestedAction: 'Switch to verified active models like Nemotron 3 Nano Omni or verify account on build.nvidia.com.',
    };
  }

  if (status === 403) {
    return {
      code: 'AUTHORIZATION_DENIED',
      statusCode: 403,
      message: `Permission denied by ${providerName}. Account may lack permissions for this model.`,
      isRecoverable: false,
      suggestedAction: 'Verify account tier, credits, or permissions on the provider dashboard.',
    };
  }

  if (status === 429 || sanitized.includes('rate limit') || sanitized.includes('quota')) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      message: `Rate limit or quota threshold reached on ${providerName}.`,
      isRecoverable: true,
      suggestedAction: 'OmniWorkspace will automatically fallback to alternative configured providers.',
    };
  }

  if (status === 404 || sanitized.includes('model not found') || sanitized.includes('does not exist')) {
    return {
      code: 'MODEL_NOT_FOUND',
      statusCode: 404,
      message: `The requested model is not available on ${providerName}.`,
      isRecoverable: true,
      suggestedAction: 'Verify model name in provider settings or choose an alternate model.',
    };
  }

  if (status && status >= 500) {
    return {
      code: 'SERVER_ERROR',
      statusCode: status,
      message: `${providerName} service is experiencing internal errors (HTTP ${status}).`,
      isRecoverable: true,
      suggestedAction: 'Falling back to alternative configured provider.',
    };
  }

  if (sanitized.includes('fetch failed') || sanitized.includes('ECONNREFUSED') || sanitized.includes('ETIMEDOUT') || sanitized.includes('ENOTFOUND')) {
    return {
      code: 'NETWORK_ERROR',
      message: `Unable to connect to ${providerName} (${sanitized}).`,
      isRecoverable: true,
      suggestedAction: providerName.toLowerCase() === 'ollama'
        ? "Ensure Ollama is running locally with 'ollama serve'."
        : 'Verify internet connection and provider status.',
    };
  }

  return {
    code: 'UNKNOWN',
    statusCode: status,
    message: sanitized.slice(0, 300),
    isRecoverable: false,
    suggestedAction: 'Inspect system diagnostics for additional context.',
  };
}
