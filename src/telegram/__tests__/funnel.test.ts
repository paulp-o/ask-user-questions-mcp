import { describe, expect, it, vi } from "vitest";

import {
  preflightTailscale,
  setupTailscaleFunnelAuto,
} from "../funnel.js";

function createRunner(responses: Record<string, unknown>) {
  return {
    run: vi.fn(async (args: string[]) => {
      const key = args.join(" ");
      const response = responses[key];
      if (response === undefined) {
        throw new Error(`Unexpected command: ${key}`);
      }
      return response as {
        ok: boolean;
        exitCode: number | null;
        stdout: string;
        stderr: string;
        error?: { code?: string; message?: string };
      };
    }),
  };
}

describe("funnel", () => {
  it("should report missing binary during preflight", async () => {
    const runner = createRunner({
      "status --json": {
        ok: false,
        exitCode: null,
        stdout: "",
        stderr: "",
        error: { code: "ENOENT", message: "spawn tailscale ENOENT" },
      },
    });

    const result = await preflightTailscale(runner);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("tailscale");
    expect(result.remediationCommands).toContain("tailscale up");
  });

  it("should report not logged in during preflight", async () => {
    const runner = createRunner({
      "status --json": {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify({ BackendState: "NeedsLogin" }),
        stderr: "",
      },
    });

    const result = await preflightTailscale(runner);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("登入");
    expect(result.remediationCommands).toContain("tailscale up");
  });

  it("should normalize /webhook/ without duplicating the path", async () => {
    const runner = createRunner({
      "status --json": {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify({ BackendState: "Running" }),
        stderr: "",
      },
      "funnel reset": {
        ok: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      "funnel --bg --https=443 --set-path=/webhook http://127.0.0.1:8080": {
        ok: true,
        exitCode: 0,
        stdout: "Created funnel for https://demo.ts.net/webhook/\n",
        stderr: "",
      },
      "funnel status": {
        ok: true,
        exitCode: 0,
        stdout: "https://demo.ts.net/webhook/\n",
        stderr: "",
      },
    });

    const result = await setupTailscaleFunnelAuto({
      localPort: 8080,
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.webhookUrl).toBe("https://demo.ts.net/webhook");
  });

  it("should reset then create funnel and return the webhook URL", async () => {
    const runner = createRunner({
      "status --json": {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify({ BackendState: "Running" }),
        stderr: "",
      },
      "funnel reset": {
        ok: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      "funnel --bg --https=443 --set-path=/webhook http://127.0.0.1:8080": {
        ok: true,
        exitCode: 0,
        stdout: "Created funnel for https://demo.ts.net/\n",
        stderr: "",
      },
      "funnel status": {
        ok: true,
        exitCode: 0,
        stdout: "https://demo.ts.net/\n",
        stderr: "",
      },
    });

    const result = await setupTailscaleFunnelAuto({
      localPort: 8080,
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.webhookUrl).toBe("https://demo.ts.net/webhook");
    expect(result.errors).toEqual([]);
    expect(runner.run.mock.calls.map((call: string[][]) => call[0].join(" "))).toEqual([
      "status --json",
      "funnel reset",
      "funnel --bg --https=443 --set-path=/webhook http://127.0.0.1:8080",
      "funnel status",
    ]);
  });

  it("should return remediation when funnel creation fails", async () => {
    const runner = createRunner({
      "status --json": {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify({ BackendState: "Running" }),
        stderr: "",
      },
      "funnel reset": {
        ok: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      },
      "funnel --bg --https=443 --set-path=/webhook http://127.0.0.1:8080": {
        ok: false,
        exitCode: 1,
        stdout: "",
        stderr: "port already in use",
      },
    });

    const result = await setupTailscaleFunnelAuto({
      localPort: 8080,
      runner,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("port already in use");
    expect(result.remediationCommands).toEqual(
      expect.arrayContaining([
        "tailscale funnel reset",
        "tailscale funnel --bg --https=443 --set-path=/webhook http://127.0.0.1:8080",
      ]),
    );
  });
});
