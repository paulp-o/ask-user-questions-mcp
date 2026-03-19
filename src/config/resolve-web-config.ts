import { getConfig } from "./index.js";

export function resolveWebConfig(): { apiKey?: string; apiUrl?: string } {
  const config = getConfig();
  return {
    apiKey: process.env.AUQ_API_KEY || config.apiKey,
    apiUrl: process.env.AUQ_API_URL || config.apiUrl,
  };
}

export function isWebMode(): boolean {
  const { apiKey, apiUrl } = resolveWebConfig();
  return Boolean(apiKey && apiUrl);
}