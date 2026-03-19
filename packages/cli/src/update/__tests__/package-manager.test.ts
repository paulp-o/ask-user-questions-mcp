import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectPackageManager, PACKAGE_NAME } from "../package-manager.js";

describe("package manager detection", () => {
  const originalEnv = { ...process.env };
  const originalExecPath = process.execPath;

  beforeEach(() => {
    // Clear relevant env vars so each test starts clean
    delete process.env.npm_config_user_agent;
    delete process.env.npm_execpath;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.defineProperty(process, "execPath", { value: originalExecPath });
  });

  describe("PACKAGE_NAME", () => {
    it("should equal auq-mcp-server", () => {
      expect(PACKAGE_NAME).toBe("auq-mcp-server");
    });
  });

  describe("detectPackageManager", () => {
    it("should detect bun from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "bun/1.0.0 linux x64";
      const result = detectPackageManager();
      expect(result.name).toBe("bun");
      expect(result.installCommand).toBe("bun add -g");
    });

    it("should detect yarn from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "yarn/4.0.0 node/v20.0.0";
      const result = detectPackageManager();
      expect(result.name).toBe("yarn");
      expect(result.installCommand).toBe("yarn global add");
    });

    it("should detect pnpm from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "pnpm/8.0.0 node/v20.0.0";
      const result = detectPackageManager();
      expect(result.name).toBe("pnpm");
      expect(result.installCommand).toBe("pnpm add -g");
    });

    it("should detect npm from npm_config_user_agent", () => {
      process.env.npm_config_user_agent = "npm/10.2.0 node/v20.9.0 darwin arm64";
      const result = detectPackageManager();
      expect(result.name).toBe("npm");
      expect(result.installCommand).toBe("npm install -g");
    });

    it("should fallback to npm_execpath when user_agent is empty", () => {
      process.env.npm_config_user_agent = "";
      process.env.npm_execpath = "/usr/local/lib/yarn/bin/yarn.js";
      const result = detectPackageManager();
      expect(result.name).toBe("yarn");
    });

    it("should fallback to process.execPath for bun detection", () => {
      process.env.npm_config_user_agent = "";
      process.env.npm_execpath = "";
      Object.defineProperty(process, "execPath", {
        value: "/home/user/.bun/bin/bun",
        configurable: true,
      });
      const result = detectPackageManager();
      expect(result.name).toBe("bun");
    });

    it("should default to npm when no indicators found", () => {
      process.env.npm_config_user_agent = "";
      process.env.npm_execpath = "";
      Object.defineProperty(process, "execPath", {
        value: "/usr/local/bin/node",
        configurable: true,
      });
      const result = detectPackageManager();
      expect(result.name).toBe("npm");
      expect(result.installCommand).toBe("npm install -g");
    });
  });
});