import { describe, expect, it } from "vitest";

import { InMemoryPairingStore } from "../pairing-store.js";

describe("InMemoryPairingStore", () => {
  it("stores and retrieves pairing records by id", () => {
    const store = new InMemoryPairingStore();

    store.put({
      id: "pair_1",
      pin: "123456",
      issuedAt: 100,
      expiresAt: 200,
      attemptsLeft: 3,
      maxAttempts: 3,
    });

    expect(store.get("pair_1")).toEqual({
      id: "pair_1",
      pin: "123456",
      issuedAt: 100,
      expiresAt: 200,
      attemptsLeft: 3,
      maxAttempts: 3,
    });
  });

  it("removes expired records when pruning", () => {
    const store = new InMemoryPairingStore();

    store.put({
      id: "alive",
      pin: "111111",
      issuedAt: 100,
      expiresAt: 300,
      attemptsLeft: 3,
      maxAttempts: 3,
    });
    store.put({
      id: "expired",
      pin: "222222",
      issuedAt: 100,
      expiresAt: 150,
      attemptsLeft: 3,
      maxAttempts: 3,
    });

    expect(store.pruneExpired(200)).toBe(1);
    expect(store.get("alive")).toBeDefined();
    expect(store.get("expired")).toBeUndefined();
  });
});
