import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * AUQ Configuration
 */
export interface AuqConfig {
  theme?: string;
}

/**
 * Get the config directory for AUQ
 * Respects XDG_CONFIG_HOME on Linux, defaults to ~/.config/auq
 */
function getConfigDirectory(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  const baseConfig = xdgConfig || path.join(os.homedir(), ".config");
  return path.join(baseConfig, "auq");
}

/**
 * Get the config file path
 */
function getConfigPath(): string {
  return path.join(getConfigDirectory(), "config.json");
}

/**
 * Load config from file
 * Returns empty config if file doesn't exist or is invalid
 */
export function loadConfig(): AuqConfig {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return {};
    }
    const content = fs.readFileSync(configPath, "utf-8");
    const data = JSON.parse(content) as unknown;
    if (typeof data !== "object" || data === null) {
      return {};
    }
    return data as AuqConfig;
  } catch {
    // Silently return empty config on any error
    return {};
  }
}

/**
 * Save config to file
 * Creates the config directory if it doesn't exist
 */
export function saveConfig(config: AuqConfig): void {
  try {
    const configDir = getConfigDirectory();
    const configPath = getConfigPath();

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Merge with existing config to preserve other settings
    const existingConfig = loadConfig();
    const mergedConfig = { ...existingConfig, ...config };

    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2) + "\n");
  } catch {
    // Silently ignore save errors - config is optional
  }
}

/**
 * Get saved theme from config
 */
export function getSavedTheme(): string | undefined {
  const config = loadConfig();
  return config.theme;
}

/**
 * Save theme to config
 */
export function saveTheme(themeName: string): void {
  saveConfig({ theme: themeName });
}

/**
 * Get the config directory path (for display purposes)
 */
export function getConfigDirectoryPath(): string {
  return getConfigDirectory();
}
