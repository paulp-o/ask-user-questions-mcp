/**
 * OpenTUI test utilities for bun:test.
 * Uses @opentui/core/testing for renderer simulation.
 */

// Note: Full render utilities will be added when components are ready.
// For now, provide mock helpers that don't require the renderer.

import type { AUQConfig } from "../../config/types.js";
import { DEFAULT_CONFIG } from "../../config/defaults.js";

/** Create a test config with overrides */
export function makeTestConfig(overrides: Partial<AUQConfig> = {}): AUQConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** Mock terminal dimensions */
export function makeDimensions(width: number = 80, height: number = 24) {
  return { width, height };
}