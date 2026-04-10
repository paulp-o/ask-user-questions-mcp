import { spawn } from "node:child_process";
import { URL } from "node:url";

export interface TailscaleCommandResult {
  error?: { code?: string; message?: string };
  exitCode: number | null;
  ok: boolean;
  stderr: string;
  stdout: string;
}

export interface TailscaleRunner {
  run(args: string[]): Promise<TailscaleCommandResult>;
}

export interface FunnelPreflightResult {
  errors: string[];
  ok: boolean;
  remediationCommands: string[];
}

export interface FunnelSetupResult extends FunnelPreflightResult {
  webhookUrl?: string;
}

export interface FunnelSetupOptions {
  httpsPort?: number;
  localPort: number;
  runner?: TailscaleRunner;
}

const DEFAULT_HTTPS_PORT = 443;
const DEFAULT_WEBHOOK_PATH = "/webhook";

function createDefaultRunner(): TailscaleRunner {
  return {
    run: (args: string[]) => runTailscaleCommand(args),
  };
}

function runTailscaleCommand(args: string[]): Promise<TailscaleCommandResult> {
  return new Promise((resolve) => {
    try {
      const child = spawn("tailscale", args, {
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on("error", (error: NodeJS.ErrnoException) => {
        resolve({
          ok: false,
          exitCode: null,
          stdout,
          stderr,
          error: { code: error.code, message: error.message },
        });
      });

      child.on("close", (exitCode: number | null) => {
        resolve({
          ok: exitCode === 0,
          exitCode,
          stdout,
          stderr,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      resolve({
        ok: false,
        exitCode: null,
        stdout: "",
        stderr: "",
        error: { message },
      });
    }
  });
}

function buildFailure(
  errors: string[],
  remediationCommands: string[],
): FunnelPreflightResult {
  return {
    ok: false,
    errors,
    remediationCommands,
  };
}

function buildSuccess(webhookUrl?: string): FunnelSetupResult {
  return {
    ok: true,
    errors: [],
    remediationCommands: [],
    ...(webhookUrl ? { webhookUrl } : {}),
  };
}

function extractWebhookUrl(text: string): string | undefined {
  const match = text.match(/https:\/\/[^\s"'<>`]+/);
  if (!match) return undefined;

  return match[0].replace(/[),.;]+$/, "");
}

function normalizeWebhookUrl(urlText: string, path = DEFAULT_WEBHOOK_PATH): string {
  const url = new URL(urlText);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const currentPath = url.pathname.replace(/\/+$/, "") || "/";

  if (currentPath.endsWith(normalizedPath)) {
    url.pathname = currentPath;
    return url.toString();
  }

  const basePath = currentPath === "/" ? "" : currentPath;
  url.pathname = `${basePath}${normalizedPath}`;
  return url.toString();
}

function buildFunnelCommand(localPort: number, httpsPort: number): string[] {
  return [
    "funnel",
    "--bg",
    `--https=${httpsPort}`,
    `--set-path=${DEFAULT_WEBHOOK_PATH}`,
    `http://127.0.0.1:${localPort}`,
  ];
}

function getCommandString(args: string[]): string {
  return ["tailscale", ...args].join(" ");
}

export async function preflightTailscale(
  runner: TailscaleRunner = createDefaultRunner(),
): Promise<FunnelPreflightResult> {
  const status = await runner.run(["status", "--json"]);

  if (status.error?.code === "ENOENT") {
    return buildFailure(
      [
        "找不到 tailscale binary。",
        "請先安裝 Tailscale，然後再重試 auto funnel。",
      ],
      ["tailscale up"],
    );
  }

  if (!status.ok) {
    const message = status.stderr.trim() || status.error?.message || "tailscale status --json 失敗";
    return buildFailure(
      [`Tailscale preflight 失敗：${message}`],
      ["tailscale up"],
    );
  }

  let parsed: { BackendState?: string };
  try {
    parsed = JSON.parse(status.stdout) as { BackendState?: string };
  } catch {
    return buildFailure(
      ["無法解析 `tailscale status --json` 輸出。"],
      ["tailscale status --json", "tailscale up"],
    );
  }

  if (parsed.BackendState !== "Running") {
    return buildFailure(
      [`Tailscale 未登入或尚未可用（BackendState=${parsed.BackendState ?? "unknown"}）。`],
      ["tailscale up"],
    );
  }

  return {
    ok: true,
    errors: [],
    remediationCommands: [],
  };
}

export async function setupTailscaleFunnelAuto(
  options: FunnelSetupOptions,
): Promise<FunnelSetupResult> {
  const runner = options.runner ?? createDefaultRunner();
  const preflight = await preflightTailscale(runner);
  if (!preflight.ok) return preflight;

  const httpsPort = options.httpsPort ?? DEFAULT_HTTPS_PORT;
  if (![443, 8443, 10000].includes(httpsPort)) {
    return buildFailure(
      [
        `不支援的 httpsPort: ${httpsPort}。`,
        "Tailscale Funnel 只允許 443、8443 或 10000。",
      ],
      [getCommandString(buildFunnelCommand(options.localPort, DEFAULT_HTTPS_PORT))],
    );
  }

  await runner.run(["funnel", "reset"]);

  const createArgs = buildFunnelCommand(options.localPort, httpsPort);
  const create = await runner.run(createArgs);
  if (!create.ok) {
    const message = create.stderr.trim() || create.error?.message || "tailscale funnel create 失敗";
    return buildFailure(
      [`Tailscale Funnel 建立失敗：${message}`],
      ["tailscale funnel reset", getCommandString(createArgs)],
    );
  }

  const status = await runner.run(["funnel", "status"]);
  const combinedOutput = [create.stdout, create.stderr, status.stdout, status.stderr]
    .filter(Boolean)
    .join("\n");
  const url = extractWebhookUrl(combinedOutput);
  if (!url) {
    return buildFailure(
      ["無法從 Tailscale Funnel 輸出解析公開網址。"],
      ["tailscale funnel status", "tailscale funnel reset", getCommandString(createArgs)],
    );
  }

  return buildSuccess(normalizeWebhookUrl(url));
}
