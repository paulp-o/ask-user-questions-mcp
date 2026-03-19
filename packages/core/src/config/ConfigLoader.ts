/**
 * ConfigLoader - Discovers and loads AUQ configuration files
 *
 * Search order (first found wins for each setting):
 * 1. Local: ./.auqrc.json (project directory)
 * 2. Global: ~/.config/auq/.auqrc.json (XDG_CONFIG_HOME)
 * 3. Defaults: Built-in values
 */

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

import type { AUQConfig } from "./types.js";

import { AUQConfigSchema } from "./types.js";
import { DEFAULT_CONFIG } from "./defaults.js";

/**
 * Get the XDG config home directory
 * Uses XDG_CONFIG_HOME if set, otherwise falls back to ~/.config
 */
function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
}

/**
 * Get the global config file path
 */
function getGlobalConfigPath(): string {
  return join(getXDGConfigHome(), "auq", ".auqrc.json");
}

/**
 * Get the local config file path (current working directory)
 */
function getLocalConfigPath(): string {
  return resolve(process.cwd(), ".auqrc.json");
}

/**
 * Read and parse a JSON config file
 * @returns Partial config or null if file doesn't exist or is invalid
 */
function readConfigFile(filePath: string): Partial<AUQConfig> | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);

    // Validate with Zod (partial validation)
    const partialSchema = AUQConfigSchema.partial();
    const result = partialSchema.safeParse(parsed);

    if (!result.success) {
      console.warn(
        `Warning: Invalid config file at ${filePath}:`,
        result.error.format(),
      );
      return null;
    }

    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(
        `Warning: Invalid JSON in config file at ${filePath}:`,
        error.message,
      );
    } else {
      console.warn(
        `Warning: Could not read config file at ${filePath}:`,
        error,
      );
    }
    return null;
  }
}

/**
 * Load configuration with the following priority:
 * 1. Local config (./.auqrc.json)
 * 2. Global config (~/.config/auq/.auqrc.json)
 * 3. Default values
 *
 * Settings are merged, with local taking precedence over global,
 * and both taking precedence over defaults.
 */
export function loadConfig(): AUQConfig {
  // Start with defaults
  let config: AUQConfig = { ...DEFAULT_CONFIG };

  // Load global config first (lower priority)
  const globalPath = getGlobalConfigPath();
  const globalConfig = readConfigFile(globalPath);
  if (globalConfig) {
    config = { ...config, ...globalConfig };
  }

  // Load local config (higher priority, overrides global)
  const localPath = getLocalConfigPath();
  const localConfig = readConfigFile(localPath);
  if (localConfig) {
    config = { ...config, ...localConfig };
  }

  return config;
}

/**
 * Get config file paths for debugging/info purposes
 */
export function getConfigPaths(): {
  local: string;
  global: string;
  localExists: boolean;
  globalExists: boolean;
} {
  const local = getLocalConfigPath();
  const global = getGlobalConfigPath();

  return {
    local,
    global,
    localExists: existsSync(local),
    globalExists: existsSync(global),
  };
}

// Singleton instance for the loaded config
let cachedConfig: AUQConfig | null = null;

/**
 * Get the loaded configuration (uses cached value after first load)
 */
export function getConfig(): AUQConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Reload configuration (clears cache and reloads from files)
 */
export function reloadConfig(): AUQConfig {
  cachedConfig = null;
  return getConfig();
}

/**
 * Reset to default configuration (useful for testing)
 */
export function resetToDefaults(): void {
  cachedConfig = { ...DEFAULT_CONFIG };
}
