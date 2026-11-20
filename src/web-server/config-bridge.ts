import { existsSync, readFileSync, writeFileSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";

import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import type { AUQConfig } from "@auq/shared";
import { AUQConfigSchema } from "@auq/shared";

import {
  getConfigPaths as defaultGetConfigPaths,
  reloadConfig as defaultReloadConfig,
} from "../config/ConfigLoader.js";
import { createMessage, WS_TYPES } from "./ws-protocol.js";

type GetConfigPaths = typeof defaultGetConfigPaths;
type ReloadConfig = typeof defaultReloadConfig;

export class ConfigBridge {
  private readonly getConfigPaths: GetConfigPaths;
  private readonly reloadConfig: ReloadConfig;

  constructor(
    getConfigPathsFn: GetConfigPaths = defaultGetConfigPaths,
    reloadConfigFn: ReloadConfig = defaultReloadConfig,
  ) {
    this.getConfigPaths = getConfigPathsFn;
    this.reloadConfig = reloadConfigFn;
  }

  static create(
    getConfigPathsFn: GetConfigPaths,
    reloadConfigFn: ReloadConfig,
  ): ConfigBridge {
    return new ConfigBridge(getConfigPathsFn, reloadConfigFn);
  }
  async handleMessage(
    ws: WSContext<WebSocket>,
    type: string,
    payload: unknown,
    requestId?: string,
  ): Promise<void> {
    switch (type) {
      case WS_TYPES.CONFIG_GET: {
        const { scope } = (payload as { scope?: "local" | "global" }) ?? {};
        const config = this.reloadConfig();
        const paths = this.getConfigPaths();
        ws.send(
          JSON.stringify(
            createMessage(
              WS_TYPES.CONFIG_GET_RESULT,
              { config, scope, paths },
              requestId,
            ),
          ),
        );
        break;
      }
      case WS_TYPES.CONFIG_SET: {
        const { scope = "local", values } = payload as {
          scope?: "local" | "global";
          values: Partial<AUQConfig>;
        };
        try {
          const result = AUQConfigSchema.partial().safeParse(values);
          if (!result.success) {
            ws.send(
              JSON.stringify(
                createMessage(
                  WS_TYPES.CONFIG_SET_RESULT,
                  { ok: false, error: result.error.message },
                  requestId,
                ),
              ),
            );
            return;
          }
          const filePath = this.getFilePath(scope);
          const current = this.readRaw(filePath) ?? {};
          await this.ensureDir(filePath);
          writeFileSync(filePath, JSON.stringify({ ...current, ...result.data }, null, 2));
          this.reloadConfig();
          ws.send(
            JSON.stringify(
              createMessage(WS_TYPES.CONFIG_SET_RESULT, { ok: true }, requestId),
            ),
          );
        } catch (err) {
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.CONFIG_SET_RESULT,
                { ok: false, error: String(err) },
                requestId,
              ),
            ),
          );
        }
        break;
      }
      case WS_TYPES.CONFIG_RESET: {
        const { scope = "local", fields } = (payload as {
          scope?: "local" | "global";
          fields?: string[];
        }) ?? {};
        try {
          const filePath = this.getFilePath(scope);
          if (fields && fields.length > 0) {
            const current = this.readRaw(filePath) ?? {};
            for (const field of fields) {
              delete (current as Record<string, unknown>)[field];
            }
            await this.ensureDir(filePath);
            writeFileSync(filePath, JSON.stringify(current, null, 2));
          } else {
            await this.ensureDir(filePath);
            writeFileSync(filePath, JSON.stringify({}, null, 2));
          }
          this.reloadConfig();
          ws.send(
            JSON.stringify(
              createMessage(WS_TYPES.CONFIG_RESET_RESULT, { ok: true }, requestId),
            ),
          );
        } catch (err) {
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.CONFIG_RESET_RESULT,
                { ok: false, error: String(err) },
                requestId,
              ),
            ),
          );
        }
        break;
      }
      case WS_TYPES.CONFIG_EXPORT: {
        const { scope = "local" } =
          (payload as { scope?: "local" | "global" }) ?? {};
        const filePath = this.getFilePath(scope);
        const raw = this.readRaw(filePath) ?? {};
        ws.send(
          JSON.stringify(
            createMessage(
              WS_TYPES.CONFIG_EXPORT_RESULT,
              { raw, filePath },
              requestId,
            ),
          ),
        );
        break;
      }
      case WS_TYPES.CONFIG_IMPORT: {
        const { scope = "local", raw } = payload as {
          scope?: "local" | "global";
          raw: unknown;
        };
        try {
          const result = AUQConfigSchema.partial().safeParse(raw);
          if (!result.success) {
            ws.send(
              JSON.stringify(
                createMessage(
                  WS_TYPES.CONFIG_IMPORT_RESULT,
                  { ok: false, error: result.error.message },
                  requestId,
                ),
              ),
            );
            return;
          }
          const filePath = this.getFilePath(scope);
          await this.ensureDir(filePath);
          writeFileSync(filePath, JSON.stringify(result.data, null, 2));
          this.reloadConfig();
          ws.send(
            JSON.stringify(
              createMessage(WS_TYPES.CONFIG_IMPORT_RESULT, { ok: true }, requestId),
            ),
          );
        } catch (err) {
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.CONFIG_IMPORT_RESULT,
                { ok: false, error: String(err) },
                requestId,
              ),
            ),
          );
        }
        break;
      }
    }
  }

  private getFilePath(scope: "local" | "global"): string {
    const paths = this.getConfigPaths();
    return scope === "global" ? paths.global : paths.local;
  }

  private readRaw(filePath: string): Record<string, unknown> | null {
    try {
      if (!existsSync(filePath)) return null;
      return JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async ensureDir(filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
  }
}
