import { describe, expect, it } from "vitest";

import { InMemoryPairingStore } from "../pairing-store.js";
import { PairingService } from "../pairing.js";

describe("PairingService", () => {
  it("issues a one-time pin with ttl and max attempts", () => {
    const store = new InMemoryPairingStore();
    const service = new PairingService(store, {
      ttlMs: 60_000,
      maxAttempts: 3,
      now: () => 1_000,
      pinGenerator: () => "654321",
    });

    const challenge = service.issue();

    expect(challenge).toEqual({
      id: "pairing_1",
      pin: "654321",
      issuedAt: 1_000,
      expiresAt: 61_000,
      attemptsLeft: 3,
      maxAttempts: 3,
    });
    expect(store.get("pairing_1")).toEqual(challenge);
  });

  it("consumes a pairing pin after a successful verification", () => {
    const store = new InMemoryPairingStore();
    const service = new PairingService(store, {
      ttlMs: 60_000,
      maxAttempts: 3,
      now: () => 1_000,
      pinGenerator: () => "654321",
    });

    const challenge = service.issue();

    expect(service.verify(challenge.id, "654321")).toEqual({
      status: "matched",
      attemptsLeft: 3,
    });
    expect(store.get(challenge.id)).toBeUndefined();
  });

  it("expires a pairing pin after ttl", () => {
    const store = new InMemoryPairingStore();
    let now = 1_000;
    const service = new PairingService(store, {
      ttlMs: 10,
      maxAttempts: 3,
      now: () => now,
      pinGenerator: () => "654321",
    });

    const challenge = service.issue();
    now = challenge.expiresAt + 1;

    expect(service.verify(challenge.id, "654321")).toEqual({
      status: "expired",
      attemptsLeft: 3,
    });
    expect(store.get(challenge.id)).toBeUndefined();
  });

  it("locks a pairing pin after max attempts", () => {
    const store = new InMemoryPairingStore();
    const service = new PairingService(store, {
      ttlMs: 60_000,
      maxAttempts: 2,
      now: () => 1_000,
      pinGenerator: () => "654321",
    });

    const challenge = service.issue();

    expect(service.verify(challenge.id, "000000")).toEqual({
      status: "mismatch",
      attemptsLeft: 1,
    });
    expect(service.verify(challenge.id, "999999")).toEqual({
      status: "locked",
      attemptsLeft: 0,
    });
    expect(store.get(challenge.id)).toBeUndefined();
  });
});
