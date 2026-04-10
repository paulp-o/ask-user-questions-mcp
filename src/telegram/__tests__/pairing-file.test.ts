import { mkdtempSync, readFileSync } from "fs";
import { rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, describe, expect, it } from "vitest";

import { consumePairingByPin, putPendingPairing } from "../pairing-file.js";

describe("pairing-file", () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) {
      const dir = dirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
    delete process.env.XDG_CONFIG_HOME;
  });

  it("should decrement attempts on wrong pin", () => {
    const dir = mkdtempSync(join(tmpdir(), "auq-pairing-"));
    dirs.push(dir);
    process.env.XDG_CONFIG_HOME = dir;

    putPendingPairing({
      attemptsLeft: 2,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      id: "pair_1",
      pin: "123456",
      targetConfigFile: join(dir, "auq", ".auqrc.json"),
    });

    const result = consumePairingByPin("000000", "123");
    expect(result.ok).toBe(false);
    expect(result.message).toContain("剩餘 1 次");
  });

  it("should bind chat id on matched pin", () => {
    const dir = mkdtempSync(join(tmpdir(), "auq-pairing-"));
    dirs.push(dir);
    process.env.XDG_CONFIG_HOME = dir;

    const target = join(dir, "auq", ".auqrc.json");

    putPendingPairing({
      attemptsLeft: 5,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      id: "pair_2",
      pin: "654321",
      targetConfigFile: target,
    });

    const result = consumePairingByPin("654321", "-100123");
    expect(result.ok).toBe(true);

    const written = JSON.parse(readFileSync(target, "utf8")) as {
      telegram: { allowedChatId: string; enabled: boolean };
    };
    expect(written.telegram.allowedChatId).toBe("-100123");
    expect(written.telegram.enabled).toBe(true);
  });
});
