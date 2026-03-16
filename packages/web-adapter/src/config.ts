export interface AuqApiClientConfig {
  baseUrl: string;
  apiKey: string;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  fetchFn?: typeof fetch;
}

export interface WebSessionManagerConfig {
  apiUrl: string;
  apiKey: string;
  pollInterval?: number;
  sessionTimeout?: number;
  maxPollErrors?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  fetchFn?: typeof fetch;
}

export function validateWebAdapterConfig(
  config: WebSessionManagerConfig,
): Required<
  Pick<
    WebSessionManagerConfig,
    | "apiUrl"
    | "apiKey"
    | "pollInterval"
    | "sessionTimeout"
    | "maxPollErrors"
    | "maxRetries"
    | "retryBaseDelayMs"
  >
> & {
  fetchFn?: typeof fetch;
} {
  if (typeof config.apiUrl !== "string" || config.apiUrl.trim() === "") {
    throw new Error("apiUrl is required");
  }

  if (typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
    throw new Error("apiKey is required");
  }

  if (
    config.pollInterval !== undefined &&
    (config.pollInterval < 1000 || config.pollInterval > 30000)
  ) {
    throw new Error("pollInterval must be between 1000 and 30000");
  }

  const apiUrl = config.apiUrl.replace(/\/+$/, "");

  return {
    apiUrl,
    apiKey: config.apiKey,
    pollInterval: config.pollInterval ?? 3000,
    sessionTimeout: config.sessionTimeout ?? 0,
    maxPollErrors: config.maxPollErrors ?? 3,
    maxRetries: config.maxRetries ?? 3,
    retryBaseDelayMs: config.retryBaseDelayMs ?? 1000,
    fetchFn: config.fetchFn,
  };
}