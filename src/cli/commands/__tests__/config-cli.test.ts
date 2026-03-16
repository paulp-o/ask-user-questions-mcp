import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";

import { runConfigCommand } from "../config.js";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

describe("config command - list/reset/unset and web config", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const localConfigPath = `${process.cwd()}/.auqrc.json`;
  const globalConfigPath = "/home/testuser/.config/auq/.auqrc.json";

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.AUQ_WEB_API_KEY;
    delete process.env.AUQ_WEB_API_URL;
    delete process.env.AUQ_WEB_MODE;

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  describe("config list", () => {
    it("should output all keys including web.* keys", async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          web: {
            api_key: "auq_sk_1234567890abcd",
            mode: "web",
          },
        }),
      );

      await runConfigCommand(["list"]);

      const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("web.api_key");
      expect(output).toContain("web.api_url");
      expect(output).toContain("web.mode");
    });

    it("should mask web.api_key in text output", async () => {
      const apiKey = "auq_sk_1234567890abcd";
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          web: { api_key: apiKey, mode: "web" },
        }),
      );

      await runConfigCommand(["list"]);

      const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("web.api_key");
      expect(output).not.toContain(apiKey);
      expect(output).toMatch(/web\.api_key\s*=\s*auq_sk\*+abcd/);
    });

    it("should fully mask short web.api_key values", async () => {
      const shortKey = "short";
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          web: { api_key: shortKey, mode: "web" },
        }),
      );

      await runConfigCommand(["list"]);

      const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("web.api_key");
      expect(output).not.toContain(shortKey);
      expect(output).toMatch(/web\.api_key\s*=\s*\*+/);
    });

    it("should return masked web.api_key in JSON mode", async () => {
      const apiKey = "auq_sk_1234567890abcd";
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          web: { api_key: apiKey, mode: "web" },
        }),
      );

      await runConfigCommand(["list", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output) as { success: boolean; config: Record<string, unknown> };
      expect(parsed.success).toBe(true);
      expect(String(parsed.config["web.api_key"])).toMatch(/^auq_sk\*+abcd$/);
      expect(parsed.config["web.api_key"]).not.toBe(apiKey);
    });
  });

  describe("config reset", () => {
    it("should remove project-level .auqrc.json", async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);

      await runConfigCommand(["reset"]);

      expect(fs.rmSync).toHaveBeenCalledWith(localConfigPath);
      expect(process.exitCode).toBeUndefined();
    });

    it("should remove global .auqrc.json with --global", async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === globalConfigPath);

      await runConfigCommand(["reset", "--global"]);

      expect(fs.rmSync).toHaveBeenCalledWith(globalConfigPath);
      expect(process.exitCode).toBeUndefined();
    });
  });

  describe("config unset", () => {
    it("should remove single key from project-level .auqrc.json", async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          maxOptions: 7,
          web: { api_key: "auq_sk_1234567890abcd", mode: "web" },
        }),
      );

      await runConfigCommand(["unset", "web.api_key"]);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(String(writeCall[0])).toBe(localConfigPath);
      const written = JSON.parse(writeCall[1] as string) as { maxOptions?: number; web?: { api_key?: string; mode?: string } };
      expect(written.maxOptions).toBe(7);
      expect(written.web?.api_key).toBeUndefined();
    });

    it("should remove single key from global .auqrc.json with --global", async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === globalConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          web: { api_key: "auq_sk_1234567890abcd", api_url: "https://self-hosted.example.com" },
        }),
      );

      await runConfigCommand(["unset", "web.api_url", "--global"]);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(String(writeCall[0])).toBe(globalConfigPath);
      const written = JSON.parse(writeCall[1] as string) as { web?: { api_key?: string; api_url?: string } };
      expect(written.web?.api_key).toBe("auq_sk_1234567890abcd");
      expect(written.web?.api_url).toBeUndefined();
    });
  });

  describe("web config through existing set/get", () => {
    it("should store web.api_key via config set", async () => {
      const apiKey = "auq_sk_1234567890abcd";
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === process.cwd());

      await runConfigCommand(["set", "web.api_key", apiKey]);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(String(writeCall[0])).toBe(localConfigPath);
      const written = JSON.parse(writeCall[1] as string) as { web?: { api_key?: string } };
      expect(written.web?.api_key).toBe(apiKey);
    });

    it("should return masked value for config get web.api_key", async () => {
      const apiKey = "auq_sk_1234567890abcd";
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          web: { api_key: apiKey, mode: "web" },
        }),
      );

      await runConfigCommand(["get", "web.api_key"]);

      const output = consoleLogSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(output).toContain("web.api_key");
      expect(output).not.toContain(apiKey);
      expect(output).toMatch(/web\.api_key\s*=\s*auq_sk\*+abcd/);
    });

    it("should return default hosted URL for web.api_url when api_key exists but api_url is missing", async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path) === localConfigPath);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          web: { api_key: "auq_sk_1234567890abcd", mode: "web" },
        }),
      );

      await runConfigCommand(["get", "web.api_url"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("web.api_url = https://auq.paulp.dev");
    });
  });

  describe("sanity", () => {
    it("uses mocked homedir for global path resolution", () => {
      expect(os.homedir()).toBe("/home/testuser");
    });
  });
});