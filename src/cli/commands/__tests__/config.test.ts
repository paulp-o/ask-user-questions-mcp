import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as readline from "node:readline";

import { runConfigCommand } from "../config.js";
import { DEFAULT_CONFIG } from "../../../config/defaults.js";

const {
  mockSetupTailscaleFunnelAuto,
  mockTelegramClient,
  mockGetMe,
  mockPutPendingPairing,
  mockSetWebhook,
  mockCreateInterface,
  mockQuestion,
  mockClose,
} = vi.hoisted(() => ({
  mockSetupTailscaleFunnelAuto: vi.fn(),
  mockTelegramClient: vi.fn(),
  mockGetMe: vi.fn(),
  mockSetWebhook: vi.fn(),
  mockPutPendingPairing: vi.fn(),
  mockCreateInterface: vi.fn(),
  mockQuestion: vi.fn(),
  mockClose: vi.fn(),
}));

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

vi.mock("node:readline", () => ({
  createInterface: mockCreateInterface,
}));

vi.mock("../../../telegram/client.js", () => ({
  TelegramClient: mockTelegramClient.mockImplementation(function (this: {
    getMe: typeof mockGetMe;
    setWebhook: typeof mockSetWebhook;
  }) {
    this.getMe = mockGetMe;
    this.setWebhook = mockSetWebhook;
  }),
}));

vi.mock("../../../telegram/pairing-file.js", () => ({
  putPendingPairing: mockPutPendingPairing,
}));

vi.mock("../../../telegram/funnel.js", () => ({
  setupTailscaleFunnelAuto: mockSetupTailscaleFunnelAuto,
}));

describe("config command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.AUQ_TELEGRAM_BOT_TOKEN;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Default: no config files exist
    vi.mocked(fs.existsSync).mockReturnValue(false);
    mockGetMe.mockReset();
    mockSetWebhook.mockReset();
    mockPutPendingPairing.mockReset();
    mockSetupTailscaleFunnelAuto.mockReset();
    mockSetupTailscaleFunnelAuto.mockResolvedValue({
      ok: false,
      errors: ["not mocked"],
      remediationCommands: [],
    });
    mockTelegramClient.mockReset();
    mockTelegramClient.mockImplementation(function (this: {
      getMe: typeof mockGetMe;
      setWebhook: typeof mockSetWebhook;
    }) {
      this.getMe = mockGetMe;
      this.setWebhook = mockSetWebhook;
    });
    mockCreateInterface.mockReset();
    mockQuestion.mockReset();
    mockClose.mockReset();
    mockGetMe.mockResolvedValue({ username: "test_bot" });
    mockSetWebhook.mockResolvedValue(true);
    mockCreateInterface.mockReturnValue({
      question: mockQuestion,
      close: mockClose,
    } as unknown as readline.Interface);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  // ── Config Get ──────────────────────────────────────────────────

  describe("config get", () => {
    it("should show all config values with defaults when no config files exist", async () => {
      await runConfigCommand(["get"]);

      // Should print key=value lines for all known keys
      expect(consoleLogSpy).toHaveBeenCalled();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("maxOptions = 5");
      expect(allOutput).toContain("sessionTimeout = 0");
      expect(allOutput).toContain("staleThreshold = 7200000");
      expect(allOutput).toContain("notifyOnStale = true");
      expect(allOutput).toContain("staleAction = warn");
      expect(allOutput).toContain("notifications.enabled = true");
      expect(allOutput).toContain("notifications.sound = true");
      expect(allOutput).toContain("telegram.enabled = false");
      expect(allOutput).toContain("telegram.bindHost = 0.0.0.0");
    });

    it("should show specific key value", async () => {
      await runConfigCommand(["get", "maxOptions"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("maxOptions = 5");
    });

    it("should show nested key value with dot notation", async () => {
      await runConfigCommand(["get", "notifications.enabled"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("notifications.enabled = true");
    });

    it("should error on unknown key", async () => {
      await runConfigCommand(["get", "unknownKey"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Unknown config key");
      expect(errorOutput).toContain("unknownKey");
    });

    it("should output valid JSON with --json flag for all config", async () => {
      await runConfigCommand(["get", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.config).toBeDefined();
      expect(parsed.config.maxOptions).toBe(DEFAULT_CONFIG.maxOptions);
    });

    it("should output valid JSON with --json flag for specific key", async () => {
      await runConfigCommand(["get", "staleThreshold", "--json"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.key).toBe("staleThreshold");
      expect(parsed.value).toBe(7200000);
    });

    it("should merge local config over defaults", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxOptions: 8 }),
      );

      await runConfigCommand(["get", "maxOptions"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("maxOptions = 8");
    });
  });

  // ── Config Set ──────────────────────────────────────────────────

  describe("config set", () => {
    it("should fail and not write when existing config JSON is invalid", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === cwd;
      });
      vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json");

      await runConfigCommand(["set", "staleThreshold", "3600000"]);

      expect(process.exitCode).toBe(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Invalid JSON");
    });

    it("should write valid key to local config file", async () => {
      const cwd = process.cwd();
      const expectedPath = `${cwd}/.auqrc.json`;

      // Simulate directory exists but file does not
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === cwd;
      });

      await runConfigCommand(["set", "staleThreshold", "3600000"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(String(writeCall[0])).toBe(expectedPath);
      const written = JSON.parse(writeCall[1] as string);
      expect(written.staleThreshold).toBe(3600000);
    });

    it("should write to global config with --global flag", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "staleThreshold", "3600000", "--global"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(String(writeCall[0])).toContain(".config/auq/.auqrc.json");
    });

    it("should create directory if it doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "maxOptions", "8", "--global"]);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(".config/auq"),
        { recursive: true },
      );
    });

    it("should merge with existing config", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === cwd;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxOptions: 6 }),
      );

      await runConfigCommand(["set", "staleThreshold", "5000000"]);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      // Existing key should be preserved
      expect(written.maxOptions).toBe(6);
      // New key should be added
      expect(written.staleThreshold).toBe(5000000);
    });

    it("should error on unknown config key with valid keys list", async () => {
      await runConfigCommand(["set", "badKey", "value"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Unknown config key");
      expect(errorOutput).toContain("badKey");
      // Should list valid keys
      expect(errorOutput).toContain("maxOptions");
      expect(errorOutput).toContain("staleThreshold");
    });

    it("should error on invalid value type", async () => {
      await runConfigCommand(["set", "maxOptions", "notanumber"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Invalid value");
    });

    it("should coerce boolean string values correctly", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "notifyOnStale", "false"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.notifyOnStale).toBe(false);
    });

    it("should validate enum values", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "staleAction", "archive"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.staleAction).toBe("archive");
    });

    it("should reject invalid enum values", async () => {
      await runConfigCommand(["set", "staleAction", "invalid_action"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle nested key set with dot notation", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "notifications.enabled", "false"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.notifications.enabled).toBe(false);
    });

    it("should reject invalid funnel mode", async () => {
      await runConfigCommand(["telegram", "init", "--funnel", "maybe"]);

      expect(process.exitCode).toBe(1);
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("--funnel");
      expect(errorOutput).toContain("auto");
      expect(errorOutput).toContain("off");
    });

    it("should reject invalid funnel mode even when webhookUrl exists", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === cwd;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          telegram: {
            webhookUrl: "https://existing.example.com/hook",
          },
        }),
      );

      await runConfigCommand(["telegram", "init", "--funnel", "maybe"]);

      expect(process.exitCode).toBe(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("--funnel");
      expect(errorOutput).toContain("auto");
      expect(errorOutput).toContain("off");
    });

    it("should set telegram nested config values", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "telegram.bindPort", "9000"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.telegram.bindPort).toBe(9000);
    });

    it("should output JSON with --json flag", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "staleThreshold", "3600000", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.key).toBe("staleThreshold");
      expect(parsed.value).toBe(3600000);
      expect(parsed.file).toBeDefined();
    });

    it("should error when key and value are missing", async () => {
      await runConfigCommand(["set"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ── Config help ─────────────────────────────────────────────────

  describe("config help", () => {
    it("should show usage help when no subcommand provided", async () => {
      await runConfigCommand([]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Usage");
    });

    it("should show usage and set exitCode for unknown subcommand", async () => {
      await runConfigCommand(["unknown"]);

      expect(process.exitCode).toBe(1);
    });

    it("should mention funnel mode in telegram usage", async () => {
      await runConfigCommand([]);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("--funnel auto|off");
    });
  });

  describe("config telegram", () => {
    it("should fail and not write when existing telegram config JSON is invalid", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === cwd;
      });
      vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json");

      await runConfigCommand([
        "telegram",
        "init",
        "--webhook-url",
        "https://funnel.example.com/hook",
      ]);

      expect(process.exitCode).toBe(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Invalid JSON");
    });

    it("should continue pairing when auto funnel setup fails", async () => {
      mockSetupTailscaleFunnelAuto.mockResolvedValue({
        ok: false,
        errors: ["tailscale missing"],
        remediationCommands: ["tailscale up"],
      });
      process.env.AUQ_TELEGRAM_BOT_TOKEN = "env-token";

      await runConfigCommand([
        "telegram",
        "init",
        "--funnel",
        "auto",
      ]);

      expect(process.exitCode).toBeUndefined();
      expect(mockSetupTailscaleFunnelAuto).toHaveBeenCalledWith(
        expect.objectContaining({ localPort: 8080 }),
      );
      expect(mockSetWebhook).not.toHaveBeenCalled();
      expect(mockPutPendingPairing).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should preserve existing webhookUrl when auto funnel fails", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === cwd;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          telegram: {
            webhookUrl: "https://existing.example.com/hook",
          },
        }),
      );
      mockSetupTailscaleFunnelAuto.mockResolvedValue({
        ok: false,
        errors: ["tailscale missing"],
        remediationCommands: ["tailscale up"],
      });
      process.env.AUQ_TELEGRAM_BOT_TOKEN = "env-token";

      await runConfigCommand(["telegram", "init", "--funnel", "auto"]);

      expect(process.exitCode).toBeUndefined();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.telegram.webhookUrl).toBe("https://existing.example.com/hook");
      expect(mockSetWebhook).not.toHaveBeenCalled();
    });

    it("should run auto funnel even when config already has webhookUrl and no explicit webhook-url flag", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === cwd;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          telegram: {
            webhookUrl: "https://existing.example.com/hook",
          },
        }),
      );
      mockSetupTailscaleFunnelAuto.mockResolvedValue({
        ok: true,
        errors: [],
        remediationCommands: [],
        webhookUrl: "https://funnel.example.com/webhook",
      });
      process.env.AUQ_TELEGRAM_BOT_TOKEN = "env-token";

      await runConfigCommand(["telegram", "init", "--funnel", "auto"]);

      expect(process.exitCode).toBeUndefined();
      expect(mockSetupTailscaleFunnelAuto).toHaveBeenCalledWith(
        expect.objectContaining({ localPort: 8080 }),
      );
      expect(mockSetWebhook).toHaveBeenCalledWith(
        "https://funnel.example.com/webhook",
        expect.objectContaining({
          allowedUpdates: ["callback_query", "message"],
        }),
      );
    });

    it("should use --token over env token", async () => {
      process.env.AUQ_TELEGRAM_BOT_TOKEN = "env-token";

      await runConfigCommand([
        "telegram",
        "init",
        "--token",
        "flag-token",
        "--webhook-url",
        "https://funnel.example.com/hook",
      ]);

      expect(process.exitCode).toBeUndefined();
      expect(mockTelegramClient).toHaveBeenCalled();
      expect(mockTelegramClient.mock.calls[0][0]).toEqual(
        expect.objectContaining({ token: "flag-token" }),
      );
      expect(mockTelegramClient.mock.calls[0][0]).not.toEqual(
        expect.objectContaining({ token: "env-token" }),
      );
    });

    it("should prompt for funnel, token, and webhook when interactive", async () => {
      const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
      const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
      try {
        Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
        Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });

        mockSetupTailscaleFunnelAuto.mockResolvedValue({
          ok: true,
          errors: [],
          remediationCommands: [],
          webhookUrl: "https://funnel.example.com/webhook",
        });
        delete process.env.AUQ_TELEGRAM_BOT_TOKEN;
        const answers = [
          "yes",
          "prompted-token",
        ];
        mockQuestion.mockImplementation((_question: string, callback: (answer: string) => void) => {
          callback(answers.shift() ?? "");
          return undefined;
        });

        await runConfigCommand(["telegram", "init"]);

        expect(process.exitCode).toBeUndefined();
        expect(mockCreateInterface).toHaveBeenCalled();
        expect(mockQuestion).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining("funnel"),
          expect.any(Function),
        );
        expect(mockQuestion).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining("AUQ_TELEGRAM_BOT_TOKEN"),
          expect.any(Function),
        );
        expect(mockQuestion).toHaveBeenCalledTimes(2);
        expect(mockSetupTailscaleFunnelAuto).toHaveBeenCalledWith(
          expect.objectContaining({ localPort: 8080 }),
        );
        expect(mockSetWebhook).toHaveBeenCalledWith(
          "https://funnel.example.com/webhook",
          expect.objectContaining({
            allowedUpdates: ["callback_query", "message"],
          }),
        );
      } finally {
        if (stdinTTY) {
          Object.defineProperty(process.stdin, "isTTY", stdinTTY);
        } else {
          delete (process.stdin as { isTTY?: boolean }).isTTY;
        }
        if (stdoutTTY) {
          Object.defineProperty(process.stdout, "isTTY", stdoutTTY);
        } else {
          delete (process.stdout as { isTTY?: boolean }).isTTY;
        }
      }
    });

    it("should prefer webhook-url over funnel prompting", async () => {
      const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
      const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
      try {
        Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
        Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });

        delete process.env.AUQ_TELEGRAM_BOT_TOKEN;
        mockQuestion.mockImplementation((_question: string, callback: (answer: string) => void) => {
          callback("prompted-token");
          return undefined;
        });

        await runConfigCommand([
          "telegram",
          "init",
          "--webhook-url",
          "https://funnel.example.com/hook",
        ]);

        expect(process.exitCode).toBeUndefined();
        expect(mockCreateInterface).toHaveBeenCalledTimes(1);
        expect(mockQuestion).toHaveBeenCalledTimes(1);
        expect(mockQuestion.mock.calls[0][0]).toContain("AUQ_TELEGRAM_BOT_TOKEN");
        expect(mockQuestion.mock.calls[0][0]).not.toContain("funnel");
        expect(mockSetWebhook).toHaveBeenCalledWith(
          "https://funnel.example.com/hook",
          expect.objectContaining({
            allowedUpdates: ["callback_query", "message"],
          }),
        );
      } finally {
        if (stdinTTY) {
          Object.defineProperty(process.stdin, "isTTY", stdinTTY);
        } else {
          delete (process.stdin as { isTTY?: boolean }).isTTY;
        }
        if (stdoutTTY) {
          Object.defineProperty(process.stdout, "isTTY", stdoutTTY);
        } else {
          delete (process.stdout as { isTTY?: boolean }).isTTY;
        }
      }
    });

    it("should reject init when token env is missing in non-interactive mode", async () => {
      const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
      const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
      try {
        Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: false });
        Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: false });

        delete process.env.AUQ_TELEGRAM_BOT_TOKEN;
        await runConfigCommand(["telegram", "init", "--webhook-url", "https://funnel.example.com/hook"]);

        expect(process.exitCode).toBe(1);
        const output = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
        expect(output).toContain("AUQ_TELEGRAM_BOT_TOKEN");
        expect(output).toContain("export");
        expect(output).toContain("CLI");
        expect(output).toContain("互動");
      } finally {
        if (stdinTTY) {
          Object.defineProperty(process.stdin, "isTTY", stdinTTY);
        } else {
          delete (process.stdin as { isTTY?: boolean }).isTTY;
        }
        if (stdoutTTY) {
          Object.defineProperty(process.stdout, "isTTY", stdoutTTY);
        } else {
          delete (process.stdout as { isTTY?: boolean }).isTTY;
        }
      }
    });

    it("should not enter interactive flow when stdout is not a TTY", async () => {
      const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
      const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
      try {
        Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
        Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: false });

        delete process.env.AUQ_TELEGRAM_BOT_TOKEN;
        await runConfigCommand([
          "telegram",
          "init",
          "--webhook-url",
          "https://funnel.example.com/hook",
        ]);

        expect(process.exitCode).toBe(1);
        expect(mockCreateInterface).not.toHaveBeenCalled();
        expect(mockQuestion).not.toHaveBeenCalled();
        const output = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
        expect(output).toContain("AUQ_TELEGRAM_BOT_TOKEN");
      } finally {
        if (stdinTTY) {
          Object.defineProperty(process.stdin, "isTTY", stdinTTY);
        } else {
          delete (process.stdin as { isTTY?: boolean }).isTTY;
        }
        if (stdoutTTY) {
          Object.defineProperty(process.stdout, "isTTY", stdoutTTY);
        } else {
          delete (process.stdout as { isTTY?: boolean }).isTTY;
        }
      }
    });

  });
});
