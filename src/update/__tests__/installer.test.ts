import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

// Mock node:child_process
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";
import type { PackageManagerInfo } from "../types.js";
import { installUpdate, getManualCommand } from "../installer.js";

describe("installer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("installUpdate", () => {
    function createMockChild() {
      const child = new EventEmitter();
      return child;
    }

    it("should return true when exit code is 0", async () => {
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>);

      const promise = installUpdate({
        name: "npm",
        installCommand: "npm install -g",
      });

      child.emit("close", 0);

      const result = await promise;
      expect(result).toBe(true);
    });

    it("should return false when exit code is 1", async () => {
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>);

      const promise = installUpdate({
        name: "npm",
        installCommand: "npm install -g",
      });

      child.emit("close", 1);

      const result = await promise;
      expect(result).toBe(false);
    });

    it("should return false on spawn error", async () => {
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>);

      const promise = installUpdate({
        name: "npm",
        installCommand: "npm install -g",
      });

      child.emit("error", new Error("ENOENT"));

      const result = await promise;
      expect(result).toBe(false);
    });

    it("should use correct args for npm", async () => {
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>);

      const pm: PackageManagerInfo = {
        name: "npm",
        installCommand: "npm install -g",
      };
      const promise = installUpdate(pm);
      child.emit("close", 0);
      await promise;

      expect(spawn).toHaveBeenCalledWith(
        "npm",
        ["install", "-g", "auq-mcp-server"],
        expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
      );
    });

    it("should use correct args for bun", async () => {
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>);

      const pm: PackageManagerInfo = {
        name: "bun",
        installCommand: "bun add -g",
      };
      const promise = installUpdate(pm);
      child.emit("close", 0);
      await promise;

      expect(spawn).toHaveBeenCalledWith(
        "bun",
        ["add", "-g", "auq-mcp-server"],
        expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
      );
    });

    it("should use correct args for yarn", async () => {
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>);

      const pm: PackageManagerInfo = {
        name: "yarn",
        installCommand: "yarn global add",
      };
      const promise = installUpdate(pm);
      child.emit("close", 0);
      await promise;

      expect(spawn).toHaveBeenCalledWith(
        "yarn",
        ["global", "add", "auq-mcp-server"],
        expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
      );
    });

    it("should use correct args for pnpm", async () => {
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>);

      const pm: PackageManagerInfo = {
        name: "pnpm",
        installCommand: "pnpm add -g",
      };
      const promise = installUpdate(pm);
      child.emit("close", 0);
      await promise;

      expect(spawn).toHaveBeenCalledWith(
        "pnpm",
        ["add", "-g", "auq-mcp-server"],
        expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
      );
    });
  });

  describe("getManualCommand", () => {
    it("should return correct command for npm", () => {
      expect(
        getManualCommand({ name: "npm", installCommand: "npm install -g" }),
      ).toBe("npm install -g auq-mcp-server");
    });

    it("should return correct command for bun", () => {
      expect(
        getManualCommand({ name: "bun", installCommand: "bun add -g" }),
      ).toBe("bun add -g auq-mcp-server");
    });

    it("should return correct command for yarn", () => {
      expect(
        getManualCommand({ name: "yarn", installCommand: "yarn global add" }),
      ).toBe("yarn global add auq-mcp-server");
    });

    it("should return correct command for pnpm", () => {
      expect(
        getManualCommand({ name: "pnpm", installCommand: "pnpm add -g" }),
      ).toBe("pnpm add -g auq-mcp-server");
    });
  });
});