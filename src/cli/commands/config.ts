import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

import { AUQConfigSchema } from "../../config/types.js";
import { getConfigPaths, loadConfig } from "../../config/ConfigLoader.js";
import { outputResult, parseFlags } from "../utils.js";

/**
 * Get all valid config key paths, including dot-notated nested keys.
 * E.g. ["maxOptions", "notifications.enabled", "notifications.sound", ...]
 */
function getValidConfigKeys(): string[] {
  const shape = AUQConfigSchema.shape;
  const keys: string[] = [];

  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key as keyof typeof shape];
    // Check if this is a nested object schema (z.object wrapped in z.ZodDefault)
    const inner = getInnerSchema(fieldSchema);
    if (inner && "shape" in inner && typeof inner.shape === "object") {
      // It's a nested object — add dot-notated keys
      for (const subKey of Object.keys(
        inner.shape as Record<string, unknown>,
      )) {
        keys.push(`${key}.${subKey}`);
      }
    } else {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Unwrap a Zod schema from wrappers like ZodDefault, ZodOptional, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInnerSchema(schema: any): any {
  if (!schema) return schema;
  // ZodDefault wraps an inner schema in _def.innerType
  if (schema._def?.innerType) {
    return getInnerSchema(schema._def.innerType);
  }
  return schema;
}

/**
 * Get a value from a config object by dot-notated key.
 */
function getNestedValue(
  obj: Record<string, unknown>,
  key: string,
): unknown {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Set a value in a config object by dot-notated key.
 */
function setNestedValue(
  obj: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (
      current[part] === undefined ||
      current[part] === null ||
      typeof current[part] !== "object"
    ) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Coerce a string value to the correct type based on the key's schema.
 * Handles numbers, booleans, and enum strings.
 */
function coerceValue(key: string, rawValue: string): unknown {
  const parts = key.split(".");
  const shape = AUQConfigSchema.shape;

  // Get the Zod schema for this key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fieldSchema: any = shape[parts[0] as keyof typeof shape];
  if (!fieldSchema) return rawValue;

  // Unwrap nested path
  if (parts.length > 1) {
    const innerObj = getInnerSchema(fieldSchema);
    if (innerObj?.shape) {
      fieldSchema = innerObj.shape[parts[1]];
    }
  }

  const inner = getInnerSchema(fieldSchema);
  if (!inner) return rawValue;

  // Detect type using Zod schema type property (works with Zod v4+)
  const schemaType: string = inner._def?.type || inner.type || "";

  // Boolean
  if (schemaType === "boolean" || schemaType === "ZodBoolean") {
    if (rawValue === "true") return true;
    if (rawValue === "false") return false;
    return rawValue; // let Zod validation catch invalid values
  }

  // Number
  if (schemaType === "number" || schemaType === "ZodNumber") {
    const num = Number(rawValue);
    if (!Number.isNaN(num)) return num;
    return rawValue; // let Zod validation catch it
  }

  // Enum or string — keep as string
  return rawValue;
}

/**
 * Build a partial config object from a single key=value pair,
 * suitable for Zod partial validation.
 */
function buildPartialConfig(
  key: string,
  value: unknown,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  setNestedValue(obj, key, value);
  return obj;
}

/**
 * Read an existing config file or return empty object.
 */
function readConfigFileForWrite(filePath: string): Record<string, unknown> {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content) as Record<string, unknown>;
    }
  } catch {
    // File doesn't exist or invalid — start fresh
  }
  return {};
}

// ── Config Get ──────────────────────────────────────────────────────

async function configGet(args: string[]): Promise<void> {
  const { flags, positionals } = parseFlags(args);
  const jsonMode = flags.json === true;
  const key = positionals[0];

  const config = loadConfig();

  if (key) {
    // Validate that key is known
    const validKeys = getValidConfigKeys();
    if (!validKeys.includes(key)) {
      outputResult(
        {
          success: false,
          error: `Unknown config key: "${key}". Valid keys: ${validKeys.join(", ")}`,
        },
        jsonMode,
      );
      process.exitCode = 1;
      return;
    }

    const value = getNestedValue(
      config as unknown as Record<string, unknown>,
      key,
    );

    if (jsonMode) {
      console.log(JSON.stringify({ success: true, key, value }, null, 2));
    } else {
      console.log(`${key} = ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
    }
    return;
  }

  // Show all config values
  if (jsonMode) {
    console.log(JSON.stringify({ success: true, config }, null, 2));
  } else {
    const validKeys = getValidConfigKeys();
    for (const k of validKeys) {
      const value = getNestedValue(
        config as unknown as Record<string, unknown>,
        k,
      );
      console.log(
        `${k} = ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
      );
    }
  }
}

// ── Config Set ──────────────────────────────────────────────────────

async function configSet(args: string[]): Promise<void> {
  const { flags, positionals } = parseFlags(args);
  const jsonMode = flags.json === true;
  const isGlobal = flags.global === true;

  const key = positionals[0];
  const rawValue = positionals[1];

  if (!key || rawValue === undefined) {
    outputResult(
      {
        success: false,
        error: "Usage: auq config set <key> <value> [--global] [--json]",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  // Validate key
  const validKeys = getValidConfigKeys();
  if (!validKeys.includes(key)) {
    outputResult(
      {
        success: false,
        error: `Unknown config key: "${key}". Valid keys: ${validKeys.join(", ")}`,
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  // Coerce value to correct type
  const coerced = coerceValue(key, rawValue);

  // Validate with Zod
  const partial = buildPartialConfig(key, coerced);
  const partialSchema = AUQConfigSchema.partial();
  const validation = partialSchema.safeParse(partial);

  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    outputResult(
      {
        success: false,
        error: `Invalid value for "${key}": ${issues}`,
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  // Determine target file
  const paths = getConfigPaths();
  const targetFile = isGlobal ? paths.global : paths.local;

  // Ensure directory exists
  const targetDir = dirname(targetFile);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Read existing config, merge, and write
  const existing = readConfigFileForWrite(targetFile);
  setNestedValue(existing, key, coerced);

  writeFileSync(targetFile, JSON.stringify(existing, null, 2) + "\n");

  outputResult(
    {
      success: true,
      key,
      value: coerced,
      file: targetFile,
    },
    jsonMode,
  );
}

// ── Config Command Dispatcher ───────────────────────────────────────

export async function runConfigCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "get":
      return configGet(args.slice(1));
    case "set":
      return configSet(args.slice(1));
    default:
      console.log(`Usage: auq config <subcommand>`, "\n");
      console.log("Subcommands:");
      console.log("  get [key] [--json]          Show config values");
      console.log(
        "  set <key> <value> [--global] [--json]  Set a config value",
      );
      console.log("");
      console.log("Examples:");
      console.log("  auq config get");
      console.log("  auq config get staleThreshold --json");
      console.log("  auq config set staleThreshold 3600000");
      console.log("  auq config set notifyOnStale false --global");
      if (subcommand !== undefined) {
        process.exitCode = 1;
      }
      break;
  }
}