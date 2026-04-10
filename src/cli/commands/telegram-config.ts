import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomInt, randomUUID } from "crypto";
import { dirname } from "path";
import { createInterface } from "node:readline";

import { getConfigPaths, loadConfig } from "../../config/ConfigLoader.js";
import { outputResult, parseFlags } from "../utils.js";
import { TelegramClient } from "../../telegram/client.js";
import { setupTailscaleFunnelAuto } from "../../telegram/funnel.js";
import { putPendingPairing } from "../../telegram/pairing-file.js";

function readJsonFile(
  path: string,
  strict = false,
): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch (error) {
    if (strict) {
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON in telegram config file at ${path}: ${message}`);
    }
    return {};
  }
}

function writeJsonFile(path: string, data: Record<string, unknown>): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function generatePin(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, "0");
}

function getStringFlag(flags: Record<string, string | true>, key: string): string | undefined {
  const value = flags[key];
  if (typeof value === "string") return value;
  return undefined;
}

type FunnelMode = "auto" | "off";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function isInteractiveMode(jsonMode: boolean): boolean {
  return (
    !jsonMode &&
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true
  );
}

function isYesAnswer(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === "" || normalized === "y" || normalized === "yes";
}

function isHttpsUrl(url: string): boolean {
  return url.startsWith("https://");
}

function writeFunnelFailureWarning(
  errors: string[],
  remediationCommands: string[],
): void {
  const lines = [
    "Tailscale Funnel auto setup failed; continuing in pairing-only mode.",
    ...errors.map((error) => `- ${error}`),
  ];

  if (remediationCommands.length > 0) {
    lines.push("Remediation:");
    for (const command of remediationCommands) {
      lines.push(`- ${command}`);
    }
  }

  process.stderr.write(`${lines.join("\n")}\n`);
}

function buildTokenMissingError(tokenEnvKey: string): string {
  return (
    `找不到環境變數 ${tokenEnvKey}。` +
    "\n請改用以下其中一種方式：" +
    `\n1. 設定環境變數：export ${tokenEnvKey}=<token>` +
    "\n2. 以 CLI 參數帶 token：auq config telegram init --token <token>" +
    "\n3. 改成互動模式執行（TTY 終端且不要加 --json）"
  );
}

async function resolveFunnelMode(
  parsedFlags: Record<string, string | true>,
  jsonMode: boolean,
  explicitWebhookUrl: string | undefined,
): Promise<FunnelMode | null> {
  const funnelFlag = getStringFlag(parsedFlags, "funnel");
  if (funnelFlag !== undefined) {
    if (funnelFlag === "auto" || funnelFlag === "off") {
      return funnelFlag;
    }
    outputResult(
      {
        success: false,
        error: "--funnel 必須是 auto 或 off",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return null;
  }

  if (explicitWebhookUrl) return "off";

  if (!isInteractiveMode(jsonMode)) {
    return "off";
  }

  const answer = await prompt("是否啟用 funnel？(Y/n): ");
  return isYesAnswer(answer) ? "auto" : "off";
}

async function resolveToken(
  tokenEnvKey: string,
  parsedFlags: Record<string, string | true>,
  jsonMode: boolean,
): Promise<string | null> {
  const tokenFromFlag = getStringFlag(parsedFlags, "token");
  if (tokenFromFlag) {
    return tokenFromFlag;
  }

  const tokenFromEnv = process.env[tokenEnvKey];
  if (tokenFromEnv) {
    return tokenFromEnv;
  }

  if (isInteractiveMode(jsonMode)) {
    const token = (await prompt(
      `請輸入 ${tokenEnvKey}（僅記憶體使用，不會落盤）: `,
    )).trim();
    if (!token) {
      outputResult(
        {
          success: false,
          error: "token 不可為空",
        },
        jsonMode,
      );
      process.exitCode = 1;
      return null;
    }
    return token;
  }

  outputResult(
    {
      success: false,
      error: buildTokenMissingError(tokenEnvKey),
    },
    jsonMode,
  );
  process.exitCode = 1;
  return null;
}

async function resolveWebhookUrl(
  parsedFlags: Record<string, string | true>,
  jsonMode: boolean,
  funnelMode: FunnelMode,
  targetWebhookUrl: string,
): Promise<string | undefined> {
  const webhookFromFlag = getStringFlag(parsedFlags, "webhook-url");
  if (webhookFromFlag) {
    return webhookFromFlag;
  }

  if (targetWebhookUrl) {
    return targetWebhookUrl;
  }

  if (isInteractiveMode(jsonMode)) {
    const promptLabel =
      funnelMode === "auto"
        ? "請輸入 Funnel webhook URL（https://...）: "
        : "請輸入 webhook URL（https://...）: ";
    const webhookUrl = (await prompt(promptLabel)).trim();
    if (!webhookUrl) {
      outputResult(
        {
          success: false,
          error: "webhook-url 不可為空",
        },
        jsonMode,
      );
      process.exitCode = 1;
      return undefined;
    }
    return webhookUrl;
  }

  outputResult(
    {
      success: false,
      error: "webhook-url 必須提供且必須是 https:// URL（建議使用 Tailscale Funnel）",
    },
    jsonMode,
  );
  process.exitCode = 1;
  return undefined;
}

export async function runTelegramConfigCommand(args: string[]): Promise<void> {
  const subcommand = args[0];
  const parsed = parseFlags(args.slice(1));
  const jsonMode = parsed.flags.json === true;
  const isGlobal = parsed.flags.global === true;
  const forceRebind = parsed.flags.rebind === true || subcommand === "rebind";

  if (!["init", "rebind"].includes(String(subcommand))) {
    outputResult(
      {
        success: false,
        error:
          "Usage: auq config telegram <init|rebind> [--global] [--funnel auto|off] [--token TOKEN] [--token-env-key KEY] [--webhook-url URL] [--bind-port PORT] [--bind-host 0.0.0.0]",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  const current = loadConfig();
  const paths = getConfigPaths();
  const targetPath = isGlobal ? paths.global : paths.local;
  let target: Record<string, unknown>;
  try {
    target = readJsonFile(targetPath, true);
  } catch (error) {
    outputResult(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Invalid JSON in telegram config file at ${targetPath}`,
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }
  const targetTelegram =
    typeof target.telegram === "object" && target.telegram
      ? { ...(target.telegram as Record<string, unknown>) }
      : {};

  const existingChat =
    typeof targetTelegram.allowedChatId === "string"
      ? targetTelegram.allowedChatId
      : current.telegram.allowedChatId;

  if (existingChat && !forceRebind) {
    outputResult(
      {
        success: false,
        error: "Telegram chat 已綁定。預設拒絕覆蓋，請使用 `auq config telegram rebind`。",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  const tokenEnvKey =
    getStringFlag(parsed.flags, "token-env-key") ??
    (typeof targetTelegram.tokenEnvKey === "string"
      ? targetTelegram.tokenEnvKey
      : current.telegram.tokenEnvKey);

  const explicitWebhookUrl = getStringFlag(parsed.flags, "webhook-url");
  const targetWebhookUrl =
    explicitWebhookUrl ??
    (typeof targetTelegram.webhookUrl === "string"
      ? targetTelegram.webhookUrl
      : current.telegram.webhookUrl);

  const funnelMode = await resolveFunnelMode(
    parsed.flags,
    jsonMode,
    explicitWebhookUrl,
  );
  if (!funnelMode) {
    return;
  }

  const token = await resolveToken(tokenEnvKey, parsed.flags, jsonMode);
  if (!token) {
    return;
  }

  const bindHost =
    getStringFlag(parsed.flags, "bind-host") ??
    (typeof targetTelegram.bindHost === "string"
      ? targetTelegram.bindHost
      : current.telegram.bindHost);

  if (bindHost !== "0.0.0.0") {
    outputResult(
      {
        success: false,
        error: "bind-host 目前僅允許 0.0.0.0",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  const bindPortRaw =
    getStringFlag(parsed.flags, "bind-port") ??
    String(
      typeof targetTelegram.bindPort === "number"
        ? targetTelegram.bindPort
        : current.telegram.bindPort,
    );
  const bindPort = Number(bindPortRaw);
  if (!Number.isInteger(bindPort) || bindPort < 1 || bindPort > 65535) {
    outputResult(
      {
        success: false,
        error: "bind-port 必須是 1~65535 的整數",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  let webhookUrl = explicitWebhookUrl;
  if (!webhookUrl && funnelMode === "auto") {
    const autoFunnel = await setupTailscaleFunnelAuto({
      localPort: bindPort,
    });

    if (autoFunnel.ok && autoFunnel.webhookUrl) {
      webhookUrl = autoFunnel.webhookUrl;
    } else {
      writeFunnelFailureWarning(
        autoFunnel.errors,
        autoFunnel.remediationCommands,
      );
    }
  }

  if (!webhookUrl && funnelMode !== "auto") {
    webhookUrl = await resolveWebhookUrl(
      parsed.flags,
      jsonMode,
      funnelMode,
      targetWebhookUrl,
    );
    if (!webhookUrl) {
      return;
    }
  }

  if (webhookUrl && !isHttpsUrl(webhookUrl)) {
    outputResult(
      {
        success: false,
        error: "webhook-url 必須提供且必須是 https:// URL（建議使用 Tailscale Funnel）",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  const client = new TelegramClient({ token });
  const me = await client.getMe();

  const secretToken = process.env.AUQ_TELEGRAM_WEBHOOK_SECRET;
  if (webhookUrl) {
    await client.setWebhook(webhookUrl, {
      allowedUpdates: ["callback_query", "message"],
      secretToken,
    });
  }

  const pin = generatePin(6);
  const pairingId = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  putPendingPairing({
    id: pairingId,
    pin,
    expiresAt,
    attemptsLeft: 5,
    targetConfigFile: targetPath,
  });

  const resolvedWebhookUrl = webhookUrl ?? targetWebhookUrl;

  target.telegram = {
    ...targetTelegram,
    enabled: true,
    tokenEnvKey,
    webhookUrl: resolvedWebhookUrl ?? "",
    bindHost: "0.0.0.0",
    bindPort,
    allowedChatId: forceRebind ? "" : existingChat ?? "",
  };
  writeJsonFile(targetPath, target);

  const username = me.username ?? "";
  const botLink = username
    ? `https://t.me/${username}?start=pair_${pairingId}`
    : "(bot username not available)";

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          success: true,
          botLink,
          expiresAt,
          pairingId,
          pin,
          targetFile: targetPath,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("Telegram pairing initialized.");
  console.log(`Bot link: ${botLink}`);
  console.log(`PIN: ${pin}`);
  console.log(`Expires at: ${expiresAt}`);
  console.log("請開啟 bot 對話後輸入 PIN 完成綁定。\n");
}
